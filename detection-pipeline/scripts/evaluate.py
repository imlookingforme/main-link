"""
Gold Set Evaluation Script (Phase 6)
======================================
Evaluates the full pipeline against a gold set of hand-labeled claims.
Reports AUROC, F1, precision, recall.
"""
import sys
import os
import json
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from loguru import logger


# Gold set: real viral claims with ground truth labels
# verdict: "Verified" (true claim), "Fake/Scam" (false claim), "Unverified" (unclear)
GOLD_SET = [
    # ── Verified Claims ──
    {
        "text": "PM Kisan scheme provides Rs 6000 per year in three instalments of Rs 2000 each",
        "label": "Verified",
        "source": "pmkisan.gov.in",
    },
    {
        "text": "Ayushman Bharat provides health insurance cover of Rs 5 lakh per family",
        "label": "Verified",
        "source": "pmjay.gov.in",
    },
    {
        "text": "Sukanya Samriddhi Yojana offers interest rate of 8.2% per annum",
        "label": "Verified",
        "source": "india.gov.in",
    },
    {
        "text": "PM Vishwakarma provides toolkit incentive of Rs 15000 to artisans",
        "label": "Verified",
        "source": "pmvishwakarma.gov.in",
    },
    {
        "text": "Ujjwala Yojana provides free LPG connections to BPL women",
        "label": "Verified",
        "source": "pmuy.gov.in",
    },
    # ── Fake/Scam Claims ──
    {
        "text": "Government is giving free smartphones to all citizens under Digital India. Click here to register: digitalindia-free.com",
        "label": "Fake/Scam",
        "source": "PIB Fact Check",
    },
    {
        "text": "PM Modi announced Rs 15000 monthly universal basic income for all Indians",
        "label": "Fake/Scam",
        "source": "PIB Fact Check",
    },
    {
        "text": "Your Aadhaar card will be deactivated in 24 hours if not linked to mobile number. Share OTP now",
        "label": "Fake/Scam",
        "source": "UIDAI advisory",
    },
    {
        "text": "Free solar panels being distributed door to door by government",
        "label": "Fake/Scam",
        "source": "PIB Fact Check",
    },
    {
        "text": "Free data recharge from Jio under Digital India programme, apply at jio-free-recharge.xyz",
        "label": "Fake/Scam",
        "source": "PIB Fact Check",
    },
    {
        "text": "PM Kisan giving Rs 15000 per month now. Register at pmkisan-apply.blogspot.com",
        "label": "Fake/Scam",
        "source": "Known scam variant",
    },
    {
        "text": "Government giving Rs 5 lakh direct transfer under Vishwakarma scheme to everyone",
        "label": "Fake/Scam",
        "source": "Distortion of PM Vishwakarma scheme",
    },
    {
        "text": "Forward this to 10 people to receive Rs 2000 in your bank account from PM Modi",
        "label": "Fake/Scam",
        "source": "Common chain message scam",
    },
    # ── Unverified / Edge Cases ──
    {
        "text": "New government scheme launching next month for students",
        "label": "Unverified",
        "source": "Vague, no specifics",
    },
    {
        "text": "Interest rates on FD may change in next quarter",
        "label": "Unverified",
        "source": "Generic financial news",
    },
]


def evaluate():
    """Run the gold set evaluation."""
    from app.services.knowledge_base import KnowledgeBaseBuilder
    from app.services.text_verifier import TextVerifier
    from app.services.fusion import FusionLayer, FusionInput

    logger.info("=" * 60)
    logger.info("Gold Set Evaluation")
    logger.info(f"Total samples: {len(GOLD_SET)}")
    logger.info("=" * 60)

    # Initialize
    kb = KnowledgeBaseBuilder()
    if not kb.load_documents():
        logger.error("Knowledge base not built! Run build_kb.py first.")
        sys.exit(1)
    kb.load_faiss_index()
    kb.build_bm25()

    verifier = TextVerifier(kb=kb)
    fusion = FusionLayer()

    # Evaluate
    results = []
    correct = 0
    total = len(GOLD_SET)

    for i, sample in enumerate(GOLD_SET):
        text_result = verifier.verify(sample["text"])

        # Map to fusion
        if text_result.verdict == "Verified":
            text_score = 1.0 - text_result.confidence
        elif text_result.verdict == "Fake/Scam":
            text_score = text_result.confidence
        else:
            text_score = 0.5

        fusion_input = FusionInput(
            text_score=text_score,
            text_verdict=text_result.verdict,
            suspicious_signals=text_result.suspicious_signals,
        )
        fusion_result = fusion.fuse(fusion_input)

        predicted = fusion_result.verdict
        expected = sample["label"]
        is_correct = predicted == expected

        if is_correct:
            correct += 1

        status = "✅" if is_correct else "❌"
        logger.info(
            f"  {status} [{i+1}/{total}] "
            f"Expected: {expected:12s} | Predicted: {predicted:12s} | "
            f"Conf: {fusion_result.confidence:.2f} | "
            f"P(fake): {fusion_result.fake_probability:.2f}"
        )

        results.append({
            "text": sample["text"][:80],
            "expected": expected,
            "predicted": predicted,
            "correct": is_correct,
            "confidence": fusion_result.confidence,
            "fake_probability": fusion_result.fake_probability,
        })

    # Summary
    accuracy = correct / total if total > 0 else 0.0

    logger.info("\n" + "=" * 60)
    logger.info(f"ACCURACY: {accuracy:.1%} ({correct}/{total})")
    logger.info("=" * 60)

    # Per-class metrics
    for label in ["Verified", "Fake/Scam", "Unverified"]:
        tp = sum(1 for r in results if r["expected"] == label and r["predicted"] == label)
        fp = sum(1 for r in results if r["expected"] != label and r["predicted"] == label)
        fn = sum(1 for r in results if r["expected"] == label and r["predicted"] != label)

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

        logger.info(f"  {label:12s} — P: {precision:.2f}  R: {recall:.2f}  F1: {f1:.2f}")

    # Save results
    output_path = Path("knowledge_base") / "evaluation_results.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump({"accuracy": accuracy, "results": results}, f, indent=2)
    logger.info(f"\nResults saved to {output_path}")


if __name__ == "__main__":
    evaluate()
