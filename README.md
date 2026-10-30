# 🏛️ main-link
### Transparent Civic Grievance Triage, Live Environmental Telemetry & Multilingual Policy Accountability Platform
**Built for the FORGE 48-Hour Build-a-thon**  
*Track: Civic Pulse, Digital Governance & Public Information*

---

## 🌟 Overview
**main-link** transforms citizen multimodal reports (photos of potholes/broken infrastructure, policy circular PDFs, CSV bulk logs, voice, and text) into verified, severity-ranked municipal tickets backed by real-time weather and air-quality telemetry, live MongoDB persistence, and an interactive AI Civic Agent.

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
├── specs.md             # Complete 10-section Application Specification
└── ARCHITECTURE_EXPLAINED.md  # Detailed judging viva guide & demo script
```

---

## ⚡ Quick Start

### 1. Backend Setup
```bash
cd server
npm install
```
Configure your `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/mainlink?retryWrites=true&w=majority
AI_API_KEY=your_gemini_api_key_here
AI_MODEL=gemini-2.5-flash
ADMIN_USER=admin
ADMIN_PASS=forge2026
JWT_SECRET=mainlink_forge_2026_super_secret_jwt_key
```
Start server:
```bash
npm run dev
```

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 👥 Demo Credentials

| Role | Username / Email | Password | Clearance |
|---|---|---|---|
| **Verified Citizen** | `raghuram@gmail.com` | Google One-Click | Localized Hazards (Potholes, Water, Waste, Lights) |
| **Chief GRO (Nodal)** | `admin` | `forge2026` | Full Access + New Flyover / Capital Projects + Redressal |
| **Senior GRO (Works)** | `gro` | `redressal2026` | Full Access + Capital Projects + Redressal |
| **Field Inspector** | `inspector` | `inspector2026` | Triage & Field Verification |

*For custom municipal credentials, contact `anomalyinspector@gmail.com`.*
