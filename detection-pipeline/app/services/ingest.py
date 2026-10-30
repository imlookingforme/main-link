"""
Ingest & Router Service
========================
Accepts raw WhatsApp/Telegram forwards (text, image, video, audio).
Detects language, performs OCR on images, ASR on audio, frame extraction on video.
Routes each modality to the appropriate verification pipeline.
"""
from __future__ import annotations

import io
import re
import tempfile
import subprocess
from pathlib import Path
from typing import Optional
from enum import Enum

import numpy as np
from loguru import logger
from PIL import Image

from app.config import get_settings


class ContentType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    UNKNOWN = "unknown"


class IngestResult:
    """Container for routed ingest output."""

    def __init__(
        self,
        content_type: ContentType,
        raw_text: str = "",
        detected_language: str = "en",
        extracted_frames: list[np.ndarray] | None = None,
        audio_array: np.ndarray | None = None,
        audio_sr: int = 16000,
        image_array: np.ndarray | None = None,
        ocr_text: str = "",
        metadata: dict | None = None,
    ):
        self.content_type = content_type
        self.raw_text = raw_text
        self.detected_language = detected_language
        self.extracted_frames = extracted_frames or []
        self.audio_array = audio_array
        self.audio_sr = audio_sr
        self.image_array = image_array
        self.ocr_text = ocr_text
        self.metadata = metadata or {}


class IngestRouter:
    """Ingest incoming content, detect type, extract features, and route."""

    def __init__(self):
        self._lang_model = None
        self._ocr_reader = None
        settings = get_settings()
        self._lang_model_name = settings.language_id_model

    # ── Language ID ──

    def detect_language(self, text: str) -> str:
        """Detect language using HuggingFace fasttext-language-identification."""
        if not text.strip():
            return "en"
        try:
            if self._lang_model is None:
                from transformers import pipeline
                self._lang_model = pipeline(
                    "text-classification",
                    model=self._lang_model_name,
                    top_k=1,
                )
            result = self._lang_model(text[:512])
            if result and len(result) > 0:
                label = result[0][0]["label"] if isinstance(result[0], list) else result[0]["label"]
                # Label format: __label__en → "en"
                lang = label.replace("__label__", "")
                logger.info(f"Detected language: {lang}")
                return lang
        except Exception as e:
            logger.warning(f"Language detection failed, defaulting to 'en': {e}")
        return "en"

    # ── Text Normalization ──

    @staticmethod
    def normalize_text(text: str) -> str:
        """Strip forwarding boilerplate, emojis, and excessive whitespace."""
        # Remove common forwarding patterns
        patterns = [
            r"Forwarded\s+message",
            r"\*Forwarded\*",
            r"------\s*Forwarded\s+message\s*------",
            r"^>+\s*",   # quote markers
            r"📩|📧|✉️",  # forward emojis
        ]
        cleaned = text
        for pat in patterns:
            cleaned = re.sub(pat, "", cleaned, flags=re.MULTILINE | re.IGNORECASE)

        # Remove emoji sequences (keep Devanagari, Tamil, Telugu, etc.)
        emoji_pattern = re.compile(
            "["
            "\U0001F600-\U0001F64F"  # emoticons
            "\U0001F300-\U0001F5FF"  # symbols & pictographs
            "\U0001F680-\U0001F6FF"  # transport & map
            "\U0001F1E0-\U0001F1FF"  # flags
            "\U00002702-\U000027B0"
            "\U000024C2-\U0001F251"
            "]+",
            flags=re.UNICODE,
        )
        cleaned = emoji_pattern.sub("", cleaned)

        # Collapse whitespace
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned

    # ── OCR ──

    def extract_text_from_image(self, image: Image.Image) -> str:
        """Run OCR on an image to extract text (for pamphlets, screenshots)."""
        try:
            # Try EasyOCR first (better for Indian languages)
            if self._ocr_reader is None:
                import easyocr
                self._ocr_reader = easyocr.Reader(
                    ["en", "hi"], gpu=False, verbose=False
                )
            img_array = np.array(image)
            results = self._ocr_reader.readtext(img_array)
            text = " ".join([r[1] for r in results])
            logger.info(f"OCR extracted {len(text)} chars from image")
            return text
        except Exception as e:
            logger.warning(f"EasyOCR failed, trying pytesseract: {e}")
            try:
                import pytesseract
                text = pytesseract.image_to_string(image, lang="eng+hin")
                return text
            except Exception as e2:
                logger.error(f"All OCR failed: {e2}")
                return ""

    # ── Frame Extraction (Video) ──

    @staticmethod
    def extract_frames(
        video_path: str | Path, fps: float = 1.0, max_frames: int = 30
    ) -> list[np.ndarray]:
        """Extract frames from video at given FPS using OpenCV."""
        import cv2

        frames = []
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            logger.error(f"Cannot open video: {video_path}")
            return frames

        video_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        frame_interval = max(1, int(video_fps / fps))
        frame_idx = 0

        while len(frames) < max_frames:
            ret, frame = cap.read()
            if not ret:
                break
            if frame_idx % frame_interval == 0:
                # Convert BGR → RGB
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frames.append(frame_rgb)
            frame_idx += 1

        cap.release()
        logger.info(f"Extracted {len(frames)} frames from {video_path}")
        return frames

    # ── Audio Extraction ──

    @staticmethod
    def extract_audio(
        file_path: str | Path, target_sr: int = 16000
    ) -> tuple[np.ndarray | None, int]:
        """Extract audio from file (audio or video) at target sample rate."""
        try:
            import librosa
            audio, sr = librosa.load(str(file_path), sr=target_sr, mono=True)
            logger.info(
                f"Extracted audio: {len(audio)/sr:.1f}s at {sr}Hz"
            )
            return audio, sr
        except Exception as e:
            logger.warning(f"librosa failed, trying ffmpeg: {e}")
            try:
                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                    tmp_path = tmp.name
                subprocess.run(
                    [
                        "ffmpeg", "-y", "-i", str(file_path),
                        "-ar", str(target_sr), "-ac", "1",
                        "-f", "wav", tmp_path,
                    ],
                    capture_output=True, check=True,
                )
                import soundfile as sf
                audio, sr = sf.read(tmp_path)
                Path(tmp_path).unlink(missing_ok=True)
                return audio.astype(np.float32), sr
            except Exception as e2:
                logger.error(f"Audio extraction failed: {e2}")
                return None, target_sr

    # ── Main Router ──

    def route(
        self,
        text: str = "",
        image: Image.Image | None = None,
        video_path: str | Path | None = None,
        audio_path: str | Path | None = None,
    ) -> IngestResult:
        """Route incoming content to appropriate pipeline."""
        results = []

        if text.strip():
            normalized = self.normalize_text(text)
            lang = self.detect_language(normalized)
            results.append(
                IngestResult(
                    content_type=ContentType.TEXT,
                    raw_text=normalized,
                    detected_language=lang,
                )
            )

        if image is not None:
            ocr_text = self.extract_text_from_image(image)
            img_array = np.array(image)
            lang = self.detect_language(ocr_text) if ocr_text else "en"
            results.append(
                IngestResult(
                    content_type=ContentType.IMAGE,
                    image_array=img_array,
                    ocr_text=ocr_text,
                    raw_text=ocr_text,
                    detected_language=lang,
                )
            )

        if video_path:
            frames = self.extract_frames(video_path)
            audio, sr = self.extract_audio(video_path)
            results.append(
                IngestResult(
                    content_type=ContentType.VIDEO,
                    extracted_frames=frames,
                    audio_array=audio,
                    audio_sr=sr,
                )
            )

        if audio_path:
            audio, sr = self.extract_audio(audio_path)
            results.append(
                IngestResult(
                    content_type=ContentType.AUDIO,
                    audio_array=audio,
                    audio_sr=sr,
                )
            )

        if not results:
            return IngestResult(content_type=ContentType.UNKNOWN)

        # If single modality, return it directly
        if len(results) == 1:
            return results[0]

        # Multi-modal: merge into a composite result
        composite = IngestResult(content_type=ContentType.TEXT)
        for r in results:
            if r.raw_text:
                composite.raw_text += " " + r.raw_text
            if r.extracted_frames:
                composite.extracted_frames = r.extracted_frames
            if r.audio_array is not None:
                composite.audio_array = r.audio_array
                composite.audio_sr = r.audio_sr
            if r.image_array is not None:
                composite.image_array = r.image_array
            if r.ocr_text:
                composite.ocr_text = r.ocr_text
        composite.raw_text = composite.raw_text.strip()
        composite.detected_language = self.detect_language(composite.raw_text)
        composite.metadata = {"modalities": [r.content_type.value for r in results]}
        return composite
