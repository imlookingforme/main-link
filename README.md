# 🏛️ main-link
### Transparent Civic Grievance Triage & Multi-Modal Misinformation Detection Platform
**Built for the FORGE 48-Hour Build-a-thon**  
*Track: Civic Pulse, Digital Governance, Fact-Checking & Public Information*

---

## 🌟 Overview
**main-link** is a dual-engine civic intelligence platform designed for citizen empowerment and public trust:
1. **Civic Grievance Triage Engine (`/server` & `/client`):** Transforms citizen multimodal reports (photos of potholes/broken infrastructure, policy circular PDFs, CSV bulk logs, voice, and text) into verified, severity-ranked municipal tickets backed by real-time weather and air-quality telemetry, live MongoDB Atlas persistence, and an interactive Gemini AI Civic Agent.
2. **Misinformation & Deepfake Verification Pipeline (`/detection-pipeline`):** Ingests WhatsApp/Telegram forwards across text, pamphlets/images, video frames, and voice notes. It performs hybrid vector retrieval (`bge-m3` + BM25) over official Indian gazettes/schemes, DeBERTa Natural Language Inference, ViT deepfake video detection, Wav2Vec2 audio spoof detection, and calibrated logistic fusion with verifiable citations.

### 🛡️ Tiered Civic Governance Rule:
- 🟢 **Authorized Google Citizens:** Anyone with a verified Google account can report **localized maintenance hazards** (potholes, open drains, garbage overflow, water leaks, broken streetlights, toxic smoke).
- 🟠 **Government Officials (GRO):** Authorized for all maintenance grievances + **Macro Capital Infrastructure Proposals** (e.g. **New Flyovers**, Expressways, Highway expansions, Major Bridge construction) + official **Redressal Console** (Action Taken Reports & status updates).

---

## 🚀 Live Data & Real-Time APIs (Zero Mock Data)
In strict compliance with Hackathon Rule 4 & 7a, **zero mock data or static JSON files exist**:
1. **Open-Meteo Weather API:** Real-time temperature, precipitation, and wind speed.
2. **Open-Meteo Air Quality API:** Real-time PM2.5, PM10, and European AQI.
3. **OpenStreetMap Nominatim API:** Live reverse-geocoding of coordinates to municipal ward, street, and city.
4. **Google Gemini 2.5 Flash:** Multimodal vision & text analysis with cross-verification against live weather/AQI telemetry.
5. **MongoDB Atlas:** Real-time database persistence and dynamic aggregation.
6. **FlagEmbedding / BAAI bge-m3 & DeBERTa NLI:** Semantic vector search against verified Indian government sources (`myScheme.gov.in`, `factcheck.pib.gov.in`).

---

## 🏗️ System Architecture
```
main-link/
├── client/              # React 18, Vite, Tailwind CSS v3 (Indian Tricolor dark theme), Recharts
│   ├── src/
│   │   ├── App.jsx      # Unified reactive command dashboard
│   │   └── main.jsx
│   └── package.json
├── server/              # Node.js, Express.js, Mongoose, Multer, @google/generative-ai, JWT
│   ├── models/Grievance.js
│   ├── services/aiAgent.js          # Gemini 2.5 Flash triage & contextual chat
│   ├── services/telemetryService.js  # Live Open-Meteo & Nominatim fetchers
│   ├── middleware/auth.js           # JWT Bearer token validator
│   ├── server.js                    # REST API endpoints & MongoDB connection
│   └── package.json
├── detection-pipeline/  # Python, FastAPI, HuggingFace, FAISS, PyMuPDF, EasyOCR
│   ├── app/
│   │   ├── services/
│   │   │   ├── ingest.py            # [Phase 0] Language ID, OCR, ASR, video extraction
│   │   │   ├── knowledge_base.py    # [Phase 1] Scraper, chunker, bge-m3 embedder, FAISS + BM25
│   │   │   ├── text_verifier.py     # [Phase 2] DeBERTa NLI premise-hypothesis engine
│   │   │   ├── deepfake_detector.py # [Phase 3] ViT video deepfake, Wav2Vec2 spoof, OCR domain check
│   │   │   └── fusion.py            # [Phase 4] Calibrated logistic regression fusion
│   │   ├── routers/verify.py        # [Phase 5] FastAPI REST endpoints
│   │   └── main.py                  # FastAPI app entry point
│   ├── templates/index.html         # Interactive web application for claim analysis
│   ├── scripts/build_kb.py          # Knowledge base build script
│   ├── scripts/evaluate.py          # [Phase 6] 15-claim gold-set evaluation runner
│   └── requirements.txt
├── specs.md             # Complete 10-section Application Specification
└── ARCHITECTURE_EXPLAINED.md  # Detailed judging viva guide & demo script
```

---

## ⚡ Quick Start

### 1. Civic Grievance Backend (`server/`)
```bash
cd server
npm install
npm run dev
```

### 2. Civic Grievance Frontend (`client/`)
```bash
cd client
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

### 3. Misinformation Detection Pipeline (`detection-pipeline/`)
```bash
cd detection-pipeline
pip install -r requirements.txt
# Build vector knowledge base
python scripts/build_kb.py
# Run FastAPI server and UI
python -m app.main
```
Open **`http://localhost:8000/app`** for the claim verification UI or **`http://localhost:8000/docs`** for OpenAPI documentation.

---

## 👥 Demo Credentials

| Role | Username / Email | Password | Clearance |
|---|---|---|---|
| **Verified Citizen** | `raghuram@gmail.com` | Google One-Click | Localized Hazards (Potholes, Water, Waste, Lights) |
| **Chief GRO (Nodal)** | `admin` | `forge2026` | Full Access + New Flyover / Capital Projects + Redressal |
| **Senior GRO (Works)** | `gro` | `redressal2026` | Full Access + Capital Projects + Redressal |
| **Field Inspector** | `inspector` | `inspector2026` | Triage & Field Verification |

*For custom municipal credentials, contact `anomalyinspector@gmail.com`.*
