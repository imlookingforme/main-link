/**
 * Decentralized MongoDB Manager (Node.js)
 * Provides cross-collection and multi-database querying across all 6 collections:
 * - grievances
 * - official_schemes
 * - government_notifications
 * - municipal_laws
 * - bureaucracy_agent_services
 * - government_fact_checks
 * - official_portals
 */
const mongoose = require("mongoose");
const Grievance = require("../models/Grievance");
const OfficialScheme = require("../models/OfficialScheme");
const GovernmentNotification = require("../models/GovernmentNotification");
const MunicipalLaw = require("../models/MunicipalLaw");
const AgentService = require("../models/AgentService");
const FactCheck = require("../models/FactCheck");
const OfficialPortal = require("../models/OfficialPortal");

class DatabaseManager {
  constructor() {
    this.models = {
      grievances: Grievance,
      official_schemes: OfficialScheme,
      government_notifications: GovernmentNotification,
      municipal_laws: MunicipalLaw,
      bureaucracy_agent_services: AgentService,
      government_fact_checks: FactCheck,
      official_portals: OfficialPortal,
    };
  }

  async getAllSchemes(filter = {}) {
    return await OfficialScheme.find(filter).lean();
  }

  async getAllNotifications(filter = {}) {
    return await GovernmentNotification.find(filter).lean();
  }

  async getAllMunicipalLaws(filter = {}) {
    return await MunicipalLaw.find(filter).lean();
  }

  async getAllAgentServices(filter = {}) {
    return await AgentService.find(filter).lean();
  }

  async getAllFactChecks(filter = {}) {
    return await FactCheck.find(filter).lean();
  }

  async getAllPortals(filter = {}) {
    return await OfficialPortal.find(filter).lean();
  }

  async getAllGrievances(filter = {}) {
    return await Grievance.find(filter).sort({ createdAt: -1 }).lean();
  }

  async getDatabaseOverview() {
    const db = mongoose.connection.db;
    let collectionsList = [];
    if (db) {
      const cols = await db.listCollections().toArray();
      collectionsList = cols.map((c) => c.name);
    }

    const [
      grievanceCount,
      schemeCount,
      notificationCount,
      lawCount,
      agentServiceCount,
      factCheckCount,
      portalCount,
    ] = await Promise.all([
      Grievance.countDocuments().catch(() => 0),
      OfficialScheme.countDocuments().catch(() => 0),
      GovernmentNotification.countDocuments().catch(() => 0),
      MunicipalLaw.countDocuments().catch(() => 0),
      AgentService.countDocuments().catch(() => 0),
      FactCheck.countDocuments().catch(() => 0),
      OfficialPortal.countDocuments().catch(() => 0),
    ]);

    return {
      connected: mongoose.connection.readyState === 1,
      databaseName: mongoose.connection.name || "mainlink_db",
      host: mongoose.connection.host,
      collections: collectionsList,
      counts: {
        grievances: grievanceCount,
        official_schemes: schemeCount,
        government_notifications: notificationCount,
        municipal_laws: lawCount,
        bureaucracy_agent_services: agentServiceCount,
        government_fact_checks: factCheckCount,
        official_portals: portalCount,
      },
    };
  }

  async rawQuery(collectionName, query = {}, limit = 50) {
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database not connected");
    return await db.collection(collectionName).find(query).limit(limit).toArray();
  }
}

module.exports = new DatabaseManager();
