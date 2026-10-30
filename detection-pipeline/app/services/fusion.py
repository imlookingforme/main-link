"""
Fusion Layer (Phase 4)
========================
Calibrated logistic fusion across modality scores.
P(fake | s) = σ(w₀ + Σ wₘ · logit(sₘ))
"""
from __future__ import annotations

import json
import pickle
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import numpy as np
from loguru import logger


@dataclass
class FusionInput:
    """Input scores from each modality."""
    text_score: float | None = None       # 0 = verified, 1 = fake
    image_score: float | None = None      # 0 = authentic, 1 = fake
    video_score: float | None = None      # 0 = real, 1 = deepfake
    audio_score: float | None = None      # 0 = real, 1 = spoofed
    text_verdict: str = ""
    suspicious_signals: list[str] = field(default_factory=list)


@dataclass
class FusionResult:
    """Final fused verdict."""
    verdict: str = "Unverified"  # Verified | Fake/Scam | Unverified
    confidence: float = 0.0
    fake_probability: float = 0.0
    modality_scores: dict = field(default_factory=dict)
    evidence: list[dict] = field(default_factory=list)
    explanation: str = ""
    suspicious_signals: list[str] = field(default_factory=list)


def _safe_logit(p: float, eps: float = 1e-6) -> float:
    """Safe logit transform: log(p / (1-p)), clamped."""
    p = max(eps, min(1 - eps, p))
    return float(np.log(p / (1 - p)))


def _sigmoid(x: float) -> float:
    """Sigmoid function."""
    return float(1.0 / (1.0 + np.exp(-x)))


class FusionLayer:
    """
    Calibrated logistic fusion across modality scores.

    P(fake | s) = σ(w₀ + Σ wₘ · logit(sₘ))

    Weights can be fitted via logistic regression on a validation set
    or use sensible defaults.
    """

    # Default weights (can be overridden by fitted model)
    DEFAULT_WEIGHTS = {
        "bias": -0.5,       # Prior: slightly toward "not fake"
        "text": 2.0,        # Text NLI is strongest signal
        "image": 1.5,       # Image/OCR domain checks
        "video": 1.8,       # Video deepfake
        "audio": 1.3,       # Audio spoof
    }

    def __init__(self, weights_path: str | Path | None = None):
        self.weights = self.DEFAULT_WEIGHTS.copy()
        self._calibrator = None

        if weights_path and Path(weights_path).exists():
            self._load_weights(weights_path)

    def _load_weights(self, path: str | Path):
        """Load fitted weights from disk."""
        path = Path(path)
        try:
            if path.suffix == ".json":
                with open(path, "r") as f:
                    self.weights = json.load(f)
            elif path.suffix == ".pkl":
                with open(path, "rb") as f:
                    data = pickle.load(f)
                    self.weights = data.get("weights", self.weights)
                    self._calibrator = data.get("calibrator")
            logger.info(f"Loaded fusion weights from {path}")
        except Exception as e:
            logger.warning(f"Failed to load weights: {e}, using defaults")

    def save_weights(self, path: str | Path):
        """Save current weights to disk."""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            json.dump(self.weights, f, indent=2)
        logger.info(f"Saved fusion weights to {path}")

    def fit(
        self,
        X: list[FusionInput],
        y: list[int],  # 0 = real, 1 = fake
    ):
        """
        Fit fusion weights using logistic regression + isotonic calibration.

        Args:
            X: List of FusionInput with modality scores.
            y: Binary labels (0=real, 1=fake).
        """
        from sklearn.linear_model import LogisticRegression
        from sklearn.isotonic import IsotonicRegression

        # Build feature matrix
        features = []
        for inp in X:
            row = []
            if inp.text_score is not None:
                row.append(_safe_logit(inp.text_score))
            else:
                row.append(0.0)
            if inp.image_score is not None:
                row.append(_safe_logit(inp.image_score))
            else:
                row.append(0.0)
            if inp.video_score is not None:
                row.append(_safe_logit(inp.video_score))
            else:
                row.append(0.0)
            if inp.audio_score is not None:
                row.append(_safe_logit(inp.audio_score))
            else:
                row.append(0.0)
            features.append(row)

        X_arr = np.array(features)
        y_arr = np.array(y)

        # Fit logistic regression
        clf = LogisticRegression(C=1.0, max_iter=1000)
        clf.fit(X_arr, y_arr)

        # Extract weights
        self.weights = {
            "bias": float(clf.intercept_[0]),
            "text": float(clf.coef_[0][0]),
            "image": float(clf.coef_[0][1]),
            "video": float(clf.coef_[0][2]),
            "audio": float(clf.coef_[0][3]),
        }

        # Calibrate with isotonic regression
        raw_probs = clf.predict_proba(X_arr)[:, 1]
        self._calibrator = IsotonicRegression(out_of_bounds="clip")
        self._calibrator.fit(raw_probs, y_arr)

        logger.info(f"Fitted fusion weights: {self.weights}")

    def fuse(self, inputs: FusionInput) -> FusionResult:
        """
        Fuse modality scores into final verdict.

        P(fake | s) = σ(w₀ + Σ wₘ · logit(sₘ))
        """
        result = FusionResult()
        result.suspicious_signals = inputs.suspicious_signals.copy()

        # Compute logistic sum
        logit_sum = self.weights["bias"]
        active_modalities = []

        if inputs.text_score is not None:
            logit_sum += self.weights["text"] * _safe_logit(inputs.text_score)
            result.modality_scores["text"] = inputs.text_score
            active_modalities.append("text")

        if inputs.image_score is not None:
            logit_sum += self.weights["image"] * _safe_logit(inputs.image_score)
            result.modality_scores["image"] = inputs.image_score
            active_modalities.append("image")

        if inputs.video_score is not None:
            logit_sum += self.weights["video"] * _safe_logit(inputs.video_score)
            result.modality_scores["video"] = inputs.video_score
            active_modalities.append("video")

        if inputs.audio_score is not None:
            logit_sum += self.weights["audio"] * _safe_logit(inputs.audio_score)
            result.modality_scores["audio"] = inputs.audio_score
            active_modalities.append("audio")

        if not active_modalities:
            result.verdict = "Unverified"
            result.explanation = "No modality scores available for fusion."
            return result

        # Raw probability
        raw_prob = _sigmoid(logit_sum)

        # Calibrate if calibrator is available
        if self._calibrator is not None:
            try:
                cal_prob = float(self._calibrator.predict([raw_prob])[0])
            except Exception:
                cal_prob = raw_prob
        else:
            cal_prob = raw_prob

        result.fake_probability = cal_prob
        result.confidence = abs(cal_prob - 0.5) * 2  # 0 at 50%, 1 at 0% or 100%

        # Determine verdict
        # If text verification said "Verified", respect that unless other
        # modalities strongly disagree
        if inputs.text_verdict == "Verified" and cal_prob < 0.7:
            result.verdict = "Verified"
            result.explanation = (
                f"Text claim is supported by official sources "
                f"(fused fake probability: {cal_prob:.1%}). "
                f"Active modalities: {', '.join(active_modalities)}."
            )
        elif cal_prob > 0.65:
            result.verdict = "Fake/Scam"
            result.explanation = (
                f"High probability of misinformation/deepfake "
                f"(fused fake probability: {cal_prob:.1%}). "
                f"Active modalities: {', '.join(active_modalities)}."
            )
        elif cal_prob < 0.35:
            result.verdict = "Verified"
            result.explanation = (
                f"Content appears authentic "
                f"(fused fake probability: {cal_prob:.1%}). "
                f"Active modalities: {', '.join(active_modalities)}."
            )
        else:
            result.verdict = "Unverified"
            result.explanation = (
                f"Insufficient evidence to determine authenticity "
                f"(fused fake probability: {cal_prob:.1%}). "
                f"Active modalities: {', '.join(active_modalities)}. "
                f"Exercise caution and verify from official sources."
            )

        return result
