"""
Verification API Router
========================
POST /api/verify/text      — text-only verification
POST /api/verify/multimodal — text + image/video/audio
GET  /api/health            — health check
GET  /api/kb/status         — knowledge base status
POST /api/kb/build          — trigger knowledge base build
"""
from __future__ import annotations

import io
import time
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, UploadFile, HTTPException
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
from app.services.deepfake_detector import (
    VideoDeepfakeDetector,
    AudioSpoofDetector,
    ImagePamphletAnalyzer,
)
from app.services.fusion import FusionLayer, FusionInput
from app.services.ingest import IngestRouter

router = APIRouter(prefix="/api", tags=["verification"])

# ── Lazy-loaded singletons ──
_kb: KnowledgeBaseBuilder | None = None
_text_verifier: TextVerifier | None = None
_video_detector: VideoDeepfakeDetector | None = None
_audio_detector: AudioSpoofDetector | None = None
_image_analyzer: ImagePamphletAnalyzer | None = None
_fusion: FusionLayer | None = None
_ingest: IngestRouter | None = None


def _get_kb() -> KnowledgeBaseBuilder:
    global _kb
    if _kb is None:
        _kb = KnowledgeBaseBuilder()
        _kb.load_documents()
        try:
            _kb.load_faiss_index()
            _kb.build_bm25()
        except Exception as e:
            logger.warning(f"KB index not ready: {e}")
    return _kb


def _get_text_verifier() -> TextVerifier:
    global _text_verifier
    if _text_verifier is None:
        _text_verifier = TextVerifier(kb=_get_kb())
    return _text_verifier


def _get_video_detector() -> VideoDeepfakeDetector:
    global _video_detector
    if _video_detector is None:
        _video_detector = VideoDeepfakeDetector()
    return _video_detector


def _get_audio_detector() -> AudioSpoofDetector:
    global _audio_detector
    if _audio_detector is None:
        _audio_detector = AudioSpoofDetector()
    return _audio_detector


def _get_image_analyzer() -> ImagePamphletAnalyzer:
    global _image_analyzer
    if _image_analyzer is None:
        _image_analyzer = ImagePamphletAnalyzer()
    return _image_analyzer


def _get_fusion() -> FusionLayer:
    global _fusion
    if _fusion is None:
        _fusion = FusionLayer()
    return _fusion


def _get_ingest() -> IngestRouter:
    global _ingest
    if _ingest is None:
        _ingest = IngestRouter()
    return _ingest


# ─────────────────────────── Endpoints ───────────────────────────


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    kb = _get_kb()
    models = []
    if kb.documents:
        models.append("knowledge_base")
    if kb._faiss_index:
        models.append("faiss_index")
    return HealthResponse(
        status="ok",
        version="1.0.0",
        knowledge_base_docs=len(kb.documents),
        models_loaded=models,
    )


@router.get("/kb/status", response_model=KnowledgeBaseStatus)
async def kb_status():
    """Get knowledge base status."""
    kb = _get_kb()
    return KnowledgeBaseStatus(
        total_documents=len(kb.documents),
        index_built=kb._faiss_index is not None,
        last_updated=kb.docs_path.stat().st_mtime.__str__()
        if kb.docs_path.exists()
        else "",
        sources=list(set(d.doc_type for d in kb.documents)),
    )


@router.post("/kb/build")
async def build_knowledge_base():
    """Trigger knowledge base build/rebuild."""
    try:
        kb = _get_kb()
        count = kb.build()
        return {
            "status": "success",
            "documents_indexed": count,
            "message": f"Knowledge base built with {count} chunks",
        }
    except Exception as e:
        logger.error(f"KB build failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify/text", response_model=VerificationResponse)
async def verify_text(request: TextVerifyRequest):
    """Verify a text claim against the knowledge base."""
    start_time = time.time()

    try:
        ingest = _get_ingest()
        verifier = _get_text_verifier()
        fusion = _get_fusion()

        # Language detection
        language = request.language
        if language == "auto":
            language = ingest.detect_language(request.text)

        # Run text verification
        text_result = verifier.verify(request.text, language=language)

        # Map text verdict to score for fusion
        text_score = None
        if text_result.verdict == "Verified":
            text_score = 1.0 - text_result.confidence  # Low fake score
        elif text_result.verdict == "Fake/Scam":
            text_score = text_result.confidence  # High fake score
        else:
            text_score = 0.5  # Uncertain

        # Fuse (text-only)
        fusion_input = FusionInput(
            text_score=text_score,
            text_verdict=text_result.verdict,
            suspicious_signals=text_result.suspicious_signals,
        )
        fusion_result = fusion.fuse(fusion_input)

        # Build response
        evidence = []
        for ev in text_result.evidence[:5]:
            evidence.append(EvidenceItem(
                text=ev.get("text", ""),
                source_url=ev.get("source_url", ""),
                scheme_name=ev.get("scheme_name", ""),
                score=ev.get("support_score", ev.get("contradiction_score", ev.get("retrieval_score", 0.0))),
            ))

        elapsed_ms = (time.time() - start_time) * 1000

        return VerificationResponse(
            verdict=fusion_result.verdict,
            confidence=fusion_result.confidence,
            fake_probability=fusion_result.fake_probability,
            explanation=fusion_result.explanation,
            evidence=evidence,
            modality_scores=[
                ModalityScore(modality="text", score=text_score or 0.5, details={
                    "nli_verdict": text_result.verdict,
                    "nli_confidence": text_result.confidence,
                }),
            ],
            suspicious_signals=text_result.suspicious_signals,
            detected_language=language,
            original_text=request.text,
            normalized_text=text_result.normalized_claim,
            processing_time_ms=elapsed_ms,
        )

    except Exception as e:
        logger.error(f"Text verification failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify/multimodal", response_model=VerificationResponse)
async def verify_multimodal(
    text: str = Form(default=""),
    language: str = Form(default="auto"),
    image: UploadFile | None = File(default=None),
    video: UploadFile | None = File(default=None),
    audio: UploadFile | None = File(default=None),
):
    """Multi-modal verification: text + optional image/video/audio."""
    start_time = time.time()

    try:
        ingest = _get_ingest()
        fusion = _get_fusion()

        fusion_input = FusionInput()
        modality_scores = []
        all_evidence = []
        suspicious_signals = []

        # ── TEXT ──
        if text.strip():
            verifier = _get_text_verifier()
            if language == "auto":
                language = ingest.detect_language(text)

            text_result = verifier.verify(text, language=language)

            if text_result.verdict == "Verified":
                fusion_input.text_score = 1.0 - text_result.confidence
            elif text_result.verdict == "Fake/Scam":
                fusion_input.text_score = text_result.confidence
            else:
                fusion_input.text_score = 0.5

            fusion_input.text_verdict = text_result.verdict
            suspicious_signals.extend(text_result.suspicious_signals)

            modality_scores.append(ModalityScore(
                modality="text", score=fusion_input.text_score,
                details={"verdict": text_result.verdict, "confidence": text_result.confidence},
            ))

            for ev in text_result.evidence[:3]:
                all_evidence.append(EvidenceItem(
                    text=ev.get("text", ""),
                    source_url=ev.get("source_url", ""),
                    scheme_name=ev.get("scheme_name", ""),
                    score=ev.get("support_score", ev.get("retrieval_score", 0.0)),
                ))

        # ── IMAGE ──
        if image is not None:
            try:
                img_bytes = await image.read()
                pil_image = Image.open(io.BytesIO(img_bytes)).convert("RGB")

                analyzer = _get_image_analyzer()
                img_result = analyzer.analyze(pil_image)

                fusion_input.image_score = img_result.confidence
                suspicious_signals.extend(img_result.suspicious_elements)

                modality_scores.append(ModalityScore(
                    modality="image", score=img_result.confidence,
                    details={
                        "is_fake": img_result.is_fake,
                        "ai_generated_score": img_result.ai_generated_score,
                        "ocr_text_length": len(img_result.ocr_text),
                    },
                ))

                # If OCR found text, also run text verification on it
                if img_result.ocr_text and not text.strip():
                    verifier = _get_text_verifier()
                    ocr_text_result = verifier.verify(img_result.ocr_text)
                    if ocr_text_result.verdict != "Unverified":
                        fusion_input.text_score = (
                            1.0 - ocr_text_result.confidence
                            if ocr_text_result.verdict == "Verified"
                            else ocr_text_result.confidence
                        )
                        fusion_input.text_verdict = ocr_text_result.verdict

            except Exception as e:
                logger.error(f"Image processing failed: {e}")
                suspicious_signals.append(f"Image analysis failed: {str(e)}")

        # ── VIDEO ──
        if video is not None:
            try:
                with tempfile.NamedTemporaryFile(
                    suffix=".mp4", delete=False
                ) as tmp:
                    tmp.write(await video.read())
                    tmp_path = tmp.name

                # Extract frames
                frames = ingest.extract_frames(tmp_path, fps=1.0, max_frames=20)
                audio_arr, audio_sr = ingest.extract_audio(tmp_path)

                # Video analysis
                if frames:
                    detector = _get_video_detector()
                    vid_result = detector.analyze_video(frames)
                    fusion_input.video_score = vid_result.confidence

                    modality_scores.append(ModalityScore(
                        modality="video", score=vid_result.confidence,
                        details={
                            "is_deepfake": vid_result.is_deepfake,
                            "frames_analyzed": vid_result.num_frames_analyzed,
                            "suspicious_frames": vid_result.suspicious_frames,
                        },
                    ))

                # Audio from video
                if audio_arr is not None:
                    audio_det = _get_audio_detector()
                    aud_result = audio_det.analyze_audio(audio_arr, audio_sr)
                    fusion_input.audio_score = aud_result.confidence

                    modality_scores.append(ModalityScore(
                        modality="audio", score=aud_result.confidence,
                        details={
                            "is_spoofed": aud_result.is_spoofed,
                            "duration_seconds": aud_result.duration_seconds,
                        },
                    ))

                # Cleanup
                Path(tmp_path).unlink(missing_ok=True)

            except Exception as e:
                logger.error(f"Video processing failed: {e}")
                suspicious_signals.append(f"Video analysis failed: {str(e)}")

        # ── AUDIO (standalone) ──
        if audio is not None:
            try:
                with tempfile.NamedTemporaryFile(
                    suffix=".wav", delete=False
                ) as tmp:
                    tmp.write(await audio.read())
                    tmp_path = tmp.name

                audio_arr, audio_sr = ingest.extract_audio(tmp_path)
                if audio_arr is not None:
                    audio_det = _get_audio_detector()
                    aud_result = audio_det.analyze_audio(audio_arr, audio_sr)
                    fusion_input.audio_score = aud_result.confidence

                    modality_scores.append(ModalityScore(
                        modality="audio", score=aud_result.confidence,
                        details={
                            "is_spoofed": aud_result.is_spoofed,
                            "duration_seconds": aud_result.duration_seconds,
                        },
                    ))

                Path(tmp_path).unlink(missing_ok=True)

            except Exception as e:
                logger.error(f"Audio processing failed: {e}")
                suspicious_signals.append(f"Audio analysis failed: {str(e)}")

        # ── FUSION ──
        fusion_input.suspicious_signals = suspicious_signals
        fusion_result = fusion.fuse(fusion_input)

        elapsed_ms = (time.time() - start_time) * 1000

        return VerificationResponse(
            verdict=fusion_result.verdict,
            confidence=fusion_result.confidence,
            fake_probability=fusion_result.fake_probability,
            explanation=fusion_result.explanation,
            evidence=all_evidence,
            modality_scores=modality_scores,
            suspicious_signals=suspicious_signals,
            detected_language=language,
            original_text=text,
            normalized_text=ingest.normalize_text(text) if text else "",
            processing_time_ms=elapsed_ms,
        )

    except Exception as e:
        logger.error(f"Multi-modal verification failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
