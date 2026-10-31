"""
Decentralized MongoDB Access Layer (Python / FastAPI)
Provides cross-service, shared access to all 6 database collections:
- official_schemes
- government_notifications
- municipal_laws
- bureaucracy_agent_services
- government_fact_checks
- official_portals
- grievances
"""
from __future__ import annotations

import os
from typing import List, Dict, Any, Optional
from loguru import logger
import pymongo
from pymongo import MongoClient

# Try to load environment from local or root .env
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", "..", "server", ".env"))
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"))
except Exception:
    pass

MONGO_URI = os.getenv(
    "MONGODB_URI",
    "mongodb+srv://f20250053_db_user:ib6Y4LeAlBFJ3cgV@civicpulsecluster.sgnm2dx.mongodb.net/"
)
DB_NAME = os.getenv("MONGODB_DB", "mainlink_db")

class SharedMongoManager:
    _instance: Optional[SharedMongoManager] = None
    _client: Optional[MongoClient] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SharedMongoManager, cls).__new__(cls)
            cls._instance._init_client()
        return cls._instance

    def _init_client(self):
        try:
            self._client = pymongo.MongoClient(MONGO_URI, serverSelectionTimeoutMS=4000)
            self._client.admin.command('ping')
            logger.info(f"[SharedMongoManager] Connected to MongoDB Atlas cluster at '{DB_NAME}'")
        except Exception as e:
            logger.warning(f"[SharedMongoManager] MongoDB connection warning: {e}")
            self._client = None

    @property
    def client(self) -> Optional[MongoClient]:
        if self._client is None:
            self._init_client()
        return self._client

    def get_db(self, db_name: Optional[str] = None):
        c = self.client
        if c is None:
            return None
        return c[db_name or DB_NAME]

    def get_collection(self, collection_name: str, db_name: Optional[str] = None):
        db = self.get_db(db_name)
        if db is None:
            return None
        return db[collection_name]

    def get_schemes(self, filter_query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        col = self.get_collection("official_schemes")
        if col is None: return []
        try:
            return list(col.find(filter_query or {}, {"_id": 0}))
        except Exception as e:
            logger.error(f"[SharedMongoManager] get_schemes error: {e}")
            return []

    def get_notifications(self, filter_query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        col = self.get_collection("government_notifications")
        if col is None: return []
        try:
            return list(col.find(filter_query or {}, {"_id": 0}))
        except Exception as e:
            logger.error(f"[SharedMongoManager] get_notifications error: {e}")
            return []

    def get_municipal_laws(self, filter_query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        col = self.get_collection("municipal_laws")
        if col is None: return []
        try:
            return list(col.find(filter_query or {}, {"_id": 0}))
        except Exception as e:
            logger.error(f"[SharedMongoManager] get_municipal_laws error: {e}")
            return []

    def get_agent_services(self, filter_query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        col = self.get_collection("bureaucracy_agent_services")
        if col is None: return []
        try:
            return list(col.find(filter_query or {}, {"_id": 0}))
        except Exception as e:
            logger.error(f"[SharedMongoManager] get_agent_services error: {e}")
            return []

    def get_fact_checks(self, filter_query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        col = self.get_collection("government_fact_checks")
        if col is None: return []
        try:
            return list(col.find(filter_query or {}, {"_id": 0}))
        except Exception as e:
            logger.error(f"[SharedMongoManager] get_fact_checks error: {e}")
            return []

    def get_portals(self) -> List[Dict[str, Any]]:
        col = self.get_collection("official_portals")
        if col is None: return []
        try:
            return list(col.find({}, {"_id": 0}))
        except Exception as e:
            logger.error(f"[SharedMongoManager] get_portals error: {e}")
            return []

    def get_grievances(self, limit: int = 50) -> List[Dict[str, Any]]:
        col = self.get_collection("grievances")
        if col is None: return []
        try:
            return list(col.find({}, {"_id": 0}).sort("createdAt", -1).limit(limit))
        except Exception as e:
            logger.error(f"[SharedMongoManager] get_grievances error: {e}")
            return []

    def get_stats(self) -> Dict[str, Any]:
        db = self.get_db()
        if db is None:
            return {"connected": False, "error": "No database connection"}
        try:
            return {
                "connected": True,
                "database": DB_NAME,
                "counts": {
                    "official_schemes": db["official_schemes"].count_documents({}),
                    "government_notifications": db["government_notifications"].count_documents({}),
                    "municipal_laws": db["municipal_laws"].count_documents({}),
                    "bureaucracy_agent_services": db["bureaucracy_agent_services"].count_documents({}),
                    "government_fact_checks": db["government_fact_checks"].count_documents({}),
                    "official_portals": db["official_portals"].count_documents({}),
                    "grievances": db["grievances"].count_documents({}),
                }
            }
        except Exception as e:
            return {"connected": False, "error": str(e)}

shared_db = SharedMongoManager()
