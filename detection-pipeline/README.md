# main-link Detection Pipeline

**Multi-Modal Misinformation & Deepfake Detection System**

> FORGE 48-Hour Build-a-thon · Zero dummy data · All real models & live sources

## Architecture

```
WhatsApp/Telegram forward (text / image / video / audio)
        │
        ▼
 [0] Ingest + Router ──► language ID, OCR, ASR, frame/audio extraction
        │
   ┌────┴─────────────┬───────────────────┬──────────────────┐
   ▼                  ▼                   ▼                  ▼
 TEXT CLAIM       IMAGE/PAMPHLET      VIDEO FRAMES        AUDIO TRACK
 bge-m3 retrieve  OCR + domain        ViT deepfake        Wav2Vec2 spoof
 → DeBERTa NLI    + seal check        detection           detection
   │                  │                   │                  │
   └──────────┬───────┴───────────────────┴──────────────────┘
              ▼
      [5] Fusion layer (calibrated logistic)
              ▼
   Verdict: Verified / Scam-Fake / Unverified + evidence + confidence
              ▼
   Reply to user (web app / bot)
```

## Phases Implemented

| Phase | Component | Status |
|-------|-----------|--------|
| 1 | Knowledge Base (bge-m3 + FAISS + BM25 hybrid) | ✅ |
| 2 | Text Verification (DeBERTa NLI + threshold tuning) | ✅ |
| 3 | Video Deepfake (ViT + LoRA-ready) | ✅ |
| 3 | Audio Spoof (Wav2Vec2 + LoRA-ready) | ✅ |
| 3 | Image/Pamphlet (OCR + domain/seal check + AI detection) | ✅ |
| 4 | Fusion Layer (calibrated logistic regression) | ✅ |
| 5 | FastAPI + Web UI | ✅ |
| 6 | Gold Set Evaluation (15 hand-labeled claims) | ✅ |

## Quick Start

### 1. Install dependencies
```bash
cd detection-pipeline
pip install -r requirements.txt
```

### 2. Build the knowledge base
```bash
python scripts/build_kb.py
```

### 3. Start the server
```bash
python -m app.main
# or
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Open the UI
Navigate to `http://localhost:8000/app`

### 5. Run evaluation
```bash
python scripts/evaluate.py
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/verify/text` | Text-only claim verification |
| `POST` | `/api/verify/multimodal` | Multi-modal (text + image/video/audio) |
| `GET` | `/api/health` | Health check + KB status |
| `GET` | `/api/kb/status` | Knowledge base details |
| `POST` | `/api/kb/build` | Trigger KB rebuild |
| `GET` | `/docs` | Swagger API documentation |

## Project Structure

```
detection-pipeline/
├── app/
│   ├── __init__.py
│   ├── config.py            # Settings from .env
│   ├── main.py              # FastAPI application
│   ├── models/
│   │   └── schemas.py       # Pydantic request/response models
│   ├── routers/
│   │   └── verify.py        # API endpoints
│   └── services/
│       ├── ingest.py         # [Phase 0] Ingest + Router
│       ├── knowledge_base.py # [Phase 1] KB builder (scrape, chunk, embed, index)
│       ├── text_verifier.py  # [Phase 2] Text NLI verification
│       ├── deepfake_detector.py # [Phase 3] Video/Audio/Image detection
│       └── fusion.py         # [Phase 4] Calibrated logistic fusion
├── scripts/
│   ├── build_kb.py           # Build knowledge base
│   └── evaluate.py           # [Phase 6] Gold set evaluation
├── templates/
│   └── index.html            # Web UI
├── knowledge_base/           # Stored documents + FAISS index
├── requirements.txt
├── .env                      # Configuration (not committed)
└── .gitignore
```

## Key Design Decisions

### Hybrid Retrieval
`s(q,d) = λ·cos(e_q, e_d) + (1-λ)·BM25(q,d)` with λ ≈ 0.7

Dense embeddings (bge-m3, 1024-d) capture semantic similarity, while BM25 catches exact keyword matches. Critical for Indian government scheme names.

### NLI Verdict Aggregation
```
Verified:   max_i p_i^E > τ_E (default 0.75)
Fake/Scam:  max_i p_i^C > τ_C (default 0.80)
Unverified: otherwise
```

τ_C is set higher than τ_E because a false "Fake" on a real scheme is more harmful.

### Calibrated Fusion
`P(fake | s) = σ(w₀ + Σ wₘ · logit(sₘ))`

Fitted via logistic regression with isotonic calibration. "87% fake" should be right ~87% of the time.

### Graceful Degradation
All models load lazily. If a model is unavailable, that modality returns 0.5 (uncertain) rather than crashing.

## Models Used

| Model | Purpose | License |
|-------|---------|---------|
| `BAAI/bge-m3` | Text embeddings (1024-d) | MIT |
| `microsoft/deberta-v3-large-mnli` | Natural Language Inference | MIT |
| `google/vit-base-patch16-224` | Video frame classification | Apache-2.0 |
| `facebook/wav2vec2-base` | Audio feature extraction | MIT |
| `facebook/fasttext-language-identification` | Language detection | CC-BY-SA-3.0 |

## Data Sources

- **myScheme.gov.in** — Official government scheme details
- **PIB Fact Check** — Press Information Bureau fact-checks
- **PIB Press Releases** — Government press releases
- **Seed data** — 8 curated real scheme descriptions with known scam patterns
- **Gold set** — 15 hand-labeled viral claims for evaluation

## Environment Variables

See `.env` for all configurable parameters including model paths, thresholds, and API keys.
