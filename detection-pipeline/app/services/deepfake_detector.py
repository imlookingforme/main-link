"""
Deepfake Detection Service (Phase 3)
======================================
Video: ViT-based frame-level deepfake detector (LoRA-tunable)
Audio: Wav2Vec2-based spoof detector
Image/Pamphlet: OCR + domain/seal check + AI-generated detection
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import numpy as np
from loguru import logger
from PIL import Image

from app.config import get_settings


# ─────────────────────────── Data Classes ───────────────────────────

@dataclass
class VideoAnalysisResult:
    """Result of video deepfake analysis."""
    is_deepfake: bool = False
    confidence: float = 0.0
    frame_scores: list[float] = field(default_factory=list)
    num_frames_analyzed: int = 0
    suspicious_frames: int = 0
    method: str = "vit-base"


@dataclass
class AudioAnalysisResult:
    """Result of audio spoof analysis."""
    is_spoofed: bool = False
    confidence: float = 0.0
    window_scores: list[float] = field(default_factory=list)
    duration_seconds: float = 0.0
    method: str = "wav2vec2"


@dataclass
class ImageAnalysisResult:
    """Result of image/pamphlet analysis."""
    is_fake: bool = False
    confidence: float = 0.0
    ocr_text: str = ""
    domain_check: dict = field(default_factory=dict)
    seal_check: dict = field(default_factory=dict)
    ai_generated_score: float = 0.0
    suspicious_elements: list[str] = field(default_factory=list)


# ─────────────────────────── Video Deepfake ───────────────────────────

class VideoDeepfakeDetector:
    """
    ViT-based video deepfake detector.
    Extracts frames → classifies each → aggregates.
    Designed for LoRA fine-tuning on compressed WhatsApp video.
    """

    def __init__(self):
        self.settings = get_settings()
        self._model = None
        self._processor = None
        self._device = "cpu"

    def _load_model(self):
        """Load ViT model for image classification (deepfake detection)."""
        if self._model is not None:
            return

        model_name = self.settings.deepfake_video_model
        logger.info(f"Loading video deepfake model: {model_name}")

        try:
            from transformers import ViTForImageClassification, ViTImageProcessor
            import torch

            self._processor = ViTImageProcessor.from_pretrained(model_name)
            self._model = ViTForImageClassification.from_pretrained(model_name)
            self._model.eval()

            # Check for LoRA adapter
            adapter_path = Path("models_cache/vit_deepfake_lora")
            if adapter_path.exists():
                try:
                    from peft import PeftModel
                    self._model = PeftModel.from_pretrained(self._model, str(adapter_path))
                    logger.info("LoRA adapter loaded for ViT")
                except Exception as e:
                    logger.warning(f"LoRA adapter load failed: {e}")

            logger.info("Video deepfake model loaded")
        except Exception as e:
            logger.error(f"Video model load failed: {e}")

    def analyze_frame(self, frame: np.ndarray) -> float:
        """
        Analyze a single frame for deepfake indicators.
        Returns a score in [0, 1] where higher = more likely fake.
        """
        self._load_model()

        if self._model is None or self._processor is None:
            return 0.5  # Uncertain if model unavailable

        try:
            import torch

            # Convert numpy array to PIL Image
            if isinstance(frame, np.ndarray):
                image = Image.fromarray(frame)
            else:
                image = frame

            inputs = self._processor(images=image, return_tensors="pt")

            with torch.no_grad():
                outputs = self._model(**inputs)
                # Use logits — ViT-base has 1000 ImageNet classes
                # For a fine-tuned binary model, index 0=real, 1=fake
                # For pretrained ViT, we use anomaly score from logit distribution
                logits = outputs.logits[0]
                probs = torch.softmax(logits, dim=-1)

                # If binary fine-tuned model
                if logits.shape[0] == 2:
                    return float(probs[1])  # P(fake)

                # For pretrained model: use entropy as anomaly proxy
                # Deepfake frames tend to have higher entropy in classification
                entropy = -torch.sum(probs * torch.log(probs + 1e-10))
                max_entropy = torch.log(torch.tensor(float(logits.shape[0])))
                normalized_entropy = float(entropy / max_entropy)

                return normalized_entropy

        except Exception as e:
            logger.warning(f"Frame analysis failed: {e}")
            return 0.5

    def analyze_video(
        self,
        frames: list[np.ndarray],
        top_m: int = 5,
    ) -> VideoAnalysisResult:
        """
        Analyze video frames for deepfake content.
        Aggregates by taking the top-m most suspicious frames.
        """
        result = VideoAnalysisResult()

        if not frames:
            return result

        result.num_frames_analyzed = len(frames)

        # Score each frame
        for frame in frames:
            score = self.analyze_frame(frame)
            result.frame_scores.append(score)

        # Aggregate: top-m most suspicious frames
        sorted_scores = sorted(result.frame_scores, reverse=True)
        top_scores = sorted_scores[:top_m]

        if top_scores:
            avg_top = float(np.mean(top_scores))
            result.confidence = avg_top
            result.is_deepfake = avg_top > 0.65  # Threshold
            result.suspicious_frames = sum(1 for s in result.frame_scores if s > 0.6)

        return result


# ─────────────────────────── Audio Spoof ───────────────────────────

class AudioSpoofDetector:
    """
    Wav2Vec2-based audio spoof detector.
    Processes 4-6s windows at 16kHz.
    """

    def __init__(self):
        self.settings = get_settings()
        self._model = None
        self._processor = None
        self.target_sr = 16000
        self.window_seconds = 4.0

    def _load_model(self):
        """Load Wav2Vec2 model for audio classification."""
        if self._model is not None:
            return

        model_name = self.settings.deepfake_audio_model
        logger.info(f"Loading audio spoof model: {model_name}")

        try:
            from transformers import Wav2Vec2ForSequenceClassification, Wav2Vec2FeatureExtractor
            import torch

            self._processor = Wav2Vec2FeatureExtractor.from_pretrained(model_name)
            # Try loading fine-tuned binary classifier first
            try:
                self._model = Wav2Vec2ForSequenceClassification.from_pretrained(
                    model_name, num_labels=2
                )
            except Exception:
                # Fall back to base model — will use feature extraction
                from transformers import Wav2Vec2Model
                self._model = Wav2Vec2Model.from_pretrained(model_name)

            self._model.eval()

            # Check for LoRA adapter
            adapter_path = Path("models_cache/wav2vec2_spoof_lora")
            if adapter_path.exists():
                try:
                    from peft import PeftModel
                    self._model = PeftModel.from_pretrained(self._model, str(adapter_path))
                    logger.info("LoRA adapter loaded for Wav2Vec2")
                except Exception as e:
                    logger.warning(f"Audio LoRA adapter load failed: {e}")

            logger.info("Audio spoof model loaded")
        except Exception as e:
            logger.error(f"Audio model load failed: {e}")

    def analyze_window(self, audio_window: np.ndarray, sr: int = 16000) -> float:
        """
        Analyze a single audio window for spoof indicators.
        Returns score in [0, 1] where higher = more likely spoofed.
        """
        self._load_model()

        if self._model is None or self._processor is None:
            return 0.5

        try:
            import torch

            inputs = self._processor(
                audio_window,
                sampling_rate=sr,
                return_tensors="pt",
                padding=True,
            )

            with torch.no_grad():
                outputs = self._model(**inputs)

                # If classification model with logits
                if hasattr(outputs, "logits"):
                    probs = torch.softmax(outputs.logits, dim=-1)
                    if probs.shape[-1] == 2:
                        return float(probs[0][1])  # P(spoofed)
                    return float(probs.max())

                # If base model — use hidden state statistics
                hidden = outputs.last_hidden_state
                # Spoofed audio tends to have lower variance in hidden states
                variance = float(hidden.var())
                # Normalize to [0, 1] — this is a heuristic for pretrained model
                score = 1.0 / (1.0 + variance)
                return score

        except Exception as e:
            logger.warning(f"Audio window analysis failed: {e}")
            return 0.5

    def analyze_audio(
        self,
        audio: np.ndarray,
        sr: int = 16000,
    ) -> AudioAnalysisResult:
        """
        Analyze full audio track for spoof content.
        Splits into overlapping windows and aggregates.
        """
        result = AudioAnalysisResult()

        if audio is None or len(audio) == 0:
            return result

        result.duration_seconds = len(audio) / sr

        # Split into windows
        window_samples = int(self.window_seconds * sr)
        hop_samples = window_samples // 2  # 50% overlap

        windows = []
        start = 0
        while start + window_samples <= len(audio):
            windows.append(audio[start:start + window_samples])
            start += hop_samples

        # If audio is shorter than one window, use full clip
        if not windows and len(audio) > sr:  # At least 1 second
            windows = [audio]

        if not windows:
            return result

        # Score each window
        for window in windows:
            score = self.analyze_window(window, sr)
            result.window_scores.append(score)

        if result.window_scores:
            # Aggregate: average of all windows
            avg_score = float(np.mean(result.window_scores))
            result.confidence = avg_score
            result.is_spoofed = avg_score > 0.6

        return result


# ─────────────────────────── Image/Pamphlet Analyzer ───────────────────────────

class ImagePamphletAnalyzer:
    """
    Image/pamphlet analysis:
    - OCR text extraction
    - Domain/URL verification (.gov.in, .nic.in)
    - Seal/letterhead authenticity check
    - AI-generated image detection
    """

    # Official Indian government domains
    OFFICIAL_DOMAINS = [
        ".gov.in", ".nic.in", ".india.gov.in",
        "pmkisan.gov.in", "pmjay.gov.in", "pmuy.gov.in",
        "myscheme.gov.in", "uidai.gov.in", "pib.gov.in",
        "digitalindia.gov.in", "incometax.gov.in",
    ]

    # Known scam domain patterns
    SCAM_DOMAIN_PATTERNS = [
        r"\.blogspot\.", r"\.wordpress\.", r"bit\.ly",
        r"tinyurl\.", r"\.xyz$", r"\.tk$", r"\.ml$",
        r"free.*\.com", r"\.top$", r"\.click$",
    ]

    # Official seal keywords
    SEAL_KEYWORDS = [
        "satyamev jayate", "सत्यमेव जयते",
        "government of india", "भारत सरकार",
        "ministry of", "मंत्रालय",
        "republic of india",
    ]

    def __init__(self):
        self._ocr_reader = None

    def extract_text(self, image: Image.Image | np.ndarray) -> str:
        """Extract text from image using OCR."""
        try:
            if self._ocr_reader is None:
                import easyocr
                self._ocr_reader = easyocr.Reader(
                    ["en", "hi"], gpu=False, verbose=False
                )
            if isinstance(image, Image.Image):
                image = np.array(image)
            results = self._ocr_reader.readtext(image)
            return " ".join([r[1] for r in results])
        except Exception as e:
            logger.warning(f"OCR failed: {e}")
            try:
                import pytesseract
                if isinstance(image, np.ndarray):
                    image = Image.fromarray(image)
                return pytesseract.image_to_string(image, lang="eng+hin")
            except Exception as e2:
                logger.error(f"All OCR methods failed: {e2}")
                return ""

    def check_domains(self, text: str) -> dict:
        """Check URLs in text against official/scam domain lists."""
        url_pattern = r'https?://[^\s<>\"\']+|www\.[^\s<>\"\']+|[a-zA-Z0-9-]+\.(?:gov\.in|nic\.in|com|org|net|xyz|tk|ml)[^\s]*'
        urls = re.findall(url_pattern, text, re.IGNORECASE)

        result = {
            "urls_found": urls,
            "official_urls": [],
            "suspicious_urls": [],
            "is_official": False,
        }

        for url in urls:
            url_lower = url.lower()
            if any(domain in url_lower for domain in self.OFFICIAL_DOMAINS):
                result["official_urls"].append(url)
                result["is_official"] = True
            else:
                for pattern in self.SCAM_DOMAIN_PATTERNS:
                    if re.search(pattern, url_lower):
                        result["suspicious_urls"].append(url)
                        break

        return result

    def check_seal(self, text: str) -> dict:
        """Check for official seal/letterhead indicators in OCR text."""
        text_lower = text.lower()

        result = {
            "has_official_markers": False,
            "markers_found": [],
            "confidence": 0.0,
        }

        markers_found = []
        for keyword in self.SEAL_KEYWORDS:
            if keyword.lower() in text_lower:
                markers_found.append(keyword)

        if markers_found:
            result["has_official_markers"] = True
            result["markers_found"] = markers_found
            # Having markers doesn't mean it's real — scammers copy them
            # But absence is a signal
            result["confidence"] = min(len(markers_found) / 3.0, 1.0)

        return result

    def detect_ai_generated(self, image: Image.Image | np.ndarray) -> float:
        """
        Detect AI-generated images using statistical analysis.
        Returns score in [0, 1] where higher = more likely AI-generated.
        """
        try:
            if isinstance(image, Image.Image):
                img_array = np.array(image)
            else:
                img_array = image

            # Statistical heuristics for AI-generated image detection:

            # 1. Check for unusual smoothness (AI images are often too smooth)
            if len(img_array.shape) == 3:
                gray = np.mean(img_array, axis=2)
            else:
                gray = img_array.astype(float)

            # Laplacian variance — real images have more texture
            from scipy import ndimage
            laplacian = ndimage.laplace(gray)
            lap_var = float(np.var(laplacian))

            # 2. Check for color distribution anomalies
            if len(img_array.shape) == 3:
                color_std = float(np.std(img_array, axis=(0, 1)).mean())
            else:
                color_std = float(np.std(img_array))

            # 3. Check for repeating patterns (common in AI art)
            # Simple FFT-based check
            fft = np.fft.fft2(gray)
            fft_magnitude = np.abs(fft)
            spectral_flatness = float(
                np.exp(np.mean(np.log(fft_magnitude + 1e-10)))
                / np.mean(fft_magnitude)
            )

            # Combine heuristics (these are rough — proper detector would be
            # a fine-tuned model, but this works as a baseline)
            # Low laplacian variance + low spectral flatness = likely AI
            score = 0.0
            if lap_var < 100:
                score += 0.3
            if spectral_flatness < 0.1:
                score += 0.3
            if color_std < 30:
                score += 0.2

            return min(score, 1.0)

        except Exception as e:
            logger.warning(f"AI detection failed: {e}")
            return 0.0

    def analyze(
        self,
        image: Image.Image | np.ndarray,
        ocr_text: str = "",
    ) -> ImageAnalysisResult:
        """
        Full image/pamphlet analysis pipeline.
        """
        result = ImageAnalysisResult()

        # 1. OCR
        if not ocr_text:
            ocr_text = self.extract_text(image)
        result.ocr_text = ocr_text

        # 2. Domain check
        result.domain_check = self.check_domains(ocr_text)
        if result.domain_check["suspicious_urls"]:
            result.suspicious_elements.append(
                f"Suspicious URLs: {', '.join(result.domain_check['suspicious_urls'])}"
            )

        # 3. Seal check
        result.seal_check = self.check_seal(ocr_text)

        # 4. AI-generated detection
        result.ai_generated_score = self.detect_ai_generated(image)
        if result.ai_generated_score > 0.5:
            result.suspicious_elements.append(
                f"Image may be AI-generated (score: {result.ai_generated_score:.2f})"
            )

        # 5. Check for common pamphlet scam patterns
        scam_patterns = [
            r"free\s+(?:laptop|mobile|smartphone|tablet)",
            r"(?:Rs\.?|₹)\s*\d+(?:,\d+)*\s*(?:per\s+month|monthly|every\s+month)",
            r"click\s+(?:here|link|below)\s+to\s+(?:register|apply|claim)",
            r"send\s+(?:OTP|Aadhaar|bank\s+details)",
            r"limited\s+(?:time|period|offer)",
        ]
        for pattern in scam_patterns:
            if re.search(pattern, ocr_text, re.IGNORECASE):
                result.suspicious_elements.append(
                    f"Scam pattern detected in text: matches '{pattern}'"
                )

        # 6. Final verdict
        suspicion_score = 0.0
        if result.domain_check["suspicious_urls"]:
            suspicion_score += 0.3
        if not result.seal_check["has_official_markers"] and result.domain_check["urls_found"]:
            suspicion_score += 0.2
        if result.ai_generated_score > 0.5:
            suspicion_score += 0.3
        suspicion_score += 0.1 * len(result.suspicious_elements)

        result.confidence = min(suspicion_score, 1.0)
        result.is_fake = result.confidence > 0.5

        return result
