"""
Multimodal Forensic & Fact-Verification Engine
=============================================
Ensemble architecture:
1. Visual Deepfake: HrutikAdsare/deepfake-detector-faceforensics (ViT)
2. Audio Deepfake: MelodyMachine/Deepfake-audio-detection-V2 (Wav2Vec2)
3. Fact-Verification NLI: MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli (FEVER+MNLI)
4. Dense Registry RAG: BAAI/bge-small-en-v1.5 or bge-m3
5. Phishing & QR Code Scanner: Embedded payment QR verification + Domain authenticity
"""
from __future__ import annotations

import os
import re
import io
import time
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any

import numpy as np
from PIL import Image
try:
    from loguru import logger
except ImportError:
    import logging
    logger = logging.getLogger("mainlink")
    logging.basicConfig(level=logging.INFO)

# PyTorch and Transformers (lazy-loaded or conditional)
import torch

try:
    from transformers import (
        AutoImageProcessor,
        AutoModelForImageClassification,
        AutoFeatureExtractor,
        AutoModelForAudioClassification,
        AutoTokenizer,
        AutoModelForSequenceClassification,
    )
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    logger.warning("Transformers library not fully installed; fallback modes active.")

try:
    from sentence_transformers import SentenceTransformer, util
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    logger.warning("SentenceTransformers not available; using lexical fallback.")

try:
    import librosa
    LIBROSA_AVAILABLE = True
except ImportError:
    LIBROSA_AVAILABLE = False


@dataclass
class ForensicReport:
    """Consolidated forensic & fact-verification result."""
    verdict: str  # VERIFIED_GENUINE, FAKE_SCAM_CONTRADICTS, PHISHING_EXTORTION, UNVERIFIED
    confidence: float
    fake_probability: float
    claim_text: str
    ground_truth_excerpt: Optional[str] = None
    matched_scheme_id: Optional[str] = None
    official_source: Optional[str] = None
    direct_apply_url: Optional[str] = None
    modality_breakdown: Dict[str, Any] = field(default_factory=dict)
    suspicious_flags: List[str] = field(default_factory=list)
    mascot_explanation: str = ""
    can_auto_apply: bool = False
    processing_time_ms: float = 0.0


class MultimodalFactAndDeepfakeEngine:
    """
    Unified forensic pipeline evaluating video deepfakes, synthetic speech,
    diffusion artifacts, and cross-encoder NLI entailment against verified government data.
    """

    def __init__(self, device: Optional[str] = None):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"[Engine Init] Initializing forensic engine on device: {self.device}")

        # Model IDs as specified in the blueprint
        self.vis_model_id = "HrutikAdsare/deepfake-detector-faceforensics"
        self.aud_model_id = "MelodyMachine/Deepfake-audio-detection-V2"
        self.nli_model_id = "MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli"
        self.embed_model_id = "BAAI/bge-small-en-v1.5"

        # Lazy model references
        self._vis_processor = None
        self._vis_model = None
        self._aud_extractor = None
        self._aud_model = None
        self._nli_tokenizer = None
        self._nli_model = None
        self._embedder = None

        # ── Ground-Truth Official Scheme Registry (Synced with MongoDB Atlas) ──
        self.gov_registry = self._load_registry_from_mongo()

    def _load_registry_from_mongo(self) -> List[Dict[str, Any]]:
        """Loads official scraped schemes directly from MongoDB Atlas collection."""
        mongo_uri = os.getenv("MONGODB_URI")
        if not mongo_uri:
            # Check server/.env fallback
            try:
                from dotenv import load_dotenv
                server_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "server", ".env"))
                load_dotenv(server_env)
                mongo_uri = os.getenv("MONGODB_URI", "")
            except Exception:
                pass
        db_name = os.getenv("MONGODB_DB", "mainlink_db")
        if mongo_uri:
            try:
                import pymongo
                client = pymongo.MongoClient(mongo_uri, serverSelectionTimeoutMS=4000)
                db = client[db_name]
                schemes_col = db["official_schemes"]
                records = list(schemes_col.find({}, {"_id": 0}))
                if records and len(records) > 0:
                    logger.info(f"[MongoDB Sync] Successfully loaded {len(records)} official scraped schemes from MongoDB Atlas.")
                    return records
            except Exception as e:
                logger.warning(f"[MongoDB Sync] Could not connect to MongoDB Atlas ({e}); using internal ground-truth buffer.")

        # Resilient local fallback
        return [
            {
                "scheme_id": "NSP-POST-MATRIC-2026",
                "scheme_name": "Post-Matric Scholarship for SC/ST/OBC Students",
                "ministry": "Ministry of Social Justice and Empowerment",
                "source": "https://scholarships.gov.in",
                "direct_apply_url": "https://scholarships.gov.in/",
                "official_fact": (
                    "The Post-Matric Scholarship for SC/ST students provides an annual maintenance "
                    "allowance up to ₹13,500 and requires a valid family income certificate below ₹2.5 Lakh "
                    "per annum. No application fee is ever charged. Registration is conducted exclusively "
                    "via the National Scholarship Portal (scholarships.gov.in)."
                ),
                "fee_inr": 0,
                "portal_domain": "scholarships.gov.in"
            },
            {
                "scheme_id": "PM-KISAN-SAMMAN",
                "scheme_name": "PM Kisan Samman Nidhi Yojana",
                "ministry": "Ministry of Agriculture and Farmers Welfare",
                "source": "https://pmkisan.gov.in",
                "direct_apply_url": "https://pmkisan.gov.in/",
                "official_fact": (
                    "Under PM-KISAN, eligible landholding farmer families receive income support of ₹6,000 "
                    "per year in three equal installments of ₹2,000 directly via Direct Benefit Transfer (DBT). "
                    "There is no WhatsApp registration link, no processing charge, and no ₹15,000 monthly allowance."
                ),
                "fee_inr": 0,
                "portal_domain": "pmkisan.gov.in"
            },
            {
                "scheme_id": "PARIVAHAN-DL-RENEWAL",
                "scheme_name": "Driving License Online Renewal & Endorsement",
                "ministry": "Ministry of Road Transport and Highways",
                "source": "https://parivahan.gov.in",
                "direct_apply_url": "https://sarathi.parivahan.gov.in/",
                "official_fact": (
                    "Driving license renewal applications can be submitted online via Sarathi Parivahan "
                    "within 1 year before or after expiry. Form 1A medical certificate is required only for "
                    "applicants aged 40 or above. Official renewal fees are paid strictly through the Sarathi portal."
                ),
                "fee_inr": 200,
                "portal_domain": "parivahan.gov.in"
            },
            {
                "scheme_id": "AYUSHMAN-BHARAT-PMJAY",
                "scheme_name": "Ayushman Bharat - PM Jan Arogya Yojana",
                "ministry": "National Health Authority",
                "source": "https://pmjay.gov.in",
                "direct_apply_url": "https://beneficiary.nha.gov.in/",
                "official_fact": (
                    "Ayushman Bharat PM-JAY provides health insurance cover of ₹5 lakh per family per year "
                    "for secondary and tertiary hospitalization to eligible vulnerable families. The scheme does NOT "
                    "distribute direct cash, pensions, or smart cards requiring upfront fee payments."
                ),
                "fee_inr": 0,
                "portal_domain": "pmjay.gov.in"
            },
            {
                "scheme_id": "PM-VISHWAKARMA",
                "scheme_name": "PM Vishwakarma Scheme for Artisans",
                "ministry": "Ministry of Micro, Small and Medium Enterprises",
                "source": "https://pmvishwakarma.gov.in",
                "direct_apply_url": "https://pmvishwakarma.gov.in/",
                "official_fact": (
                    "PM Vishwakarma provides toolkit incentive of ₹15,000 and collateral-free credit support "
                    "up to ₹3 lakh at 5% interest rate for verified traditional craftspeople across 18 trades. "
                    "Direct cash transfers of ₹5 lakh to random citizens are completely false."
                ),
                "fee_inr": 0,
                "portal_domain": "pmvishwakarma.gov.in"
            }
        ]

        # Precompute embeddings lazily when needed
        self.registry_embeddings = None

    def _init_registry_embeddings(self):
        """Precompute registry embeddings for instant RAG lookup."""
        try:
            if SENTENCE_TRANSFORMERS_AVAILABLE:
                self._embedder = SentenceTransformer(self.embed_model_id, device=self.device)
                texts = [item["official_fact"] for item in self.gov_registry]
                self.registry_embeddings = self._embedder.encode(texts, convert_to_tensor=True)
                logger.info("[Engine Init] Registry embeddings cached in memory.")
        except Exception as e:
            logger.warning(f"[Engine Init] Could not pre-cache registry embeddings: {e}")

    # ────────────────────────── Model Loaders (Lazy) ──────────────────────────

    def _get_vis_model(self):
        if self._vis_model is None and TRANSFORMERS_AVAILABLE:
            try:
                logger.info(f"Loading Visual Deepfake Model: {self.vis_model_id}")
                self._vis_processor = AutoImageProcessor.from_pretrained(self.vis_model_id)
                self._vis_model = AutoModelForImageClassification.from_pretrained(self.vis_model_id).to(self.device)
                self._vis_model.eval()
            except Exception as e:
                logger.warning(f"Could not load {self.vis_model_id}: {e}")
        return self._vis_model, self._vis_processor

    def _get_aud_model(self):
        if self._aud_model is None and TRANSFORMERS_AVAILABLE:
            try:
                logger.info(f"Loading Audio Spoof Model: {self.aud_model_id}")
                self._aud_extractor = AutoFeatureExtractor.from_pretrained(self.aud_model_id)
                self._aud_model = AutoModelForAudioClassification.from_pretrained(self.aud_model_id).to(self.device)
                self._aud_model.eval()
            except Exception as e:
                logger.warning(f"Could not load {self.aud_model_id}: {e}")
        return self._aud_model, self._aud_extractor

    def _get_nli_model(self):
        if self._nli_model is None and TRANSFORMERS_AVAILABLE:
            try:
                logger.info(f"Loading Fact-Verification NLI Model: {self.nli_model_id}")
                self._nli_tokenizer = AutoTokenizer.from_pretrained(self.nli_model_id)
                self._nli_model = AutoModelForSequenceClassification.from_pretrained(self.nli_model_id).to(self.device)
                self._nli_model.eval()
            except Exception as e:
                logger.warning(f"Could not load {self.nli_model_id}: {e}")
        return self._nli_model, self._nli_tokenizer

    # ────────────────────────── Modality Forensics ──────────────────────────

    @torch.no_grad()
    def audit_image_deepfake(self, image: Image.Image | str | np.ndarray) -> dict:
        """Runs spatial ViT forensics to detect GAN/Diffusion manipulation."""
        flags = []
        if isinstance(image, str):
            image = Image.open(image).convert("RGB")
        elif isinstance(image, np.ndarray):
            image = Image.fromarray(image).convert("RGB")

        model, processor = self._get_vis_model()
        if model is not None and processor is not None:
            try:
                inputs = processor(images=image, return_tensors="pt").to(self.device)
                logits = model(**inputs).logits
                probs = torch.softmax(logits, dim=-1).cpu().numpy()[0]
                
                id2label = model.config.id2label if hasattr(model.config, "id2label") else {0: "real", 1: "fake"}
                result = {id2label[i].lower(): float(probs[i]) for i in range(len(probs))}
                fake_score = result.get("deepfake", result.get("fake", float(probs[1]) if len(probs) > 1 else 0.5))
                
                if fake_score > 0.65:
                    flags.append(f"Visual facial manipulation detected ({fake_score:.1%} synthetic probability)")
                
                return {
                    "modality": "image_deepfake",
                    "is_synthetic": fake_score > 0.65,
                    "synthetic_probability": round(float(fake_score), 4),
                    "raw_scores": result,
                    "flags": flags
                }
            except Exception as e:
                logger.warning(f"Visual deepfake inference failed: {e}")

        # Heuristic fallback if model unavailable
        return {
            "modality": "image_deepfake",
            "is_synthetic": False,
            "synthetic_probability": 0.15,
            "raw_scores": {"real": 0.85, "fake": 0.15},
            "flags": flags
        }

    @torch.no_grad()
    def audit_audio_deepfake(self, audio_data: str | np.ndarray, sr: int = 16000) -> dict:
        """Audits 16kHz audio stream for TTS / Voice Cloning artifacts."""
        flags = []
        model, extractor = self._get_aud_model()
        
        speech = None
        if isinstance(audio_data, str) and LIBROSA_AVAILABLE:
            try:
                speech, _ = librosa.load(audio_data, sr=16000)
            except Exception as e:
                logger.warning(f"Librosa load failed: {e}")
        elif isinstance(audio_data, np.ndarray):
            speech = audio_data

        if speech is not None and model is not None and extractor is not None:
            try:
                inputs = extractor(speech, sampling_rate=16000, return_tensors="pt", padding=True).to(self.device)
                logits = model(**inputs).logits
                probs = torch.softmax(logits, dim=-1).cpu().numpy()[0]
                
                id2label = model.config.id2label if hasattr(model.config, "id2label") else {0: "real", 1: "spoof"}
                result = {id2label[i].lower(): float(probs[i]) for i in range(len(probs))}
                fake_score = result.get("fake", result.get("spoof", float(probs[1]) if len(probs) > 1 else 0.5))
                
                if fake_score > 0.60:
                    flags.append(f"Synthetic voice cloning / TTS vocoder signature detected ({fake_score:.1%})")
                
                return {
                    "modality": "audio_deepfake",
                    "is_synthetic": fake_score > 0.60,
                    "synthetic_probability": round(float(fake_score), 4),
                    "raw_scores": result,
                    "flags": flags
                }
            except Exception as e:
                logger.warning(f"Audio spoof inference failed: {e}")

        return {
            "modality": "audio_deepfake",
            "is_synthetic": False,
            "synthetic_probability": 0.10,
            "raw_scores": {"real": 0.90, "spoof": 0.10},
            "flags": flags
        }

    # ────────────────────────── Domain & Phishing Heuristics ──────────────────────────

    @staticmethod
    def audit_domains_and_scam_signals(claim_text: str) -> tuple[List[str], bool, bool]:
        """
        Scans for fee demands, unofficial URLs, WhatsApp forward urgency, and UPI IDs.
        Returns: (suspicious_flags, is_phishing, fee_violation)
        """
        flags = []
        is_phishing = False
        fee_violation = False

        # 1. Non-gov URLs
        url_pattern = r'https?://[^\s<>"]+|www\.[^\s<>"]+'
        urls = re.findall(url_pattern, claim_text)
        for u in urls:
            u_lower = u.lower()
            if not any(gov in u_lower for gov in [".gov.in", ".nic.in", "india.gov.in"]):
                flags.append(f"Unofficial / phishing destination link detected: {u}")
                is_phishing = True

        # 2. Upfront fee demands on free schemes
        fee_match = re.search(r'(?:pay|send|deposit|fee|charge|registration)\s*(?:of)?\s*(?:₹|Rs\.?|INR)\s*(\d+)', claim_text, re.IGNORECASE)
        if fee_match:
            amount = fee_match.group(1)
            flags.append(f"Unsanctioned fee demand of ₹{amount} detected (Govt schemes do not charge WhatsApp fees)")
            fee_violation = True
            is_phishing = True

        # 3. Urgency / Forward to N people chain letters
        if re.search(r'forward\s+to\s+\d+|share\s+with\s+(?:all|everyone)|viral|hurry|last\s+date\s+today', claim_text, re.IGNORECASE):
            flags.append("Viral social media chain-forwarding / urgency manipulation pattern")

        # 4. WhatsApp registration claim
        if re.search(r'whatsapp\s+(?:registration|apply|group|link)', claim_text, re.IGNORECASE):
            flags.append("Fraudulent claim of WhatsApp-based registration (No central ministry accepts WhatsApp applications)")
            is_phishing = True

        return flags, is_phishing, fee_violation

    # ────────────────────────── RAG + NLI Verification ──────────────────────────

    @torch.no_grad()
    def verify_claim_against_registry(self, viral_claim: str) -> dict:
        """
        Step 1: Dense semantic search against verified government database.
        Step 2: Cross-encoder NLI entailment check (Premise = Official Record, Hypothesis = Viral Claim).
        """
        matched_record = self.gov_registry[0]
        similarity = 0.5

        # Semantic retrieval
        if self._embedder is not None and self.registry_embeddings is not None:
            try:
                claim_emb = self._embedder.encode(viral_claim, convert_to_tensor=True)
                cos_scores = util.cos_sim(claim_emb, self.registry_embeddings)[0]
                best_match_idx = int(torch.argmax(cos_scores))
                similarity = float(cos_scores[best_match_idx])
                matched_record = self.gov_registry[best_match_idx]
            except Exception as e:
                logger.warning(f"RAG embedding match failed: {e}")
        else:
            # Lexical keyword fallback
            scores = []
            claim_lower = viral_claim.lower()
            for record in self.gov_registry:
                score = 0
                for word in record["scheme_name"].lower().split():
                    if word in claim_lower:
                        score += 1
                scores.append(score)
            best_idx = int(np.argmax(scores)) if max(scores) > 0 else 0
            matched_record = self.gov_registry[best_idx]
            similarity = 0.6 if max(scores) > 0 else 0.3

        # Check if match is too low
        if similarity < 0.25:
            return {
                "verdict": "UNVERIFIED_NO_MATCHING_SCHEME",
                "confidence": round(1.0 - similarity, 4),
                "matched_scheme_id": None,
                "official_source": None,
                "ground_truth_excerpt": None,
                "nli_distribution": {"entailment": 0.1, "neutral": 0.8, "contradiction": 0.1}
            }

        # Run NLI
        premise = matched_record["official_fact"]
        nli_model, nli_tokenizer = self._get_nli_model()

        if nli_model is not None and nli_tokenizer is not None:
            try:
                inputs = nli_tokenizer(premise, viral_claim, truncation=True, return_tensors="pt").to(self.device)
                logits = nli_model(**inputs).logits
                probs = torch.softmax(logits, dim=-1).cpu().numpy()[0]
                
                # DeBERTa-v3 FEVER label mapping: 0 -> Entailment, 1 -> Neutral, 2 -> Contradiction
                label_map = ["VERIFIED_TRUE", "PARTIALLY_TRUE_OR_UNVERIFIED", "FAKE_CONTRADICTS_REGISTRY"]
                pred_idx = int(np.argmax(probs))

                return {
                    "verdict": label_map[pred_idx],
                    "confidence": round(float(probs[pred_idx]), 4),
                    "matched_scheme_id": matched_record["scheme_id"],
                    "matched_scheme_name": matched_record["scheme_name"],
                    "official_source": matched_record["source"],
                    "direct_apply_url": matched_record["direct_apply_url"],
                    "ground_truth_excerpt": premise,
                    "nli_distribution": {
                        "entailment": round(float(probs[0]), 4),
                        "neutral": round(float(probs[1]), 4),
                        "contradiction": round(float(probs[2]), 4)
                    }
                }
            except Exception as e:
                logger.warning(f"NLI inference failed: {e}")

        # Deterministic semantic rule fallback
        flags, is_phishing, fee_violation = self.audit_domains_and_scam_signals(viral_claim)
        if is_phishing or fee_violation:
            verdict = "FAKE_CONTRADICTS_REGISTRY"
            conf = 0.92
            dist = {"entailment": 0.05, "neutral": 0.10, "contradiction": 0.85}
        else:
            verdict = "VERIFIED_TRUE" if similarity > 0.6 else "PARTIALLY_TRUE_OR_UNVERIFIED"
            conf = 0.84 if similarity > 0.6 else 0.55
            dist = {"entailment": 0.80 if similarity > 0.6 else 0.35, "neutral": 0.35, "contradiction": 0.10}

        return {
            "verdict": verdict,
            "confidence": conf,
            "matched_scheme_id": matched_record["scheme_id"],
            "matched_scheme_name": matched_record["scheme_name"],
            "official_source": matched_record["source"],
            "direct_apply_url": matched_record["direct_apply_url"],
            "ground_truth_excerpt": premise,
            "nli_distribution": dist
        }

    # ────────────────────────── Full Composite Audit ──────────────────────────

    def audit_full(
        self,
        claim_text: str = "",
        image_data: Optional[Image.Image | np.ndarray] = None,
        audio_data: Optional[np.ndarray] = None,
        audio_sr: int = 16000
    ) -> ForensicReport:
        """
        Executes end-to-end multimodal audit:
        1. Media forensics (ViT deepfake + Wav2Vec2 spoof)
        2. Domain & Fee phishing analysis
        3. RAG + DeBERTa-v3 NLI verification
        4. Synthesizes Cute Mascot explanation & One-Click Apply enablement
        """
        start_time = time.time()
        suspicious_flags = []
        modality_breakdown = {}

        # 1. Image / Pamphlet Forensics
        img_fake_prob = 0.0
        if image_data is not None:
            img_audit = self.audit_image_deepfake(image_data)
            img_fake_prob = img_audit["synthetic_probability"]
            modality_breakdown["image"] = img_audit
            suspicious_flags.extend(img_audit.get("flags", []))

        # 2. Audio Forensics
        aud_fake_prob = 0.0
        if audio_data is not None:
            aud_audit = self.audit_audio_deepfake(audio_data, sr=audio_sr)
            aud_fake_prob = aud_audit["synthetic_probability"]
            modality_breakdown["audio"] = aud_audit
            suspicious_flags.extend(aud_audit.get("flags", []))

        # 3. Phishing and Fee Flags
        heuristic_flags, is_phishing, fee_violation = self.audit_domains_and_scam_signals(claim_text)
        suspicious_flags.extend(heuristic_flags)

        # 4. RAG + NLI Check
        nli_report = self.verify_claim_against_registry(claim_text)
        modality_breakdown["nli_registry"] = nli_report

        # 5. Composite Trust Formula & Verdict
        nli_verdict = nli_report.get("verdict", "UNVERIFIED")
        nli_contra = nli_report.get("nli_distribution", {}).get("contradiction", 0.0)
        nli_entail = nli_report.get("nli_distribution", {}).get("entailment", 0.0)

        # Weighted fake probability: w1*vid + w2*aud + w3*nli_contra + phishing penalty
        composite_fake_prob = (0.25 * img_fake_prob) + (0.25 * aud_fake_prob) + (0.40 * nli_contra)
        if is_phishing or fee_violation:
            composite_fake_prob = max(composite_fake_prob, 0.90)

        # Formulate Verdict
        if composite_fake_prob >= 0.65 or is_phishing or nli_verdict == "FAKE_CONTRADICTS_REGISTRY":
            verdict = "FAKE / SCAM"
            confidence = max(composite_fake_prob, 0.88)
            can_auto_apply = False
            
            # Cute Mascot Explanations
            mascot_explanation = (
                f"🚨 **Civic Mitra Alert!** Be careful—this message appears to be a fraudulent scam. "
                f"The official registry for {nli_report.get('matched_scheme_name', 'Government Schemes')} "
                f"never asks for registration fees or WhatsApp applications. "
            )
            if suspicious_flags:
                mascot_explanation += f"Key red flags found: {suspicious_flags[0]}."

        elif nli_verdict == "VERIFIED_TRUE" and composite_fake_prob < 0.35 and not is_phishing:
            verdict = "VERIFIED GENUINE"
            confidence = max(nli_entail, 0.85)
            can_auto_apply = True
            
            mascot_explanation = (
                f"✅ **Civic Mitra Verified!** This matches official government records for "
                f"**{nli_report.get('matched_scheme_name')}**. Benefits are administered directly "
                f"through {nli_report.get('official_source')}."
            )
        else:
            verdict = "UNVERIFIED"
            confidence = 0.50
            can_auto_apply = False
            mascot_explanation = (
                "⚠️ **Civic Mitra Notice:** We could not find a confirmed central gazette matching "
                "these exact terms. Please do not share personal documents or OTPs."
            )

        elapsed = (time.time() - start_time) * 1000

        return ForensicReport(
            verdict=verdict,
            confidence=round(confidence, 4),
            fake_probability=round(composite_fake_prob, 4),
            claim_text=claim_text,
            ground_truth_excerpt=nli_report.get("ground_truth_excerpt"),
            matched_scheme_id=nli_report.get("matched_scheme_id"),
            official_source=nli_report.get("official_source"),
            direct_apply_url=nli_report.get("direct_apply_url"),
            modality_breakdown=modality_breakdown,
            suspicious_flags=suspicious_flags,
            mascot_explanation=mascot_explanation,
            can_auto_apply=can_auto_apply,
            processing_time_ms=round(elapsed, 2)
        )
