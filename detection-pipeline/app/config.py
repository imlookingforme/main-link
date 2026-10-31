"""
Configuration — loads .env and provides typed settings via pydantic.
"""
from __future__ import annotations

import os
from pathlib import Path
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load .env relative to this file's parent (detection-pipeline/)
_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_ENV_PATH)

import base64
_raw_key = os.getenv("GEMINI_API_KEY") or os.getenv("AI_API_KEY") or ""
if _raw_key.startswith("base64:"):
    try:
        os.environ["GEMINI_API_KEY"] = base64.b64decode(_raw_key[7:]).decode("utf-8")
    except Exception:
        pass


class Settings(BaseSettings):
    """Application settings — sourced from environment / .env."""

    # ── API Keys ──
    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")

    # ── Vector DB ──
    qdrant_url: str = Field(default="", alias="QDRANT_URL")
    qdrant_api_key: str = Field(default="", alias="QDRANT_API_KEY")
    faiss_index_path: str = Field(
        default="./knowledge_base/faiss_index", alias="FAISS_INDEX_PATH"
    )

    # ── Models ──
    embedding_model: str = Field(default="BAAI/bge-m3", alias="EMBEDDING_MODEL")
    nli_model: str = Field(
        default="microsoft/deberta-v3-large-mnli", alias="NLI_MODEL"
    )
    deepfake_video_model: str = Field(
        default="google/vit-base-patch16-224", alias="DEEPFAKE_VIDEO_MODEL"
    )
    deepfake_audio_model: str = Field(
        default="facebook/wav2vec2-base", alias="DEEPFAKE_AUDIO_MODEL"
    )
    language_id_model: str = Field(
        default="facebook/fasttext-language-identification",
        alias="LANGUAGE_ID_MODEL",
    )

    # ── Thresholds ──
    tau_entailment: float = Field(default=0.75, alias="TAU_ENTAILMENT")
    tau_contradiction: float = Field(default=0.80, alias="TAU_CONTRADICTION")
    hybrid_lambda: float = Field(default=0.7, alias="HYBRID_LAMBDA")
    retrieval_top_k: int = Field(default=5, alias="RETRIEVAL_TOP_K")

    # ── Server ──
    host: str = Field(default="0.0.0.0", alias="HOST")
    port: int = Field(default=8000, alias="PORT")
    workers: int = Field(default=1, alias="WORKERS")

    # ── Telegram ──
    telegram_bot_token: str = Field(default="", alias="TELEGRAM_BOT_TOKEN")

    # ── WhatsApp ──
    whatsapp_token: str = Field(default="", alias="WHATSAPP_TOKEN")
    whatsapp_phone_number_id: str = Field(
        default="", alias="WHATSAPP_PHONE_NUMBER_ID"
    )
    whatsapp_verify_token: str = Field(default="", alias="WHATSAPP_VERIFY_TOKEN")

    # ── MongoDB Atlas ──
    mongodb_uri: str = Field(default="", alias="MONGODB_URI")
    mongodb_db: str = Field(default="mainlink_db", alias="MONGODB_DB")

    # ── Paths ──
    knowledge_base_dir: str = Field(
        default="./knowledge_base", alias="KNOWLEDGE_BASE_DIR"
    )
    upload_dir: str = Field(default="./uploads", alias="UPLOAD_DIR")

    class Config:
        env_file = ".env"
        populate_by_name = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
