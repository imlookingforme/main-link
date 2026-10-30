# main-link Detection Pipeline v2.0

**Multi-Modal Forensic & Deepfake Engine with Autonomous Scheme Execution**

> FORGE 48-Hour Build-a-thon · Zero dummy data · Real Hugging Face Ensembles & Playwright Automation

## Architecture

```
[Viral Social Post / WhatsApp Forward / Video / Flyer]
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│ STAGE 1: Multimodal Ingestion & Provenance Extraction    │
│ • OpenCV / FFmpeg (1-2 FPS Frame & 16kHz Audio Sample)   │
│ • EasyOCR / PaddleOCR (Flyer Text) + ZXing QR Scanner    │
│ • Heuristic Whitelist Validator (.gov.in vs Scam TLDs)   │
└──────────────────┬───────────────────────────────────────┘
                   │
       ┌───────────┴───────────┐
       ▼                       ▼
┌──────────────────────┐ ┌─────────────────────────────────┐
│ STAGE 2: Deepfake    │ │ STAGE 3: RAG + Knowledge Base   │
│ Forensic Pipeline    │ │ Fact-Verification Engine        │
│ • ViT FaceForensics++│ │ • BGE Embeddings Registry Match │
│ • Wav2Vec2 Audio     │ │ • DeBERTa-v3 FEVER NLI          │
│ • SDXL Latent Audit  │ │ • UPI Scam & Fee Guardrails     │
└──────┬───────────────┘ └─────┬───────────────────────────┘
       └───────────┬───────────┘
                   ▼
┌──────────────────────────────────────────────────────────┐
│ STAGE 4: Trust Score Aggregator & "Cute" Mascot Chatbot  │
│ • "Civic Mitra" Avatar: Translates legal/ML jargon       │
│ • If FAKE: Exposes fee extortion & PIB warning           │
│ • If TRUE: Unlocks verified portal & "One-Click Apply"   │
└──────────────────┬───────────────────────────────────────┘
                   │ (Citizen clicks "One-Click Apply")
                   ▼
┌──────────────────────────────────────────────────────────┐
│ STAGE 5: Playwright Bureaucracy Execution Agent          │
│ • Headless Chromium sandbox + SSL Certificate validation │
│ • DigiLocker / Encrypted Vault Credential Injection      │
│ • WebSocket Live Status Broadcaster (/ws/apply/{id})     │
│ • Human-in-the-loop OTP verification + Signed Receipt    │
└──────────────────────────────────────────────────────────┘
```

## Key Models & Hugging Face Ensemble

| Subsystem | Model ID | Role |
|---|---|---|
| **Fact-Verification NLI** | `MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli` | Entailment vs. Contradiction against official gazettes |
| **Visual Deepfake Detection** | `HrutikAdsare/deepfake-detector-faceforensics` | ViT-base-patch16-224 fine-tuned on FaceForensics++ |
| **Voice Cloning / TTS Spoof** | `MelodyMachine/Deepfake-audio-detection-V2` | Wav2Vec2 synthetic audio artifact detection |
| **Multilingual RAG** | `BAAI/bge-small-en-v1.5` & `BAAI/bge-m3` | Cross-lingual embedding lookup for central schemes |
| **Browser Execution Agent** | `Playwright` (Chromium Context) | Auto-fills verified applications into .gov.in portals |

## Quick Start

### 1. Install Dependencies
```bash
cd detection-pipeline
pip install -r requirements.txt
playwright install chromium
```

### 2. Start the Server
```bash
python -m app.main
# Server runs on http://0.0.0.0:8000
```

### 3. Open the UI
Navigate to **`http://localhost:8000/app`** to interact with "Civic Mitra" and test claims.

### 4. Interactive API Documentation
Open **`http://localhost:8000/docs`** for the complete OpenAPI / Swagger specifications.

## Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/audit/comprehensive` | Full multimodal forensic audit (text, image, audio) |
| `POST` | `/api/verify/text` | Text NLI verification against official gazette registry |
| `POST` | `/api/verify/multimodal` | Multipart upload intake (text + media) |
| `WS` | `/api/ws/apply/{scheme_id}` | Playwright browser automation with live progress emitter |
| `GET` | `/api/health` | Service & model readiness status |
