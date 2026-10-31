const mongoose = require("mongoose");

const officialPortalSchema = new mongoose.Schema(
  {
    domain: { type: String, required: true, unique: true, index: true },
    portal_name: { type: String, required: true },
    url: { type: String, required: true },
    ministry_or_body: { type: String, default: "" },
    verified: { type: Boolean, default: true },
    scraped_at: { type: String, default: () => new Date().toISOString() },
  },
  { collection: "official_portals", timestamps: true }
);

module.exports = mongoose.model("OfficialPortal", officialPortalSchema);
