const mongoose = require("mongoose");

const officialSchemeSchema = new mongoose.Schema(
  {
    scheme_id: { type: String, required: true, unique: true, index: true },
    scheme_name: { type: String, required: true },
    ministry: { type: String, default: "" },
    source: { type: String, default: "" },
    direct_apply_url: { type: String, default: "" },
    portal_domain: { type: String, default: "" },
    fee_inr: { type: Number, default: 0 },
    official_fact: { type: String, default: "" },
    eligibility: { type: String, default: "" },
    benefits: { type: String, default: "" },
    category: { type: String, default: "Welfare" },
    scraped_at: { type: String, default: () => new Date().toISOString() },
  },
  { collection: "official_schemes", timestamps: true }
);

module.exports = mongoose.model("OfficialScheme", officialSchemeSchema);
