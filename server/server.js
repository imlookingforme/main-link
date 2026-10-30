require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const csv = require("csv-parser");
const { Readable } = require("stream");

const Grievance = require("./models/Grievance");
const telemetryService = require("./services/telemetryService");
const aiAgent = require("./services/aiAgent");
const auth = require("./middleware/auth");

// ---------------------------------------------------------------------------
// Startup checks
// ---------------------------------------------------------------------------
const requiredVars = ["MONGODB_URI", "JWT_SECRET", "ADMIN_USER", "ADMIN_PASS"];
for (const v of requiredVars) {
  if (!process.env[v]) {
    console.warn(`[WARN] Environment variable ${v} is not set.`);
  }
}
if (!process.env.AI_API_KEY || process.env.AI_API_KEY === "replace_me") {
  console.warn(
    "[WARN] AI_API_KEY is not configured — AI features will be unavailable."
  );
}

// ---------------------------------------------------------------------------
// MongoDB connection with retry
// ---------------------------------------------------------------------------
const MONGO_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mainlink";

async function connectMongo(retries = 5, delay = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(MONGO_URI);
      console.log("[MongoDB] Connected successfully.");
      return;
    } catch (err) {
      console.error(
        `[MongoDB] Connection attempt ${attempt}/${retries} failed: ${err.message}`
      );
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  console.error(
    "[MongoDB] All connection attempts failed. The server will start but database operations will fail."
  );
}

connectMongo();

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Multer setup — memory storage, 10 MB limit
// ---------------------------------------------------------------------------
const fileFilter = (_req, file, cb) => {
  const allowed = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "application/pdf",
    "text/csv",
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type. Allowed: png, jpg, jpeg, pdf, csv."));
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ---------------------------------------------------------------------------
// Helper: parse CSV buffer into rows
// ---------------------------------------------------------------------------
function parseCsvBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const rows = [];
    const stream = Readable.from(buffer.toString());
    stream
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", (err) => reject(err));
  });
}

// ---------------------------------------------------------------------------
// ROUTES
// ---------------------------------------------------------------------------

// ---- Grievance Redressal Authentication ----------------------------------
const REDRESSAL_OFFICERS = [
  {
    username: process.env.ADMIN_USER || "admin",
    email: "admin@main-link.gov.in",
    password: process.env.ADMIN_PASS || "forge2026",
    name: "Dr. K. S. Rao",
    role: "Chief Grievance Redressal Officer (Nodal)",
    department: "Municipal Administration & Urban Development",
    badgeNumber: "GRO-TS-001",
  },
  {
    username: "gro",
    email: "gro@main-link.gov.in",
    password: process.env.GRO_PASS || "redressal2026",
    name: "Smt. P. Lakshmi",
    role: "Senior Grievance Redressal Officer",
    department: "Public Works & Infrastructure Cell",
    badgeNumber: "GRO-TS-104",
  },
  {
    username: "inspector",
    email: "inspector@ghmc.gov.in",
    password: process.env.INSPECTOR_PASS || "inspector2026",
    name: "R. Vikram Singh",
    role: "Zonal Field Triage Inspector",
    department: "Sanitation & Environmental Protection",
    badgeNumber: "ZFI-GHMC-82",
  },
];

app.post("/api/auth/login", (req, res) => {
  try {
    const identifier = (req.body.username || req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";

    if (!identifier || !password) {
      return res.status(400).json({ error: "Officer ID / Email and password are required." });
    }

    const matchedOfficer = REDRESSAL_OFFICERS.find(
      (o) =>
        (o.username.toLowerCase() === identifier || o.email.toLowerCase() === identifier) &&
        o.password === password
    );

    if (!matchedOfficer) {
      return res.status(401).json({
        error: "Invalid Grievance Redressal Officer credentials. If you are an authorized officer, contact anomalyinspector@gmail.com for access credentials.",
      });
    }

    const token = jwt.sign(
      {
        username: matchedOfficer.username,
        email: matchedOfficer.email,
        name: matchedOfficer.name,
        role: matchedOfficer.role,
        department: matchedOfficer.department,
        badgeNumber: matchedOfficer.badgeNumber,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.json({
      token,
      officer: {
        username: matchedOfficer.username,
        name: matchedOfficer.name,
        role: matchedOfficer.role,
        department: matchedOfficer.department,
        badgeNumber: matchedOfficer.badgeNumber,
      },
      message: `Welcome, ${matchedOfficer.name} (${matchedOfficer.role}). Redressal authorization granted.`,
    });
  } catch (err) {
    console.error("[Auth] Login error:", err.message);
    return res.status(500).json({ error: "Grievance Redressal authentication failed." });
  }
});

// Endpoint to inform officers how to request new Redressal credentials
app.get("/api/auth/credential-info", (_req, res) => {
  return res.json({
    contactEmail: "anomalyinspector@gmail.com",
    message:
      "To obtain official Grievance Redressal Officer (GRO) or Field Inspector credentials for your municipality, please email anomalyinspector@gmail.com with your official government identity proof.",
  });
});

// ---- Google Account Authorization for Citizens ---------------------------
app.post("/api/auth/google-citizen", (req, res) => {
  try {
    const { name, email, googleId, picture } = req.body;

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Valid Google email is required." });
    }

    const citizenName = name || email.split("@")[0];

    const token = jwt.sign(
      {
        email,
        name: citizenName,
        role: "Citizen",
        authProvider: "google",
        googleId: googleId || `goog_${Date.now()}`,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        name: citizenName,
        email,
        role: "Citizen",
        authProvider: "google",
        picture: picture || "",
      },
      message: `Google Account verified: ${citizenName} is authorized to report public maintenance grievances (potholes, water leaks, waste, streetlights).`,
    });
  } catch (err) {
    console.error("[Google Auth] Error:", err.message);
    return res.status(500).json({ error: "Google authorization failed." });
  }
});

// ---- GET grievances + analytics ------------------------------------------
app.get("/api/grievances", async (_req, res) => {
  try {
    const grievances = await Grievance.find().sort({ createdAt: -1 }).lean();

    const now = new Date();
    const totalActive = grievances.filter((g) => g.status !== "Resolved").length;
    const criticalCount = grievances.filter(
      (g) => g.urgencyLevel === "Critical" && g.status !== "Resolved"
    ).length;

    const severities = grievances.map((g) => g.severityScore || 0);
    const averageSeverity =
      severities.length > 0
        ? parseFloat(
            (severities.reduce((a, b) => a + b, 0) / severities.length).toFixed(
              1
            )
          )
        : 0;

    const slaCompliant = grievances.filter((g) => {
      if (g.status === "Resolved") return true;
      const hoursElapsed =
        (now.getTime() - new Date(g.createdAt).getTime()) / (1000 * 60 * 60);
      return hoursElapsed < (g.slaHours || Infinity);
    }).length;
    const slaCompliance =
      grievances.length > 0
        ? parseFloat(((slaCompliant / grievances.length) * 100).toFixed(1))
        : 100;

    const categoryBreakdown = {};
    const urgencyBreakdown = {};
    for (const g of grievances) {
      categoryBreakdown[g.category] =
        (categoryBreakdown[g.category] || 0) + 1;
      urgencyBreakdown[g.urgencyLevel] =
        (urgencyBreakdown[g.urgencyLevel] || 0) + 1;
    }

    return res.json({
      grievances,
      analytics: {
        totalActive,
        criticalCount,
        averageSeverity,
        slaCompliance,
        categoryBreakdown,
        urgencyBreakdown,
      },
    });
  } catch (err) {
    console.error("[Grievances] Fetch error:", err.message);
    return res.status(500).json({ error: "Failed to fetch grievances." });
  }
});

// ---- POST extract (multimodal) -------------------------------------------
app.post("/api/grievances/extract", upload.single("file"), async (req, res) => {
  try {
    const { text, lat, lon, preferredLanguage } = req.body;
    const file = req.file;

    if (!file && !text) {
      return res.status(400).json({
        error: "Please provide either a file upload or text input.",
      });
    }

    // Determine submitter role & identity (Google Citizen vs Official)
    let userRole = req.body.userRole || "Citizen";
    let userName = req.body.userName || "Verified Citizen";
    let userEmail = req.body.userEmail || "";
    let authProvider = req.body.authProvider || "google";

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
        userRole =
          decoded.role === "admin" ||
          decoded.role?.includes("Officer") ||
          decoded.role === "Official"
            ? "Official"
            : "Citizen";
        userName = decoded.name || decoded.username || userName;
        userEmail = decoded.email || userEmail;
        authProvider = decoded.authProvider || (userRole === "Official" ? "official_credentials" : "google");
      } catch (e) {
        // Fallback to body properties
      }
    }

    const latitude = parseFloat(lat) || 17.5449;
    const longitude = parseFloat(lon) || 78.5718;

    // Fetch live telemetry
    const telemetry = await telemetryService.fetchAllTelemetry(
      latitude,
      longitude
    );
    const locationAddress = telemetry.geo?.address || "";
    const locationWard = telemetry.geo?.ward || "";
    const liveTelemetryData = telemetry.merged;

    // Determine source file type
    let sourceFileType = "text";
    if (file) {
      if (
        file.mimetype === "image/png" ||
        file.mimetype === "image/jpeg" ||
        file.mimetype === "image/jpg"
      ) {
        sourceFileType = "image";
      } else if (file.mimetype === "application/pdf") {
        sourceFileType = "pdf";
      } else if (file.mimetype === "text/csv") {
        sourceFileType = "csv";
      }
    }

    // CSV batch processing
    if (sourceFileType === "csv" && file) {
      const rows = await parseCsvBuffer(file.buffer);
      if (rows.length === 0) {
        return res.status(400).json({ error: "CSV file is empty." });
      }

      const batchSize = 10;
      const createdGrievances = [];

      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const batchText = batch
          .map((row, idx) => {
            const entries = Object.entries(row)
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ");
            return `Row ${i + idx + 1}: ${entries}`;
          })
          .join("\n");

        const aiResult = await aiAgent.extractAndTriageCivicInput({
          fileBuffer: null,
          mimeType: null,
          rawText: batchText,
          preferredLanguage: preferredLanguage || "English",
          liveTelemetry: liveTelemetryData,
          locationAddress,
          userRole,
        });

        if (aiResult.error) {
          console.error(
            `[Extract] CSV batch ${i / batchSize + 1} AI error:`,
            aiResult.message
          );
          continue;
        }

        const grievance = new Grievance({
          title: aiResult.title,
          description: batchText,
          category: aiResult.category,
          severityScore: aiResult.severityScore,
          urgencyLevel: aiResult.urgencyLevel,
          department: aiResult.department,
          slaHours: aiResult.slaHours,
          status: "Pending",
          projectScope: aiResult.projectScope || "Localized Maintenance",
          submittedBy: {
            name: userName,
            email: userEmail,
            role: userRole,
            authProvider,
          },
          location: {
            lat: latitude,
            lon: longitude,
            address: locationAddress,
            ward: locationWard,
          },
          liveTelemetry: liveTelemetryData,
          aiAnalysisSummary: aiResult.aiAnalysisSummary,
          citizenExplainer: aiResult.citizenExplainer,
          authenticityCheck: aiResult.authenticityCheck,
          sourceFileType: "csv",
          preferredLanguage: preferredLanguage || "English",
        });

        const saved = await grievance.save();
        createdGrievances.push(saved);
      }

      return res.status(201).json({
        message: `Processed ${createdGrievances.length} grievance(s) from CSV.`,
        grievances: createdGrievances,
      });
    }

    // Single-input processing (image, pdf, text)
    const aiResult = await aiAgent.extractAndTriageCivicInput({
      fileBuffer: file ? file.buffer : null,
      mimeType: file ? file.mimetype : null,
      rawText: text || null,
      preferredLanguage: preferredLanguage || "English",
      liveTelemetry: liveTelemetryData,
      locationAddress,
      userRole,
    });

    if (aiResult.error) {
      const statusCode = aiResult.policyViolation ? 403 : 422;
      return res.status(statusCode).json({
        error: aiResult.message,
        policyViolation: aiResult.policyViolation,
      });
    }

    const grievance = new Grievance({
      title: aiResult.title,
      description: text || `Uploaded ${sourceFileType} grievance report`,
      category: aiResult.category,
      severityScore: aiResult.severityScore,
      urgencyLevel: aiResult.urgencyLevel,
      department: aiResult.department,
      slaHours: aiResult.slaHours,
      status: "Pending",
      projectScope: aiResult.projectScope || "Localized Maintenance",
      submittedBy: {
        name: userName,
        email: userEmail,
        role: userRole,
        authProvider,
      },
      location: {
        lat: latitude,
        lon: longitude,
        address: locationAddress,
        ward: locationWard,
      },
      liveTelemetry: liveTelemetryData,
      aiAnalysisSummary: aiResult.aiAnalysisSummary,
      citizenExplainer: aiResult.citizenExplainer,
      authenticityCheck: aiResult.authenticityCheck,
      sourceFileType,
      preferredLanguage: preferredLanguage || "English",
    });

    const saved = await grievance.save();
    return res.status(201).json({ grievance: saved });
  } catch (err) {
    console.error("[Extract] Error:", err.message);
    return res.status(500).json({ error: `Extraction failed: ${err.message}` });
  }
});

// ---- PATCH status (Grievance Redressal Action) --------------------------
app.patch("/api/grievances/:id/status", auth, async (req, res) => {
  try {
    const { status, redressalRemarks } = req.body;
    const validStatuses = ["Pending", "Triaged", "In Progress", "Resolved"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const officerSignature = req.user
      ? `${req.user.name || req.user.username} (${req.user.badgeNumber || req.user.role || "GRO"})`
      : "Authorized Redressal Officer";

    const updateFields = {
      status,
      resolvedBy: officerSignature,
    };

    if (redressalRemarks) {
      updateFields.redressalRemarks = redressalRemarks;
    }

    if (status === "Resolved") {
      updateFields.resolvedAt = new Date();
    }

    const grievance = await Grievance.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    );

    if (!grievance) {
      return res.status(404).json({ error: "Grievance not found." });
    }

    return res.json({
      grievance,
      message: `Grievance status updated to "${status}" by ${officerSignature}.`,
    });
  } catch (err) {
    console.error("[Status] Update error:", err.message);
    return res.status(500).json({ error: "Failed to update status." });
  }
});

// ---- GET live telemetry --------------------------------------------------
app.get("/api/telemetry/live", async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat) || 17.5449;
    const lon = parseFloat(req.query.lon) || 78.5718;
    const telemetry = await telemetryService.fetchAllTelemetry(lat, lon);
    return res.json({ telemetry });
  } catch (err) {
    console.error("[Telemetry] Error:", err.message);
    return res.status(500).json({ error: "Failed to fetch telemetry." });
  }
});

// ---- POST AI chat --------------------------------------------------------
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { question, preferredLanguage, lat, lon } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Question is required." });
    }

    const latitude = parseFloat(lat) || 17.5449;
    const longitude = parseFloat(lon) || 78.5718;

    // Fetch all grievances from DB
    const liveGrievances = await Grievance.find().sort({ createdAt: -1 }).lean();

    // Fetch current telemetry
    const telemetry = await telemetryService.fetchAllTelemetry(
      latitude,
      longitude
    );

    const result = await aiAgent.askCivicAgent({
      question,
      preferredLanguage: preferredLanguage || "English",
      liveGrievances,
      currentTelemetry: telemetry.merged,
    });

    if (result.error) {
      return res.status(422).json({ error: result.message });
    }

    return res.json({ reply: result.reply });
  } catch (err) {
    console.error("[AI Chat] Error:", err.message);
    return res.status(500).json({ error: "AI chat failed." });
  }
});

// ---- DELETE grievance ----------------------------------------------------
app.delete("/api/grievances/:id", auth, async (req, res) => {
  try {
    const grievance = await Grievance.findByIdAndDelete(req.params.id);
    if (!grievance) {
      return res.status(404).json({ error: "Grievance not found." });
    }
    return res.json({ message: "Grievance deleted successfully." });
  } catch (err) {
    console.error("[Delete] Error:", err.message);
    return res.status(500).json({ error: "Failed to delete grievance." });
  }
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
app.use((err, _req, res, _next) => {
  console.error("[Global Error]", err.message);

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(413)
        .json({ error: "File too large. Maximum size is 10MB." });
    }
    return res.status(400).json({ error: err.message });
  }

  return res.status(500).json({ error: err.message || "Internal server error." });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[main-link] Server running on port ${PORT}`);
});
