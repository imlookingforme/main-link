const mongoose = require("mongoose");

const municipalLawSchema = new mongoose.Schema(
  {
    law_id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    governing_body: { type: String, default: "" },
    jurisdiction: { type: String, default: "" },
    statutory_act: { type: String, default: "" },
    sla_clearance_hours: { type: Number, default: 24 },
    mandate: { type: String, default: "" },
    penal_provisions: { type: String, default: "" },
    citizen_remedy: { type: String, default: "" },
    sla_matrix: { type: mongoose.Schema.Types.Mixed, default: {} },
    scraped_at: { type: String, default: () => new Date().toISOString() },
  },
  { collection: "municipal_laws", timestamps: true }
);

module.exports = mongoose.model("MunicipalLaw", municipalLawSchema);
