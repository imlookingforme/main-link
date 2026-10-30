const mongoose = require("mongoose");

const grievanceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
    },
    description: {
      type: String,
    },
    category: {
      type: String,
      enum: [
        "Roads & Bridges",
        "Water & Drainage",
        "Sanitation & Waste",
        "Air & Pollution",
        "Electrical & Streetlights",
        "Public Policy & Welfare",
      ],
      required: [true, "Category is required"],
    },
    severityScore: {
      type: Number,
      min: 1,
      max: 10,
      required: [true, "Severity score is required"],
    },
    urgencyLevel: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      required: [true, "Urgency level is required"],
    },
    department: {
      type: String,
      required: [true, "Department is required"],
    },
    slaHours: {
      type: Number,
      required: [true, "SLA hours is required"],
    },
    status: {
      type: String,
      enum: ["Pending", "Triaged", "In Progress", "Resolved"],
      default: "Pending",
    },
    location: {
      lat: { type: Number },
      lon: { type: Number },
      address: { type: String },
      ward: { type: String },
    },
    liveTelemetry: {
      temperature: { type: Number },
      precipitation: { type: Number },
      pm2_5: { type: Number },
      pm10: { type: Number },
      nitrogen_dioxide: { type: Number },
      carbon_monoxide: { type: Number },
      european_aqi: { type: Number },
      humidity: { type: Number },
      wind_speed: { type: Number },
      fetchedAt: { type: Date },
    },
    aiAnalysisSummary: {
      type: String,
    },
    citizenExplainer: {
      type: String,
    },
    authenticityCheck: {
      type: String,
      enum: ["Verified Consistent", "Needs Field Inspection"],
    },
    sourceFileType: {
      type: String,
      enum: ["image", "pdf", "csv", "text", "voice"],
    },
    preferredLanguage: {
      type: String,
      default: "English",
    },
    projectScope: {
      type: String,
      enum: ["Localized Maintenance", "Macro Capital Infrastructure"],
      default: "Localized Maintenance",
    },
    submittedBy: {
      name: { type: String, default: "Anonymous Citizen" },
      email: { type: String, default: "" },
      role: { type: String, enum: ["Citizen", "Official"], default: "Citizen" },
      authProvider: { type: String, enum: ["google", "official_credentials"], default: "google" },
    },
    citizenImpactCount: {
      type: Number,
      default: 1,
    },
    isClustered: {
      type: Boolean,
      default: false,
    },
    audioUrl: {
      type: String,
      default: "",
    },
    redressalRemarks: {
      type: String,
      default: "",
    },
    resolvedBy: {
      type: String,
      default: "",
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Grievance", grievanceSchema);
