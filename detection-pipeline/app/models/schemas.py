"""
Pydantic models for API request/response schemas.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ─────────────────────────── Request Models ───────────────────────────

class TextVerifyRequest(BaseModel):
    """Request to verify a text claim."""
    text: str = Field(..., min_length=5, description="The text claim to verify")
    language: str = Field(default="auto", description="Language code or 'auto' for detection")


class MultiModalVerifyRequest(BaseModel):
    """Request for multi-modal verification (text + optional media)."""
    text: str = Field(default="", description="Text claim to verify")
    language: str = Field(default="auto", description="Language code or 'auto'")


# ─────────────────────────── Response Models ───────────────────────────

class EvidenceItem(BaseModel):
    """A piece of supporting/contradicting evidence."""
    text: str
    source_url: str = ""
    scheme_name: str = ""
    score: float = 0.0


class ModalityScore(BaseModel):
    """Score from a single modality."""
    modality: str
    score: float
    details: dict = Field(default_factory=dict)


class VerificationResponse(BaseModel):
    """Full verification response."""
    verdict: str = Field(description="Verified | Fake/Scam | Unverified")
    confidence: float = Field(ge=0.0, le=1.0)
    fake_probability: float = Field(ge=0.0, le=1.0, default=0.0)
    explanation: str = ""
    evidence: list[EvidenceItem] = Field(default_factory=list)
    modality_scores: list[ModalityScore] = Field(default_factory=list)
    suspicious_signals: list[str] = Field(default_factory=list)
    detected_language: str = "en"
    original_text: str = ""
    normalized_text: str = ""
    processing_time_ms: float = 0.0
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "ok"
    version: str = "1.0.0"
    knowledge_base_docs: int = 0
    models_loaded: list[str] = Field(default_factory=list)


class KnowledgeBaseStatus(BaseModel):
    """Knowledge base status."""
    total_documents: int = 0
    index_built: bool = False
    last_updated: str = ""
    sources: list[str] = Field(default_factory=list)
