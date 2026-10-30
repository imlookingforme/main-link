"""
main-link Detection Pipeline — FastAPI Application
====================================================
Multi-modal misinformation & deepfake detection.
"""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from loguru import logger

from app.config import get_settings
from app.routers.verify import router as verify_router

# ── App Setup ──
settings = get_settings()

app = FastAPI(
    title="main-link Detection Pipeline",
    description=(
        "Multi-modal misinformation & deepfake detection system. "
        "Verifies text claims against official Indian government sources, "
        "detects deepfake video/audio, and analyzes pamphlet/image authenticity."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static Files ──
static_dir = Path(__file__).parent.parent / "static"
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# ── Routers ──
app.include_router(verify_router)

# ── Upload Directory ──
upload_dir = Path(settings.upload_dir)
upload_dir.mkdir(parents=True, exist_ok=True)


@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the web UI."""
    template_path = Path(__file__).parent.parent / "templates" / "index.html"
    if template_path.exists():
        return template_path.read_text(encoding="utf-8")
    return """
    <html>
    <head><title>main-link Detection Pipeline</title></head>
    <body style="font-family: sans-serif; padding: 40px; background: #0f172a; color: white;">
        <h1>🛡️ main-link Detection Pipeline</h1>
        <p>API is running. Visit <a href="/docs" style="color: #38bdf8;">/docs</a> for the API documentation.</p>
        <p>Visit <a href="/app" style="color: #38bdf8;">/app</a> for the web interface.</p>
    </body>
    </html>
    """


@app.get("/app", response_class=HTMLResponse)
async def web_app():
    """Serve the full web application UI."""
    template_path = Path(__file__).parent.parent / "templates" / "index.html"
    if template_path.exists():
        return template_path.read_text(encoding="utf-8")
    return """<html><body><h1>UI not found</h1><p>Run the build first.</p></body></html>"""


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    logger.info("=" * 60)
    logger.info("main-link Detection Pipeline — Starting")
    logger.info("=" * 60)

    # Ensure directories exist
    Path(settings.knowledge_base_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)

    logger.info(f"Knowledge base dir: {settings.knowledge_base_dir}")
    logger.info(f"Upload dir: {settings.upload_dir}")
    logger.info(f"FAISS index path: {settings.faiss_index_path}")
    logger.info("Startup complete — models will load lazily on first request")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        workers=settings.workers,
        reload=True,
    )
