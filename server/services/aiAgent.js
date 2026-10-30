const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const pdfParse = require("pdf-parse");

function getGenAI() {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey || apiKey === "replace_me") {
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
}

const triageResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING, description: "Concise grievance title" },
    category: {
      type: SchemaType.STRING,
      enum: [
        "Roads & Bridges",
        "Water & Drainage",
        "Sanitation & Waste",
        "Air & Pollution",
        "Electrical & Streetlights",
        "Public Policy & Welfare",
      ],
      description: "Civic grievance category",
    },
    severityScore: {
      type: SchemaType.NUMBER,
      description: "Severity from 1 (minor) to 10 (catastrophic)",
    },
    urgencyLevel: {
      type: SchemaType.STRING,
      enum: ["Low", "Medium", "High", "Critical"],
      description: "Urgency level",
    },
    department: {
      type: SchemaType.STRING,
      description: "Responsible municipal department",
    },
    slaHours: {
      type: SchemaType.NUMBER,
      description: "Resolution SLA in hours",
    },
    aiAnalysisSummary: {
      type: SchemaType.STRING,
      description:
        "Technical analysis summary for municipal officers (2-4 sentences)",
    },
    citizenExplainer: {
      type: SchemaType.STRING,
      description:
        "Bilingual plain-language explanation for the citizen who filed the grievance",
    },
    authenticityCheck: {
      type: SchemaType.STRING,
      enum: ["Verified Consistent", "Needs Field Inspection"],
      description:
        "Cross-verification result against live environmental telemetry",
    },
    projectScope: {
      type: SchemaType.STRING,
      enum: ["Localized Maintenance", "Macro Capital Infrastructure"],
      description:
        "Classify as 'Localized Maintenance' (potholes, garbage, streetlights, water pipe leaks, localized smoke) or 'Macro Capital Infrastructure' (new flyover construction, highway expansion, major new bridge, urban transit line)",
    },
  },
  required: [
    "title",
    "category",
    "severityScore",
    "urgencyLevel",
    "department",
    "slaHours",
    "aiAnalysisSummary",
    "citizenExplainer",
    "authenticityCheck",
    "projectScope",
  ],
};

async function extractAndTriageCivicInput({
  fileBuffer,
  mimeType,
  rawText,
  preferredLanguage,
  liveTelemetry,
  locationAddress,
  userRole = "Citizen",
}) {
  try {
    const genAI = getGenAI();
    if (!genAI) {
      return {
        error: true,
        message:
          "AI features unavailable - please configure AI_API_KEY in server/.env",
      };
    }

    const modelName = process.env.AI_MODEL || "gemini-2.5-flash";
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction:
        "You are main-link AI — an expert municipal infrastructure triage agent. " +
        "Analyze the provided civic grievance input (image, document text, or report) " +
        "combined with the live environmental telemetry data. You MUST return ONLY valid " +
        "JSON matching the exact schema. Cross-verify the report against live telemetry: " +
        "if precipitation > 0 and report mentions flooding/waterlogging, escalate urgency " +
        "to Critical. If pm2_5 > 50 and report mentions burning/smoke/pollution, flag " +
        "environmental correlation and escalate.",
      generationConfig: {
        temperature: 0.15,
        responseMimeType: "application/json",
        responseSchema: triageResponseSchema,
      },
    });

    const telemetryContext = liveTelemetry
      ? `\n\nLIVE ENVIRONMENTAL TELEMETRY (fetched just now):\n` +
        `- Temperature: ${liveTelemetry.temperature ?? "N/A"}°C\n` +
        `- Humidity: ${liveTelemetry.humidity ?? "N/A"}%\n` +
        `- Precipitation: ${liveTelemetry.precipitation ?? "N/A"} mm\n` +
        `- Wind Speed: ${liveTelemetry.wind_speed ?? "N/A"} km/h\n` +
        `- PM2.5: ${liveTelemetry.pm2_5 ?? "N/A"} µg/m³\n` +
        `- PM10: ${liveTelemetry.pm10 ?? "N/A"} µg/m³\n` +
        `- NO₂: ${liveTelemetry.nitrogen_dioxide ?? "N/A"} µg/m³\n` +
        `- CO: ${liveTelemetry.carbon_monoxide ?? "N/A"} µg/m³\n` +
        `- European AQI: ${liveTelemetry.european_aqi ?? "N/A"}\n`
      : "\n\nLIVE ENVIRONMENTAL TELEMETRY: unavailable\n";

    const locationContext = locationAddress
      ? `\nLOCATION: ${locationAddress}\n`
      : "\nLOCATION: not provided\n";

    const languageContext = `\nCitizen's preferred language: ${preferredLanguage || "English"}. The citizenExplainer MUST be bilingual: first in English, then translated in ${preferredLanguage || "English"}.\n`;

    const promptSuffix =
      telemetryContext +
      locationContext +
      languageContext +
      "\nAnalyze the above civic grievance input and return the triage JSON.";

    let parts = [];

    if (
      fileBuffer &&
      mimeType &&
      (mimeType === "image/png" ||
        mimeType === "image/jpeg" ||
        mimeType === "image/jpg")
    ) {
      // Image input — send as inline data
      const base64Data = fileBuffer.toString("base64");
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data,
        },
      });
      parts.push({
        text:
          "This is an image of a civic grievance report or infrastructure issue." +
          promptSuffix,
      });
    } else if (fileBuffer && mimeType === "application/pdf") {
      // PDF input — extract text with pdf-parse
      const pdfData = await pdfParse(fileBuffer);
      const pdfText = pdfData.text || "";
      parts.push({
        text:
          "The following is text extracted from a PDF civic grievance document:\n\n" +
          pdfText +
          promptSuffix,
      });
    } else if (rawText) {
      // Text or voice or pre-parsed CSV input
      parts.push({
        text:
          "The following is a civic grievance report submitted as text:\n\n" +
          rawText +
          promptSuffix,
      });
    } else {
      return {
        error: true,
        message: "No valid input provided for AI analysis.",
      };
    }

    const result = await model.generateContent(parts);
    const response = result.response;
    const text = response.text();
    const parsed = JSON.parse(text);

    // Civic Governance Authorization Rule:
    // Citizens with Google Accounts can raise Localized Maintenance grievances (potholes, water leaks, sanitation, electrical).
    // Macro Capital Infrastructure projects (e.g. New Flyovers, Major Highways, Transit Lines) require Government Official authorization.
    if (userRole !== "Official" && parsed.projectScope === "Macro Capital Infrastructure") {
      return {
        error: true,
        policyViolation: "CAPITAL_PROJECT_OFFICIAL_ONLY",
        projectScope: "Macro Capital Infrastructure",
        message:
          "🚫 Civic Governance Rule: Proposals for Macro Capital Infrastructure (such as New Flyovers, Highway Expansions, or Bridge Construction) can only be commissioned by authorized Government / Municipal Planning Officials. Citizens with verified Google accounts are authorized to report localized maintenance hazards (e.g., potholes, drainage leaks, waste dumping, broken streetlights).",
      };
    }

    return parsed;
  } catch (err) {
    console.error("[AI Agent] extractAndTriageCivicInput error:", err.message);
    return {
      error: true,
      message: `AI analysis failed: ${err.message}`,
    };
  }
}

async function askCivicAgent({
  question,
  preferredLanguage,
  liveGrievances,
  currentTelemetry,
}) {
  try {
    const genAI = getGenAI();
    if (!genAI) {
      return {
        error: true,
        message:
          "AI features unavailable - please configure AI_API_KEY in server/.env",
      };
    }

    const lang = preferredLanguage || "English";
    const modelName = process.env.AI_MODEL || "gemini-2.5-flash";
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction:
        `You are main-link AI Civic Agent — a multilingual public accountability assistant. ` +
        `Answer questions ONLY using the provided live grievance database records and current ` +
        `environmental telemetry. Never invent statistics or grievance details. If asked about ` +
        `data not in the provided context, say 'I don't have that data in the current live database.' ` +
        `You also serve as a Multilingual Policy, Rights & Scheme Explainer. ` +
        `Respond in the user's preferred language: ${lang}.`,
      generationConfig: {
        temperature: 0.4,
      },
    });

    const grievanceSummary =
      liveGrievances && liveGrievances.length > 0
        ? liveGrievances
            .map((g, i) => {
              return (
                `[${i + 1}] Title: ${g.title} | Category: ${g.category} | ` +
                `Severity: ${g.severityScore}/10 | Urgency: ${g.urgencyLevel} | ` +
                `Status: ${g.status} | Department: ${g.department} | ` +
                `Location: ${g.location?.address || "N/A"} | ` +
                `Filed: ${g.createdAt || "N/A"}`
              );
            })
            .join("\n")
        : "No grievances currently in the database.";

    const telemetryText = currentTelemetry
      ? `Current Environmental Telemetry:\n` +
        `- Temperature: ${currentTelemetry.temperature ?? "N/A"}°C\n` +
        `- Humidity: ${currentTelemetry.humidity ?? "N/A"}%\n` +
        `- Precipitation: ${currentTelemetry.precipitation ?? "N/A"} mm\n` +
        `- PM2.5: ${currentTelemetry.pm2_5 ?? "N/A"} µg/m³\n` +
        `- PM10: ${currentTelemetry.pm10 ?? "N/A"} µg/m³\n` +
        `- European AQI: ${currentTelemetry.european_aqi ?? "N/A"}\n`
      : "Current Environmental Telemetry: unavailable\n";

    const prompt =
      `LIVE GRIEVANCE DATABASE RECORDS:\n${grievanceSummary}\n\n` +
      `${telemetryText}\n\n` +
      `CITIZEN QUESTION:\n${question}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    return { reply: response.text() };
  } catch (err) {
    console.error("[AI Agent] askCivicAgent error:", err.message);
    return {
      error: true,
      message: `AI chat failed: ${err.message}`,
    };
  }
}

module.exports = {
  extractAndTriageCivicInput,
  askCivicAgent,
};
