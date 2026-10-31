const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    notification_id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    issuing_ministry: { type: String, default: "" },
    gazette_number: { type: String, default: "" },
    date_of_order: { type: String, default: "" },
    subject: { type: String, default: "" },
    legal_mandate: { type: String, default: "" },
    summary: { type: String, default: "" },
    citizen_rights: { type: String, default: "" },
    scraped_at: { type: String, default: () => new Date().toISOString() },
  },
  { collection: "government_notifications", timestamps: true }
);

module.exports = mongoose.model("GovernmentNotification", notificationSchema);
