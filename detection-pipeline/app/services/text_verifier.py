"""
Text Verification Service (Phase 2)
=====================================
Retrieve → NLI pipeline.
1. Normalize claim (language ID, strip boilerplate)
2. Hybrid retrieval (dense bge-m3 + sparse BM25)
3. NLI with DeBERTa on (passage, claim) pairs
4. Aggregate verdict: Verified / Fake-Scam / Unverified
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

import numpy as np
from loguru import logger

from app.config import get_settings
from app.services.knowledge_base import KnowledgeBaseBuilder, Document


@dataclass
class NLIResult:
    """NLI result for a single (premise, hypothesis) pair."""
    premise: str
    hypothesis: str
    entailment: float = 0.0
    neutral: float = 0.0
    contradiction: float = 0.0
    source_url: str = ""
    scheme_name: str = ""


@dataclass
class VerificationResult:
    """Final text verification verdict."""
    verdict: str = "Unverified"  # Verified | Fake/Scam | Unverified
    confidence: float = 0.0
    evidence: list[dict] = field(default_factory=list)
    nli_results: list[NLIResult] = field(default_factory=list)
    detected_language: str = "en"
    original_claim: str = ""
    normalized_claim: str = ""
    suspicious_signals: list[str] = field(default_factory=list)


class TextVerifier:
    """
    Phase 2: Text claim verification using retrieval + NLI.

    Pipeline:
    1. Normalize claim text
    2. Retrieve top-k passages via hybrid search
    3. Run DeBERTa NLI on each (passage, claim) pair
    4. Aggregate into verdict with thresholds τ_E, τ_C
    """

    def __init__(self, kb: KnowledgeBaseBuilder | None = None):
        self.settings = get_settings()
        self.kb = kb or KnowledgeBaseBuilder()
        self._nli_pipeline = None
        self._nli_tokenizer = None
        self._nli_model = None

    def _load_nli_model(self):
        """Load DeBERTa-v3-large-mnli for NLI."""
        if self._nli_pipeline is not None:
            return

        model_name = self.settings.nli_model
        logger.info(f"Loading NLI model: {model_name}")

        try:
            from transformers import pipeline as hf_pipeline
            self._nli_pipeline = hf_pipeline(
                "zero-shot-classification",
                model=model_name,
                device=-1,  # CPU
            )
            logger.info("NLI model loaded via zero-shot-classification pipeline")
        except Exception as e:
            logger.warning(f"Pipeline load failed: {e}, trying manual load")
            try:
                from transformers import AutoTokenizer, AutoModelForSequenceClassification
                import torch

                self._nli_tokenizer = AutoTokenizer.from_pretrained(model_name)
                self._nli_model = AutoModelForSequenceClassification.from_pretrained(model_name)
                self._nli_model.eval()
                logger.info("NLI model loaded manually")
            except Exception as e2:
                logger.error(f"NLI model load failed entirely: {e2}")
                raise

    def run_nli(self, premise: str, hypothesis: str) -> tuple[float, float, float]:
        """
        Run NLI on a (premise, hypothesis) pair.
        Returns (entailment, neutral, contradiction) probabilities.
        """
        self._load_nli_model()

        try:
            if self._nli_pipeline is not None:
                # zero-shot-classification pipeline
                result = self._nli_pipeline(
                    hypothesis,
                    candidate_labels=["true", "false", "uncertain"],
                    hypothesis_template="This claim is {}.",
                    multi_label=False,
                )
                # Map: true→entailment, uncertain→neutral, false→contradiction
                scores = dict(zip(result["labels"], result["scores"]))
                return (
                    scores.get("true", 0.0),
                    scores.get("uncertain", 0.0),
                    scores.get("false", 0.0),
                )
            else:
                # Manual inference
                import torch

                # DeBERTa MNLI: 0=contradiction, 1=neutral, 2=entailment
                inputs = self._nli_tokenizer(
                    premise, hypothesis,
                    return_tensors="pt",
                    truncation=True,
                    max_length=512,
                    padding=True,
                )
                with torch.no_grad():
                    outputs = self._nli_model(**inputs)
                    probs = torch.softmax(outputs.logits, dim=-1)[0]

                return (
                    float(probs[2]),  # entailment
                    float(probs[1]),  # neutral
                    float(probs[0]),  # contradiction
                )

        except Exception as e:
            logger.error(f"NLI inference failed: {e}")
            return (0.33, 0.34, 0.33)

    def _detect_suspicious_signals(self, claim: str) -> list[str]:
        """Detect suspicious patterns in the claim text."""
        import re
        signals = []

        # Check for specific monetary amounts (common in scam messages)
        money_pattern = r'(?:Rs\.?|₹|INR)\s*[\d,]+(?:\.\d+)?(?:\s*(?:lakh|crore|thousand|hundred))?'
        if re.search(money_pattern, claim, re.IGNORECASE):
            signals.append("Contains specific monetary amount — verify against official scheme details")

        # Check for urgency language
        urgency_words = [
            "urgent", "immediately", "last date", "deadline", "hurry",
            "limited time", "act now", "don't miss", "expires",
            "जल्दी", "तुरंत", "अंतिम तिथि",
        ]
        for word in urgency_words:
            if word.lower() in claim.lower():
                signals.append(f"Urgency language detected: '{word}'")
                break

        # Check for suspicious URLs
        url_pattern = r'https?://\S+'
        urls = re.findall(url_pattern, claim)
        for url in urls:
            if not any(domain in url for domain in ['.gov.in', '.nic.in', '.india.gov.in']):
                signals.append(f"Non-government URL found: {url}")

        # Check for forwarding indicators
        forward_patterns = [
            r'forward\s+to\s+\d+\s+people',
            r'share\s+with\s+everyone',
            r'send\s+to\s+all',
            r'viral',
        ]
        for pat in forward_patterns:
            if re.search(pat, claim, re.IGNORECASE):
                signals.append("Contains forwarding/viral language — typical of misinformation")
                break

        # WhatsApp/social media share language
        if any(w in claim.lower() for w in ["whatsapp", "telegram", "forward", "shared"]):
            signals.append("Social media sharing language detected")

        return signals

    def verify(
        self,
        claim: str,
        language: str = "en",
        top_k: int | None = None,
    ) -> VerificationResult:
        """
        Full text verification pipeline.

        Args:
            claim: The text claim to verify.
            language: Detected language of the claim.
            top_k: Number of passages to retrieve.

        Returns:
            VerificationResult with verdict, confidence, and evidence.
        """
        if top_k is None:
            top_k = self.settings.retrieval_top_k

        tau_e = self.settings.tau_entailment
        tau_c = self.settings.tau_contradiction

        result = VerificationResult(
            original_claim=claim,
            detected_language=language,
        )

        # 1. Normalize
        from app.services.ingest import IngestRouter
        result.normalized_claim = IngestRouter.normalize_text(claim)

        if not result.normalized_claim:
            result.verdict = "Unverified"
            result.confidence = 0.0
            return result

        # 2. Detect suspicious signals
        result.suspicious_signals = self._detect_suspicious_signals(claim)

        # 3. Retrieve top-k passages
        try:
            retrieved = self.kb.retrieve(result.normalized_claim, top_k=top_k)
        except Exception as e:
            logger.error(f"Retrieval failed: {e}")
            result.verdict = "Unverified"
            result.confidence = 0.0
            result.suspicious_signals.append(f"Knowledge base retrieval failed: {str(e)}")
            return result

        if not retrieved:
            result.verdict = "Unverified"
            result.confidence = 0.0
            if result.suspicious_signals:
                result.suspicious_signals.append(
                    "No matching official documents found — treat with caution"
                )
            return result

        # 4. Run NLI on each (passage, claim)
        nli_results = []
        for doc, retrieval_score in retrieved:
            e, n, c = self.run_nli(
                premise=doc.text,
                hypothesis=result.normalized_claim,
            )
            nli_result = NLIResult(
                premise=doc.text,
                hypothesis=result.normalized_claim,
                entailment=e,
                neutral=n,
                contradiction=c,
                source_url=doc.source_url,
                scheme_name=doc.scheme_name,
            )
            nli_results.append(nli_result)

        result.nli_results = nli_results

        # 5. Aggregate verdict
        max_entailment = max(r.entailment for r in nli_results)
        max_contradiction = max(r.contradiction for r in nli_results)

        if max_entailment > tau_e:
            result.verdict = "Verified"
            result.confidence = float(max_entailment)
            # Find the best supporting evidence
            best_idx = max(range(len(nli_results)), key=lambda i: nli_results[i].entailment)
            result.evidence = [{
                "text": nli_results[best_idx].premise,
                "source_url": nli_results[best_idx].source_url,
                "scheme_name": nli_results[best_idx].scheme_name,
                "support_score": float(nli_results[best_idx].entailment),
            }]
        elif max_contradiction > tau_c:
            result.verdict = "Fake/Scam"
            result.confidence = float(max_contradiction)
            best_idx = max(range(len(nli_results)), key=lambda i: nli_results[i].contradiction)
            result.evidence = [{
                "text": nli_results[best_idx].premise,
                "source_url": nli_results[best_idx].source_url,
                "scheme_name": nli_results[best_idx].scheme_name,
                "contradiction_score": float(nli_results[best_idx].contradiction),
            }]
        else:
            result.verdict = "Unverified"
            # Use the strongest signal as confidence
            result.confidence = float(max(max_entailment, max_contradiction))

            # If there are suspicious signals but no strong NLI signal,
            # the claim is likely a scam that isn't in our knowledge base
            if len(result.suspicious_signals) >= 2:
                result.suspicious_signals.append(
                    "Multiple suspicious signals with no official corroboration — "
                    "likely misinformation"
                )

        # Add all retrieved passages as evidence context
        for doc, score in retrieved:
            result.evidence.append({
                "text": doc.text[:200] + "..." if len(doc.text) > 200 else doc.text,
                "source_url": doc.source_url,
                "scheme_name": doc.scheme_name,
                "retrieval_score": float(score),
            })

        return result
