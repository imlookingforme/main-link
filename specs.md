# main-link — Application Specification

> **FORGE 48-Hour Hackathon — Full Specification Document**

---

## 1. Project Name & Short Overview

**Project Name:** main-link

**Summary:** A Multimodal Civic Grievance Triage, Live Environmental Telemetry & Multilingual Policy Accountability Platform that turns citizen photos, PDFs, CSVs, and regional voice/text reports into geo-verified, severity-ranked municipal tickets backed by real-time weather/air-quality APIs and live MongoDB persistence.

main-link bridges the gap between citizens and municipal authorities by providing:
- **AI-powered intake** that accepts any format a citizen can provide (photos of road damage, scanned government circulars, bulk complaint spreadsheets, spoken grievances in regional languages)
- **Automated severity triage** via Gemini 2.5 Flash vision + text analysis, cross-referenced against live environmental conditions
- **Public accountability** through a real-time dashboard where every ticket, SLA timer, and status change is visible — no black boxes

---

## 2. Problem Statement

Citizens across India struggle to report localized infrastructure failures — damaged roads, water leaks, illegal dumping, severe air pollution episodes — or understand their municipal SLA rights across language barriers. Meanwhile:

- **Municipal authorities** are overwhelmed by unstructured, unverified complaints flooding in through phone calls, handwritten letters, and fragmented portals.
- **No severity triage** exists to tell officials whether a complaint is a minor crack in the pavement or a collapsing bridge.
- **No environmental context** accompanies reports — a flooding complaint during clear weather might be fraudulent, while one during heavy rainfall is urgent.
- **Zero public accountability** — existing portals act as black boxes where complaints enter and may never emerge.
- **Language barriers** prevent non-English-speaking citizens from navigating digital portals or understanding their civic rights under government welfare schemes.

**main-link solves this** by automating ingestion, enriching every report with live telemetry, triaging with AI, and exposing a fully transparent public dashboard.

---

## 3. Target Users & User Journey

### 3.1 Citizens
| Step | Action |
|------|--------|
| 1 | Open the main-link web app |
| 2 | Grant GPS location access (or use default Hyderabad coordinates) |
| 3 | See the **Live Telemetry Bar** displaying current temperature, precipitation, wind, PM2.5, PM10, AQI for their location |
| 4 | **Upload** a photo of road damage (PNG/JPG), a scanned municipal circular (PDF), a bulk grievance log (CSV), type a complaint as text, or speak a grievance using the voice microphone |
| 5 | Select preferred language: English, Hindi, or Telugu |
| 6 | Click **Submit** |
| 7 | View the AI-generated triage result: severity score (1-10), urgency level, department routing, SLA deadline, bilingual citizen explainer, and authenticity check |
| 8 | See the grievance appear on the live dashboard with its SLA timer counting down |
| 9 | Use the **AI Chat Panel** to ask questions about civic rights, government schemes, or ward-level statistics |

### 3.2 Municipal Officials
| Step | Action |
|------|--------|
| 1 | Click **Official Login** on the header bar |
| 2 | Enter admin credentials → receive JWT token |
| 3 | View the real-time **Public Accountability Dashboard** — all grievances, analytics, and SLA compliance metrics |
| 4 | Click a grievance's status dropdown to update it: `Pending → Triaged → In Progress → Resolved` |
| 5 | Delete fraudulent or duplicate grievances |
| 6 | Audit overdue grievances (SLA timer exceeded) |

### 3.3 Public Auditors
| Step | Action |
|------|--------|
| 1 | Open the AI Chat Panel |
| 2 | Query the AI Civic Agent for ward-level statistics ("Which ward has the most pending grievances?") |
| 3 | Ask about SLA compliance ("What percentage of road complaints were resolved within SLA?") |
| 4 | Request policy explanations in Hindi or Telugu ("PM Awas Yojana ke baare mein batao") |

---

## 4. Core Features

### 4.1 Multimodal Grievance & Policy Ingestion
- Accepts **PNG/JPG** (infrastructure damage photos — processed via Gemini Vision)
- Accepts **PDF** (government circulars/notifications — text extracted via `pdf-parse`, then analyzed by Gemini)
- Accepts **CSV** (bulk grievance logs — parsed row-by-row via `csv-parser`, batch-triaged by Gemini)
- Accepts **Text** (typed complaints — directly sent to Gemini for triage)
- Accepts **Voice** (Web Speech API with multilingual recognition in English, Hindi, Telugu — transcribed text sent to Gemini)

### 4.2 Live API Context Enrichment
- **Zero mock data** — every grievance is enriched with real-time telemetry at submission time
- Open-Meteo Weather API: Temperature, humidity, precipitation, rain, wind speed
- Open-Meteo Air Quality API: PM2.5, PM10, CO, NO₂, European AQI
- OpenStreetMap Nominatim: Reverse geocoding for human-readable address and ward name
- All telemetry is stored alongside the grievance in MongoDB for historical audit

### 4.3 AI Vision Triage & Department Routing
- Gemini 2.5 Flash with **temperature 0.15** for deterministic, schema-compliant JSON output
- Strict `responseSchema` enforcement — AI cannot hallucinate fields or values
- Cross-verification: AI compares citizen report against live telemetry (e.g., flooding claim during zero precipitation → "Needs Field Inspection")
- Outputs: title, category, severity (1-10), urgency level, department, SLA hours, technical analysis, bilingual citizen explainer, authenticity check

### 4.4 Public Accountability Dashboard
- **Live MongoDB-backed** charts and metrics — no static/hardcoded data
- 4 KPI cards: Active Grievances, Critical Count, Average Severity, SLA Compliance %
- BarChart showing category breakdown (Recharts)
- PieChart showing urgency distribution (Recharts)
- Filterable, sortable grievance feed with SLA countdown timers
- **30-second auto-polling** keeps dashboard current without manual refresh

### 4.5 Multilingual Civic Rights & Audit AI Agent
- Contextual Q&A grounded in **live database records** — never invents statistics
- System prompt enforces data-only answers: "If asked about data not in the provided context, say 'I don't have that data in the current live database.'"
- Supports English, Hindi, and Telugu responses
- Can explain government welfare schemes, SLA rights, and municipal responsibilities
- **Temperature 0.4** for balanced helpfulness while maintaining factual grounding

### 4.6 JWT-Protected Official Status Updates
- Admin login with credentials stored in `.env`
- JWT token issued with 24-hour expiry
- Bearer token required for `PATCH /status` and `DELETE` endpoints
- Auth middleware validates and decodes token, attaching user info to request

---

## 5. Multimodal Input & Output Specifications

### 5.1 Inputs

| Input Type | Format | Max Size | Processing Pipeline |
|-----------|--------|----------|-------------------|
| Infrastructure photos | PNG, JPG, JPEG | 10 MB | Multer → Base64 encode → Gemini Vision `inlineData` |
| Government circulars | PDF | 10 MB | Multer → `pdf-parse` text extraction → Gemini text analysis |
| Bulk grievance logs | CSV | 10 MB | Multer → `csv-parser` row parsing → Batch Gemini analysis (10 rows/batch) |
| Typed complaints | Plain text | N/A (JSON body) | Direct text → Gemini analysis |
| Spoken grievances | Web Speech API audio | N/A (browser-side) | Browser speech recognition → transcript text → Gemini analysis |
| GPS coordinates | `navigator.geolocation` | N/A | Lat/lon sent with every submission for telemetry enrichment |

### 5.2 Outputs

Every submission produces a structured JSON triage result with the following fields:

```json
{
  "title": "Severe pothole on NH-65 near Kondapur junction",
  "category": "Roads & Bridges",
  "severityScore": 8,
  "urgencyLevel": "Critical",
  "department": "Roads & Buildings Department",
  "slaHours": 24,
  "aiAnalysisSummary": "Deep pothole approximately 2ft wide visible on main carriageway. Risk of vehicle damage and accidents. Current precipitation (12mm) may worsen erosion. Immediate barricading recommended.",
  "citizenExplainer": "Your complaint about a dangerous pothole has been registered as CRITICAL priority. The Roads & Buildings Department must respond within 24 hours. | आपकी शिकायत गंभीर श्रेणी में दर्ज की गई है। सड़क विभाग को 24 घंटे के भीतर कार्रवाई करनी होगी।",
  "authenticityCheck": "Verified Consistent"
}
```

This JSON is persisted in MongoDB alongside live telemetry data, GPS coordinates, and timestamps — then rendered on the dashboard.

---

## 6. Live Data & External API Integration Plan

### 6.1 Open-Meteo Weather API

| Property | Value |
|----------|-------|
| **Endpoint** | `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m` |
| **Auth** | None (free, no API key) |
| **Rate Limit** | 10,000 requests/day |
| **Data Returned** | `temperature_2m` (°C), `relative_humidity_2m` (%), `precipitation` (mm), `rain` (mm), `wind_speed_10m` (km/h) |
| **Called When** | Every grievance submission + every telemetry poll |
| **Failure Handling** | Returns `null` values; AI analysis continues without weather context |

### 6.2 Open-Meteo Air Quality API

| Property | Value |
|----------|-------|
| **Endpoint** | `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,european_aqi` |
| **Auth** | None (free, no API key) |
| **Data Returned** | `pm10` (µg/m³), `pm2_5` (µg/m³), `carbon_monoxide` (µg/m³), `nitrogen_dioxide` (µg/m³), `european_aqi` (index) |
| **Called When** | Every grievance submission + every telemetry poll |
| **Failure Handling** | Returns `null` values; AI analysis continues without AQI context |

### 6.3 OpenStreetMap Nominatim Reverse Geocoding

| Property | Value |
|----------|-------|
| **Endpoint** | `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}` |
| **Auth** | None (requires `User-Agent` header: `main-linkAI-ForgeHackathon/1.0`) |
| **Data Returned** | `display_name` (full address string), `address.suburb` / `address.neighbourhood` / `address.city_district` (ward extraction) |
| **Called When** | Every grievance submission |
| **Failure Handling** | Returns empty string; grievance stored without address but with raw lat/lon |

### 6.4 MongoDB Atlas

| Property | Value |
|----------|-------|
| **Connection** | `MONGODB_URI` from `.env` → Mongoose with 5-retry connection logic |
| **Database** | `main-link` |
| **Collection** | `grievances` |
| **Purpose** | Live persistence for all grievances, analytics queries, AI chat context |
| **Zero Mock Data** | No seed files, no static JSON — all documents created through the app's API |

### 6.5 Google Gemini 2.5 Flash

| Property | Value |
|----------|-------|
| **SDK** | `@google/generative-ai` v0.24+ |
| **Model** | `gemini-2.5-flash` (configurable via `AI_MODEL` env var) |
| **Extraction Config** | Temperature: `0.15`, `responseMimeType: "application/json"`, strict `responseSchema` |
| **Chat Config** | Temperature: `0.4`, free-form text response, system instruction enforces data grounding |
| **Auth** | `AI_API_KEY` from `.env` |

---

## 7. Database Schema Design

### Grievance Collection (`grievances`)

```javascript
{
  // Core Triage Fields
  title:              { type: String, required: true },
  description:        { type: String },
  category:           { type: String, enum: [
                          "Roads & Bridges",
                          "Water & Drainage",
                          "Sanitation & Waste",
                          "Air & Pollution",
                          "Electrical & Streetlights",
                          "Public Policy & Welfare"
                        ], required: true },
  severityScore:      { type: Number, min: 1, max: 10, required: true },
  urgencyLevel:       { type: String, enum: ["Low", "Medium", "High", "Critical"], required: true },
  department:         { type: String, required: true },
  slaHours:           { type: Number, required: true },
  status:             { type: String, enum: ["Pending", "Triaged", "In Progress", "Resolved"], default: "Pending" },

  // Location (GPS + Reverse Geocoding)
  location: {
    lat:              { type: Number },
    lon:              { type: Number },
    address:          { type: String },
    ward:             { type: String },
  },

  // Live Environmental Telemetry (snapshot at submission time)
  liveTelemetry: {
    temperature:      { type: Number },       // °C
    precipitation:    { type: Number },       // mm
    pm2_5:            { type: Number },       // µg/m³
    pm10:             { type: Number },       // µg/m³
    nitrogen_dioxide: { type: Number },       // µg/m³
    carbon_monoxide:  { type: Number },       // µg/m³
    european_aqi:     { type: Number },       // Index
    humidity:         { type: Number },       // %
    wind_speed:       { type: Number },       // km/h
    fetchedAt:        { type: Date },
  },

  // AI Analysis
  aiAnalysisSummary:  { type: String },       // Technical summary for officials
  citizenExplainer:   { type: String },       // Bilingual plain-language explainer
  authenticityCheck:  { type: String, enum: ["Verified Consistent", "Needs Field Inspection"] },

  // Metadata
  sourceFileType:     { type: String, enum: ["image", "pdf", "csv", "text", "voice"] },
  preferredLanguage:  { type: String, default: "English" },

  // Mongoose automatic timestamps
  createdAt:          { type: Date },
  updatedAt:          { type: Date },
}
```

---

## 8. Backend API Endpoints

### 8.1 Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/login` | None | Validates `username` and `password` against `ADMIN_USER` / `ADMIN_PASS` env vars. Returns `{ token, message }`. Token expires in 24 hours. |

### 8.2 Grievances

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/grievances` | None | Returns all grievances (sorted newest-first) plus computed analytics: `totalActive`, `criticalCount`, `averageSeverity`, `slaCompliance`, `categoryBreakdown`, `urgencyBreakdown`. |
| `POST` | `/api/grievances/extract` | None | Multimodal extraction endpoint. Accepts `multipart/form-data` with optional `file` (PNG/JPG/PDF/CSV), `text`, `lat`, `lon`, `preferredLanguage`. Fetches live telemetry → sends to Gemini → saves to MongoDB → returns created grievance(s). |
| `PATCH` | `/api/grievances/:id/status` | JWT Bearer | Updates grievance status. Body: `{ status: "Pending" | "Triaged" | "In Progress" | "Resolved" }`. |
| `DELETE` | `/api/grievances/:id` | JWT Bearer | Permanently deletes a grievance document. |

### 8.3 Telemetry

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/telemetry/live?lat=...&lon=...` | None | Fetches and returns real-time weather, air quality, and geocoding data for the specified coordinates. |

### 8.4 AI Chat

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/ai/chat` | None | Contextual Q&A endpoint. Body: `{ question, preferredLanguage, lat, lon }`. Fetches all grievances from MongoDB + current telemetry → sends to Gemini as context → returns AI reply grounded in live data. |

---

## 9. Technology Stack

### 9.1 Frontend (`/client`)

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.3 | Component-based UI framework |
| Vite | 6.0 | Build tool & dev server with HMR |
| Tailwind CSS | 3.4 | Utility-first CSS framework |
| Lucide React | 0.454 | Icon library (SVG-based) |
| Axios | 1.7 | HTTP client for API calls |
| Recharts | 2.13 | Data visualization (BarChart, PieChart) |
| Web Speech API | Native | Browser-native speech recognition (multilingual) |
| Geolocation API | Native | Browser-native GPS coordinates |

### 9.2 Backend (`/server`)

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 18+ | JavaScript runtime |
| Express.js | 4.21 | HTTP server framework |
| Mongoose | 8.8 | MongoDB ODM with schema validation |
| Multer | 1.4.5 | Multipart file upload handling (memory storage) |
| pdf-parse | 1.1.1 | PDF text extraction |
| csv-parser | 3.0 | CSV streaming parser |
| @google/generative-ai | 0.24 | Gemini 2.5 Flash SDK |
| jsonwebtoken | 9.0.2 | JWT generation and verification |
| dotenv | 16.4.5 | Environment variable loading |
| cors | 2.8.5 | Cross-origin request handling |

### 9.3 Infrastructure

| Service | Purpose |
|---------|---------|
| MongoDB Atlas | Cloud-hosted database (free tier) |
| Open-Meteo | Free weather + air quality APIs (no key required) |
| Nominatim OSM | Free reverse geocoding (no key required) |
| Google AI Studio | Gemini 2.5 Flash API key |

---

## 10. UI/UX Layout & Verification Checklist

### 10.1 Layout Specification

#### Theme
- **Indian tricolor** theme: Saffron (`#FF9933`), White, Green (`#138808`) accents on a dark slate (`#0f172a`) background
- Card backgrounds: `#1e293b` with `#334155` borders
- Navy blue (`#000080`) for header accents
- Custom dark-themed scrollbars

#### Header Bar
- Full-width gradient bar (saffron-to-green)
- App title: **main-link** with 🏛️ icon
- Tagline: "Multimodal Civic Grievance Triage Platform"
- **Official Login** button (top-right)

#### Live Telemetry Bar
- Horizontal bar below header
- Displays real-time metrics: Temperature (°C), Precipitation (mm), Wind Speed (km/h), PM2.5 (µg/m³), PM10 (µg/m³), European AQI, GPS Location
- Color-coded severity indicators (green → yellow → red based on thresholds)
- Auto-refreshes every 30 seconds

#### Multimodal Upload Zone
- Drag-and-drop file upload area with browse button
- Supported formats shown: PNG, JPG, PDF, CSV
- Text area for typed complaints
- Voice microphone button with language selector dropdown (English / Hindi / Telugu)
- GPS coordinate display with "Use My Location" button
- **Submit** button with loading spinner

#### Analytics Grid
- 4 KPI cards in a responsive grid:
  - Active Grievances (count)
  - Critical Issues (count, pulsing red if > 0)
  - Average Severity (score out of 10)
  - SLA Compliance (percentage)
- **BarChart**: Category breakdown (6 categories)
- **PieChart**: Urgency distribution (Low / Medium / High / Critical)

#### Triage Feed
- Scrollable list of grievance cards
- Each card shows: title, category badge, severity score, urgency badge, department, SLA countdown timer, status dropdown, delete button (authenticated only)
- Filterable by category, urgency, status
- Sortable by severity, date, SLA remaining

#### AI Chat Panel
- Bottom-anchored expandable panel
- Chat input with send button
- Language selector (mirrors upload zone)
- Suggested questions: "Which department has the most issues?", "What is the SLA compliance rate?", "Tell me about PM Awas Yojana in Telugu"
- Message bubbles with markdown rendering

### 10.2 Verification Checklist

| # | Requirement | How Verified |
|---|-------------|-------------|
| 1 | **Zero mock data** | Dashboard shows "No grievances found" on fresh start. All data comes from MongoDB queries. No seed files or static JSON. |
| 2 | **Live telemetry** | Telemetry bar shows real values from Open-Meteo APIs. Compare displayed values with manual API call. |
| 3 | **Multimodal ingestion** | Test with all 5 input types: photo, PDF, CSV, text, voice. Each produces a valid triage result. |
| 4 | **AI analysis accuracy** | Upload a known image (e.g., pothole) and verify severity, category, department are reasonable. |
| 5 | **Cross-verification** | Submit a flooding complaint during dry weather → AI should flag "Needs Field Inspection". |
| 6 | **Bilingual output** | Set language to Hindi or Telugu → `citizenExplainer` field contains both English and regional translation. |
| 7 | **JWT protection** | Attempt PATCH/DELETE without token → 401 error. Login → use token → success. |
| 8 | **SLA timer** | Create a grievance → verify SLA countdown displays correctly and tracks elapsed time. |
| 9 | **Graceful degradation** | Disconnect internet briefly → app shows null/N/A for telemetry instead of crashing. |
| 10 | **Responsive design** | Test on mobile viewport (375px) and desktop (1920px). Layout adapts gracefully. |
| 11 | **30s polling** | Dashboard auto-refreshes every 30 seconds without manual reload. |
| 12 | **CSV batch processing** | Upload a 20-row CSV → verify multiple grievances created (batched in groups of 10). |
| 13 | **AI chat grounding** | Ask the AI about data not in the database → it refuses to invent ("I don't have that data"). |
| 14 | **Environment variables** | All secrets (MongoDB URI, JWT secret, Gemini key) loaded from `.env`, not hardcoded. |
| 15 | **File size limit** | Upload a file > 10MB → get 413 error with clear message. |

---

*Document generated for the FORGE 48-Hour Hackathon — main-link Team*
