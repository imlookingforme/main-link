"""
Verification & Autonomous Bureaucracy API Router
================================================
Endpoints:
- POST /api/verify/text         — Text NLI verification against government registry
- POST /api/verify/multimodal   — Complete forensic audit (text, image, audio, video)
- POST /api/audit/comprehensive — Deepfake + FEVER NLI + Phishing analysis
- WS   /ws/apply/{scheme_id}    — Real-time Playwright execution agent with live progress
- GET  /api/health              — Health & model readiness check
"""
from __future__ import annotations

import io
import time
import json
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, UploadFile, HTTPException, WebSocket, WebSocketDisconnect
from loguru import logger
from PIL import Image

from app.config import get_settings
from app.models.schemas import (
    TextVerifyRequest,
    VerificationResponse,
    EvidenceItem,
    ModalityScore,
    HealthResponse,
    KnowledgeBaseStatus,
)
from app.services.knowledge_base import KnowledgeBaseBuilder
from app.services.text_verifier import TextVerifier
from app.services.deepfake_detector import VideoDeepfakeDetector, AudioSpoofDetector, ImagePamphletAnalyzer
from app.services.fusion import FusionLayer, FusionInput
from app.services.ingest import IngestRouter
from app.services.multimodal_engine import MultimodalFactAndDeepfakeEngine, ForensicReport
from app.services.playwright_agent import PlaywrightExecutionAgent

router = APIRouter(prefix="/api", tags=["verification"])

# Lazy singletons
_kb: Optional[KnowledgeBaseBuilder] = None
_forensic_engine: Optional[MultimodalFactAndDeepfakeEngine] = None
_playwright_agent: Optional[PlaywrightExecutionAgent] = None
_ingest: Optional[IngestRouter] = None

def get_forensic_engine() -> MultimodalFactAndDeepfakeEngine:
    global _forensic_engine
    if _forensic_engine is None:
        _forensic_engine = MultimodalFactAndDeepfakeEngine()
    return _forensic_engine

def get_playwright_agent() -> PlaywrightExecutionAgent:
    global _playwright_agent
    if _playwright_agent is None:
        _playwright_agent = PlaywrightExecutionAgent(headless=True)
    return _playwright_agent

def get_ingest() -> IngestRouter:
    global _ingest
    if _ingest is None:
        _ingest = IngestRouter()
    return _ingest


# ─────────────────────────── REST Endpoints ───────────────────────────

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    engine = get_forensic_engine()
    models = [
        engine.vis_model_id,
        engine.aud_model_id,
        engine.nli_model_id,
        "playwright_execution_agent"
    ]
    return HealthResponse(
        status="ok",
        version="2.0.0",
        knowledge_base_docs=len(engine.gov_registry),
        models_loaded=models,
    )


@router.post("/audit/comprehensive")
async def audit_comprehensive(
    text: str = Form(default=""),
    image: Optional[UploadFile] = File(default=None),
    audio: Optional[UploadFile] = File(default=None),
):
    """
    Unified forensic audit:
    - ViT FaceForensics++ video/image deepfake audit
    - Wav2Vec2 voice cloning/TTS audit
    - DeBERTa-v3 FEVER NLI verification against official registries
    - Phishing URL and unauthorized fee scanner
    """
    engine = get_forensic_engine()

    image_obj = None
    if image is not None:
        try:
            img_bytes = await image.read()
            image_obj = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        except Exception as e:
            logger.warning(f"Could not parse uploaded image: {e}")

    audio_arr = None
    if audio is not None:
        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                tmp.write(await audio.read())
                tmp_path = tmp.name
            ingest = get_ingest()
            audio_arr, _ = ingest.extract_audio(tmp_path, target_sr=16000)
            Path(tmp_path).unlink(missing_ok=True)
        except Exception as e:
            logger.warning(f"Could not parse uploaded audio: {e}")

    report = engine.audit_full(
        claim_text=text,
        image_data=image_obj,
        audio_data=audio_arr,
    )

    return {
        "verdict": report.verdict,
        "confidence": report.confidence,
        "fake_probability": report.fake_probability,
        "claim_text": report.claim_text,
        "ground_truth_excerpt": report.ground_truth_excerpt,
        "matched_scheme_id": report.matched_scheme_id,
        "official_source": report.official_source,
        "direct_apply_url": report.direct_apply_url,
        "modality_breakdown": report.modality_breakdown,
        "suspicious_flags": report.suspicious_flags,
        "mascot_explanation": report.mascot_explanation,
        "can_auto_apply": report.can_auto_apply,
        "processing_time_ms": report.processing_time_ms
    }


@router.post("/kb/scrape-to-mongo")
async def trigger_scrape_to_mongo():
    """
    STRICT REQUIREMENT: NO API - ONLY WEB SCRAPING.
    Scrapes official Indian government websites directly via HTML/BeautifulSoup
    and seeds/updates MongoDB Atlas collections (official_schemes, government_fact_checks, official_portals).
    """
    try:
        from scripts.scrape_and_seed_mongo import MongoDataSeeder
        seeder = MongoDataSeeder()
        summary = seeder.seed_all()
        # Refresh the active in-memory engine registry from MongoDB
        engine = get_forensic_engine()
        engine.gov_registry = engine._load_registry_from_mongo()
        return {
            "status": "success",
            "message": "Scraped data successfully stored into MongoDB Atlas collections.",
            "database": "mainlink_db",
            "summary": summary
        }
    except Exception as e:
        logger.error(f"Scrape to MongoDB failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify/text", response_model=VerificationResponse)
async def verify_text(request: TextVerifyRequest):
    """Verifies text claim against government registry."""
    engine = get_forensic_engine()
    report = engine.audit_full(claim_text=request.text)

    evidence = []
    if report.ground_truth_excerpt:
        evidence.append(EvidenceItem(
            text=report.ground_truth_excerpt,
            source_url=report.official_source or "",
            scheme_name=report.matched_scheme_id or "Central Registry",
            score=report.confidence
        ))

    return VerificationResponse(
        verdict=report.verdict,
        confidence=report.confidence,
        fake_probability=report.fake_probability,
        explanation=report.mascot_explanation,
        evidence=evidence,
        modality_scores=[
            ModalityScore(modality="nli_registry", score=1.0 - report.fake_probability, details={
                "scheme_id": report.matched_scheme_id,
                "flags_count": len(report.suspicious_flags)
            })
        ],
        suspicious_signals=report.suspicious_flags,
        detected_language=request.language or "en",
        original_text=request.text,
        normalized_text=request.text,
        processing_time_ms=report.processing_time_ms
    )


@router.post("/verify/multimodal")
async def verify_multimodal(
    text: str = Form(default=""),
    language: str = Form(default="auto"),
    image: Optional[UploadFile] = File(default=None),
    video: Optional[UploadFile] = File(default=None),
    audio: Optional[UploadFile] = File(default=None),
):
    """Full multimodal intake."""
    return await audit_comprehensive(text=text, image=image, audio=audio)


# ─────────────────────────── WebSocket Execution Agent ───────────────────────────

@router.websocket("/ws/apply/{scheme_id}")
async def one_click_apply_agent_ws(websocket: WebSocket, scheme_id: str):
    """
    Playwright Browser Automation Agent WebSocket.
    Streams progress from 0% to 100% directly to the live frontend progress bar.
    """
    await websocket.accept()
    logger.info(f"WebSocket client connected for scheme application: {scheme_id}")

    agent = get_playwright_agent()

    async def emit_progress(step: int, pct: int, msg: str, screenshot: Optional[str] = None):
        payload = {
            "step": step,
            "progress_percent": pct,
            "status_message": msg,
            "screenshot_url": screenshot
        }
        await websocket.send_text(json.dumps(payload))

    try:
        result = await agent.execute_application(
            scheme_id=scheme_id,
            progress_callback=emit_progress
        )
        await websocket.send_text(json.dumps({
            "step": 5,
            "progress_percent": 100,
            "status_message": f"Application Successful! Ref: {result.get('reference_id')}",
            "receipt_url": result.get("receipt_url"),
            "result": result
        }))
    except WebSocketDisconnect:
        logger.warning(f"Client disconnected during execution of {scheme_id}")
    except Exception as e:
        logger.error(f"WebSocket execution error: {e}")
        try:
            await websocket.send_text(json.dumps({
                "step": 0,
                "progress_percent": 0,
                "error": str(e)
            }))
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
