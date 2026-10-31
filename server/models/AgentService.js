const mongoose = require("mongoose");

const agentServiceSchema = new mongoose.Schema(
  {
    service_id: { type: String, required: true, unique: true, index: true },
    service_name: { type: String, required: true },
    category: { type: String, default: "General" },
    target_portal: { type: String, required: true },
    supported_schemes: { type: [String], default: [] },
    required_citizen_profile: { type: [String], default: [] },
    execution_stages: { type: [mongoose.Schema.Types.Mixed], default: [] },
    tracking_receipt_prefix: { type: String, default: "APP-" },
    scraped_at: { type: String, default: () => new Date().toISOString() },
  },
  { collection: "bureaucracy_agent_services", timestamps: true }
);

module.exports = mongoose.model("AgentService", agentServiceSchema);
