const mongoose = require("mongoose");

const factCheckSchema = new mongoose.Schema(
  {
    claim_id: { type: String, required: true, unique: true, index: true },
    viral_claim: { type: String, required: true },
    official_debunk: { type: String, required: true },
    verdict: { type: String, default: "Fake/Scam" },
    source_url: { type: String, default: "https://factcheck.pib.gov.in" },
    source_portal: { type: String, default: "Press Information Bureau Fact Check" },
    scheme_targeted: { type: String, default: "General Government Welfare" },
    red_flags: { type: [String], default: [] },
    scraped_at: { type: String, default: () => new Date().toISOString() },
  },
  { collection: "government_fact_checks", timestamps: true }
);

module.exports = mongoose.model("FactCheck", factCheckSchema);
