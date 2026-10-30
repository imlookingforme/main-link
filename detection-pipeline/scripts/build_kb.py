"""
Knowledge Base Builder Script
===============================
Run this to build/rebuild the knowledge base:
    python scripts/build_kb.py

Scrapes official sources, chunks text, embeds with bge-m3, indexes in FAISS.
"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from loguru import logger
from app.services.knowledge_base import KnowledgeBaseBuilder


def main():
    logger.info("Starting Knowledge Base Build")

    kb = KnowledgeBaseBuilder()
    count = kb.build(include_pdfs=True)

    if count > 0:
        logger.info(f"✅ Knowledge base built successfully: {count} chunks indexed")

        # Test retrieval
        test_queries = [
            "PM Kisan gives Rs 6000 per year",
            "Free laptops from government",
            "Aadhaar card will be deactivated",
            "Ayushman Bharat provides Rs 5 lakh insurance",
        ]

        logger.info("\n" + "=" * 60)
        logger.info("Testing retrieval...")
        logger.info("=" * 60)

        for query in test_queries:
            results = kb.retrieve(query, top_k=3)
            logger.info(f"\nQuery: {query}")
            for doc, score in results:
                logger.info(f"  [{score:.3f}] {doc.text[:100]}...")
                logger.info(f"         Source: {doc.source_url}")
    else:
        logger.error("❌ Knowledge base build failed — 0 chunks indexed")
        sys.exit(1)


if __name__ == "__main__":
    main()
