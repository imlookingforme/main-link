"""
Knowledge Base Builder (Phase 1)
=================================
Scrapes official Indian government sources, fact-check archives.
Parses PDFs, chunks text, embeds with bge-m3, indexes in FAISS.
"""
from __future__ import annotations

import json
import os
import pickle
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Optional

import numpy as np
import requests
from bs4 import BeautifulSoup
from loguru import logger
from tqdm import tqdm

from app.config import get_settings

# ── Constants ──
CHUNK_SIZE = 250  # tokens (target)
CHUNK_OVERLAP = 50  # tokens


class Document:
    """A single document chunk with metadata."""

    def __init__(
        self,
        text: str,
        source_url: str = "",
        scheme_name: str = "",
        date: str = "",
        is_active: bool = True,
        doc_type: str = "official",  # official | fact_check | news
        chunk_id: str = "",
    ):
        self.text = text
        self.source_url = source_url
        self.scheme_name = scheme_name
        self.date = date
        self.is_active = is_active
        self.doc_type = doc_type
        self.chunk_id = chunk_id or hashlib.md5(text.encode()).hexdigest()[:12]

    def to_dict(self) -> dict:
        return {
            "text": self.text,
            "source_url": self.source_url,
            "scheme_name": self.scheme_name,
            "date": self.date,
            "is_active": self.is_active,
            "doc_type": self.doc_type,
            "chunk_id": self.chunk_id,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Document":
        return cls(**d)


class TextChunker:
    """Split text into ~CHUNK_SIZE token chunks with overlap."""

    def __init__(self, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP):
        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunk(self, text: str, **metadata) -> list[Document]:
        """Split text into overlapping chunks."""
        words = text.split()
        if not words:
            return []

        chunks = []
        start = 0
        while start < len(words):
            end = start + self.chunk_size
            chunk_words = words[start:end]
            chunk_text = " ".join(chunk_words)

            if len(chunk_text.strip()) > 20:  # skip tiny fragments
                doc = Document(text=chunk_text, **metadata)
                chunks.append(doc)

            start += self.chunk_size - self.overlap

        return chunks


class SourceScraper:
    """Scrape official Indian government sources for the knowledge base."""

    HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
    }

    # ── PIB Fact Check ──

    @staticmethod
    def scrape_pib_fact_check(max_pages: int = 5) -> list[dict]:
        """Scrape PIB Fact Check feed for fact-check entries."""
        entries = []
        base_url = "https://factcheck.pib.gov.in"

        try:
            for page in range(1, max_pages + 1):
                url = f"{base_url}/?page={page}"
                resp = requests.get(
                    url, headers=SourceScraper.HEADERS, timeout=15
                )
                if resp.status_code != 200:
                    logger.warning(f"PIB page {page} returned {resp.status_code}")
                    break

                soup = BeautifulSoup(resp.text, "lxml")
                cards = soup.select(".card, .fact-check-card, article")

                if not cards:
                    # Try generic div-based parsing
                    cards = soup.select("div.col-md-4, div.col-lg-4")

                for card in cards:
                    title_el = card.select_one("h3, h4, h5, .card-title, a")
                    text_el = card.select_one("p, .card-text, .description")

                    if title_el:
                        entry = {
                            "title": title_el.get_text(strip=True),
                            "text": text_el.get_text(strip=True) if text_el else "",
                            "url": base_url + title_el.get("href", "")
                            if title_el.get("href")
                            else url,
                            "source": "PIB Fact Check",
                            "date": datetime.now().strftime("%Y-%m-%d"),
                            "doc_type": "fact_check",
                        }
                        entries.append(entry)

                logger.info(f"PIB Fact Check page {page}: {len(cards)} items")

        except Exception as e:
            logger.error(f"PIB scrape error: {e}")

        return entries

    # ── myScheme.gov.in ──

    @staticmethod
    def scrape_myscheme(max_schemes: int = 100) -> list[dict]:
        """Fetch scheme data from myScheme.gov.in API."""
        entries = []
        api_url = "https://api.myscheme.gov.in/search/v4/schemes"

        try:
            # The API uses POST with pagination
            payload = {
                "lang": "en",
                "keyword": "",
                "filters": {},
                "from": 0,
                "size": min(max_schemes, 50),
            }
            resp = requests.post(
                api_url,
                json=payload,
                headers={**SourceScraper.HEADERS, "Content-Type": "application/json"},
                timeout=20,
            )

            if resp.status_code == 200:
                data = resp.json()
                schemes = data.get("data", {}).get("schemes", [])
                if not schemes:
                    schemes = data.get("schemes", data.get("data", []))

                for scheme in schemes[:max_schemes]:
                    if isinstance(scheme, dict):
                        entry = {
                            "title": scheme.get("schemeName", scheme.get("title", "")),
                            "text": scheme.get(
                                "briefDescription",
                                scheme.get("description", ""),
                            ),
                            "url": f"https://www.myscheme.gov.in/schemes/{scheme.get('slug', scheme.get('id', ''))}",
                            "source": "myScheme.gov.in",
                            "date": scheme.get("updatedAt", datetime.now().strftime("%Y-%m-%d")),
                            "doc_type": "official",
                            "scheme_name": scheme.get("schemeName", ""),
                            "is_active": scheme.get("isActive", True),
                        }
                        entries.append(entry)

                logger.info(f"myScheme: fetched {len(entries)} schemes")
            else:
                logger.warning(f"myScheme API returned {resp.status_code}")

        except Exception as e:
            logger.error(f"myScheme scrape error: {e}")

        return entries

    # ── PIB Press Releases ──

    @staticmethod
    def scrape_pib_releases(max_pages: int = 3) -> list[dict]:
        """Scrape PIB press releases."""
        entries = []
        base_url = "https://pib.gov.in/allRel.aspx"

        try:
            resp = requests.get(
                base_url, headers=SourceScraper.HEADERS, timeout=15
            )
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "lxml")
                links = soup.select("a[href*='PressRelease']")

                for link in links[:50]:
                    title = link.get_text(strip=True)
                    href = link.get("href", "")
                    if title and len(title) > 10:
                        full_url = (
                            f"https://pib.gov.in/{href}"
                            if not href.startswith("http")
                            else href
                        )
                        entries.append(
                            {
                                "title": title,
                                "text": title,  # Will be enriched if we fetch full page
                                "url": full_url,
                                "source": "PIB Press Releases",
                                "date": datetime.now().strftime("%Y-%m-%d"),
                                "doc_type": "official",
                            }
                        )

                logger.info(f"PIB releases: {len(entries)} entries")

        except Exception as e:
            logger.error(f"PIB releases scrape error: {e}")

        return entries


class PDFParser:
    """Parse PDF files with pdfplumber, OCR fallback."""

    @staticmethod
    def parse(pdf_path: str | Path) -> str:
        """Extract text from a PDF file."""
        text = ""

        # Try pdfplumber first
        try:
            import pdfplumber
            with pdfplumber.open(str(pdf_path)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as e:
            logger.warning(f"pdfplumber failed for {pdf_path}: {e}")

        # Fallback: PyMuPDF
        if not text.strip():
            try:
                import fitz  # PyMuPDF
                doc = fitz.open(str(pdf_path))
                for page in doc:
                    text += page.get_text() + "\n"
                doc.close()
            except Exception as e:
                logger.warning(f"PyMuPDF failed for {pdf_path}: {e}")

        # OCR fallback for scanned documents
        if not text.strip() or len(text.strip()) < 50:
            try:
                import fitz
                doc = fitz.open(str(pdf_path))
                for page_num in range(len(doc)):
                    page = doc[page_num]
                    pix = page.get_pixmap(dpi=200)
                    from PIL import Image
                    import io
                    img = Image.open(io.BytesIO(pix.tobytes("png")))

                    try:
                        import pytesseract
                        page_text = pytesseract.image_to_string(img, lang="eng+hin")
                        text += page_text + "\n"
                    except Exception:
                        try:
                            import easyocr
                            reader = easyocr.Reader(["en", "hi"], gpu=False, verbose=False)
                            results = reader.readtext(np.array(img))
                            text += " ".join([r[1] for r in results]) + "\n"
                        except Exception:
                            pass
                doc.close()
            except Exception as e:
                logger.error(f"OCR fallback failed for {pdf_path}: {e}")

        return text.strip()


class KnowledgeBaseBuilder:
    """
    Build and manage the knowledge base:
    1. Scrape sources
    2. Parse PDFs
    3. Chunk text
    4. Embed with bge-m3
    5. Index in FAISS
    """

    def __init__(self):
        self.settings = get_settings()
        self.chunker = TextChunker()
        self.scraper = SourceScraper()
        self.pdf_parser = PDFParser()
        self.documents: list[Document] = []
        self.embeddings: np.ndarray | None = None
        self._embed_model = None
        self._faiss_index = None
        self._bm25 = None

        # Paths
        self.kb_dir = Path(self.settings.knowledge_base_dir)
        self.kb_dir.mkdir(parents=True, exist_ok=True)
        self.docs_path = self.kb_dir / "documents.json"
        self.index_path = Path(self.settings.faiss_index_path)
        self.index_path.mkdir(parents=True, exist_ok=True)

    # ── Embedding Model ──

    def _load_embed_model(self):
        """Load bge-m3 embedding model."""
        if self._embed_model is None:
            logger.info(f"Loading embedding model: {self.settings.embedding_model}")
            try:
                from FlagEmbedding import BGEM3FlagModel
                self._embed_model = BGEM3FlagModel(
                    self.settings.embedding_model, use_fp16=False
                )
                logger.info("bge-m3 loaded via FlagEmbedding")
            except Exception as e:
                logger.warning(f"FlagEmbedding failed: {e}, falling back to sentence-transformers")
                from sentence_transformers import SentenceTransformer
                self._embed_model = SentenceTransformer(self.settings.embedding_model)
                logger.info("bge-m3 loaded via sentence-transformers")

    def embed_texts(self, texts: list[str]) -> np.ndarray:
        """Embed a list of texts, returns (N, dim) array."""
        self._load_embed_model()

        try:
            from FlagEmbedding import BGEM3FlagModel
            if isinstance(self._embed_model, BGEM3FlagModel):
                result = self._embed_model.encode(
                    texts, batch_size=32, max_length=512
                )
                # bge-m3 returns dict with 'dense_vecs'
                if isinstance(result, dict):
                    return np.array(result["dense_vecs"], dtype=np.float32)
                return np.array(result, dtype=np.float32)
        except Exception:
            pass

        # sentence-transformers fallback
        embeddings = self._embed_model.encode(
            texts, batch_size=32, show_progress_bar=True, normalize_embeddings=True
        )
        return np.array(embeddings, dtype=np.float32)

    # ── FAISS Index ──

    def build_faiss_index(self, embeddings: np.ndarray):
        """Build a FAISS index from embeddings."""
        import faiss

        dim = embeddings.shape[1]
        # Use IVF for larger datasets, flat for small
        if len(embeddings) > 10000:
            quantizer = faiss.IndexFlatIP(dim)
            n_cells = min(int(np.sqrt(len(embeddings))), 256)
            index = faiss.IndexIVFFlat(quantizer, dim, n_cells, faiss.METRIC_INNER_PRODUCT)
            index.train(embeddings)
            index.add(embeddings)
            index.nprobe = min(10, n_cells)
        else:
            index = faiss.IndexFlatIP(dim)
            # Normalize for cosine similarity
            faiss.normalize_L2(embeddings)
            index.add(embeddings)

        self._faiss_index = index
        logger.info(f"FAISS index built: {index.ntotal} vectors, dim={dim}")

        # Save index
        faiss.write_index(index, str(self.index_path / "index.faiss"))
        logger.info(f"FAISS index saved to {self.index_path / 'index.faiss'}")

    def load_faiss_index(self) -> bool:
        """Load existing FAISS index."""
        import faiss

        idx_file = self.index_path / "index.faiss"
        if idx_file.exists():
            self._faiss_index = faiss.read_index(str(idx_file))
            logger.info(f"FAISS index loaded: {self._faiss_index.ntotal} vectors")
            return True
        return False

    # ── BM25 ──

    def build_bm25(self):
        """Build BM25 sparse index from documents."""
        from rank_bm25 import BM25Okapi

        tokenized = [doc.text.lower().split() for doc in self.documents]
        self._bm25 = BM25Okapi(tokenized)
        logger.info(f"BM25 index built: {len(tokenized)} documents")

    # ── Hybrid Retrieval ──

    def retrieve(
        self,
        query: str,
        top_k: int | None = None,
        hybrid_lambda: float | None = None,
    ) -> list[tuple[Document, float]]:
        """
        Hybrid retrieval: dense (FAISS) + sparse (BM25).
        Score: s(q,d) = λ·cos(e_q, e_d) + (1-λ)·BM25(q,d)
        """
        if top_k is None:
            top_k = self.settings.retrieval_top_k
        if hybrid_lambda is None:
            hybrid_lambda = self.settings.hybrid_lambda

        if not self.documents:
            self.load_documents()
        if self._faiss_index is None:
            if not self.load_faiss_index():
                logger.error("No FAISS index available")
                return []
        if self._bm25 is None:
            self.build_bm25()

        # Dense retrieval
        import faiss
        query_embed = self.embed_texts([query])
        faiss.normalize_L2(query_embed)

        n_results = min(top_k * 3, self._faiss_index.ntotal)
        dense_scores, dense_ids = self._faiss_index.search(query_embed, n_results)
        dense_scores = dense_scores[0]
        dense_ids = dense_ids[0]

        # BM25 sparse retrieval
        query_tokens = query.lower().split()
        bm25_scores = self._bm25.get_scores(query_tokens)

        # Normalize BM25 scores to [0, 1]
        bm25_max = bm25_scores.max() if bm25_scores.max() > 0 else 1.0
        bm25_normalized = bm25_scores / bm25_max

        # Fuse scores
        combined = {}
        for rank, (doc_id, score) in enumerate(zip(dense_ids, dense_scores)):
            if doc_id >= 0 and doc_id < len(self.documents):
                combined[int(doc_id)] = hybrid_lambda * float(score)

        for doc_id, bm25_s in enumerate(bm25_normalized):
            if bm25_s > 0:
                if doc_id in combined:
                    combined[doc_id] += (1 - hybrid_lambda) * float(bm25_s)
                else:
                    combined[doc_id] = (1 - hybrid_lambda) * float(bm25_s)

        # Sort by combined score
        sorted_results = sorted(combined.items(), key=lambda x: x[1], reverse=True)

        results = []
        for doc_id, score in sorted_results[:top_k]:
            if doc_id < len(self.documents):
                results.append((self.documents[doc_id], score))

        return results

    # ── Build Pipeline ──

    def scrape_all_sources(self) -> list[dict]:
        """Scrape all configured sources."""
        all_entries = []

        logger.info("Scraping PIB Fact Check...")
        all_entries.extend(self.scraper.scrape_pib_fact_check())

        logger.info("Scraping myScheme.gov.in...")
        all_entries.extend(self.scraper.scrape_myscheme())

        logger.info("Scraping PIB Press Releases...")
        all_entries.extend(self.scraper.scrape_pib_releases())

        logger.info(f"Total scraped entries: {len(all_entries)}")
        return all_entries

    def parse_pdfs(self, pdf_dir: str | Path | None = None) -> list[dict]:
        """Parse all PDFs in the sources directory."""
        if pdf_dir is None:
            pdf_dir = self.kb_dir / "sources"

        pdf_dir = Path(pdf_dir)
        entries = []

        if pdf_dir.exists():
            for pdf_file in pdf_dir.glob("*.pdf"):
                logger.info(f"Parsing PDF: {pdf_file.name}")
                text = self.pdf_parser.parse(pdf_file)
                if text:
                    entries.append(
                        {
                            "title": pdf_file.stem,
                            "text": text,
                            "url": str(pdf_file),
                            "source": "Local PDF",
                            "date": datetime.now().strftime("%Y-%m-%d"),
                            "doc_type": "official",
                        }
                    )

        logger.info(f"Parsed {len(entries)} PDFs")
        return entries

    def build(self, include_pdfs: bool = True) -> int:
        """
        Full build pipeline:
        1. Scrape sources
        2. Parse PDFs
        3. Chunk all text
        4. Embed with bge-m3
        5. Index in FAISS + BM25
        Returns: number of chunks indexed
        """
        logger.info("=" * 60)
        logger.info("Building Knowledge Base")
        logger.info("=" * 60)

        # 1. Scrape
        entries = self.scrape_all_sources()

        # 2. Parse PDFs
        if include_pdfs:
            entries.extend(self.parse_pdfs())

        if not entries:
            logger.warning("No entries found! Adding seed data for demo.")
            entries = self._get_seed_data()

        # 3. Chunk
        self.documents = []
        for entry in tqdm(entries, desc="Chunking"):
            full_text = f"{entry.get('title', '')}. {entry.get('text', '')}"
            chunks = self.chunker.chunk(
                full_text,
                source_url=entry.get("url", ""),
                scheme_name=entry.get("scheme_name", entry.get("title", "")),
                date=entry.get("date", ""),
                is_active=entry.get("is_active", True),
                doc_type=entry.get("doc_type", "official"),
            )
            self.documents.extend(chunks)

        logger.info(f"Total chunks: {len(self.documents)}")

        if not self.documents:
            logger.error("No documents to index!")
            return 0

        # Save documents
        self.save_documents()

        # 4. Embed
        logger.info("Embedding chunks with bge-m3...")
        texts = [doc.text for doc in self.documents]
        self.embeddings = self.embed_texts(texts)
        logger.info(f"Embeddings shape: {self.embeddings.shape}")

        # 5. Index
        self.build_faiss_index(self.embeddings)
        self.build_bm25()

        logger.info(f"Knowledge base built: {len(self.documents)} chunks indexed")
        return len(self.documents)

    # ── Persistence ──

    def save_documents(self):
        """Save document metadata to JSON."""
        docs_data = [doc.to_dict() for doc in self.documents]
        with open(self.docs_path, "w", encoding="utf-8") as f:
            json.dump(docs_data, f, ensure_ascii=False, indent=2)
        logger.info(f"Saved {len(docs_data)} documents to {self.docs_path}")

    def load_documents(self) -> bool:
        """Load documents from JSON."""
        if self.docs_path.exists():
            with open(self.docs_path, "r", encoding="utf-8") as f:
                docs_data = json.load(f)
            self.documents = [Document.from_dict(d) for d in docs_data]
            logger.info(f"Loaded {len(self.documents)} documents")
            return True
        return False

    # ── Seed Data (fallback for demo) ──

    @staticmethod
    def _get_seed_data() -> list[dict]:
        """Seed data from real Indian government schemes — for demo if scraping fails."""
        return [
            {
                "title": "PM Kisan Samman Nidhi Yojana",
                "text": (
                    "Under PM-KISAN scheme, income support of Rs. 6,000 per year is provided "
                    "to all land holding farmer families across the country in three equal "
                    "instalments of Rs. 2,000 each every four months. The scheme was launched "
                    "on 24th February 2019. The fund is directly transferred to the bank "
                    "accounts of the beneficiaries. State Government and UT administration "
                    "identify the farmer families eligible for support. Official website: "
                    "pmkisan.gov.in"
                ),
                "url": "https://pmkisan.gov.in",
                "source": "Official Government",
                "date": "2024-01-01",
                "doc_type": "official",
                "scheme_name": "PM-KISAN",
                "is_active": True,
            },
            {
                "title": "Ayushman Bharat - Pradhan Mantri Jan Arogya Yojana (PM-JAY)",
                "text": (
                    "Ayushman Bharat PM-JAY provides health insurance cover of Rs. 5 lakh per "
                    "family per year for secondary and tertiary hospitalization to over 12 crore "
                    "poor and vulnerable families. It is the world's largest health insurance "
                    "scheme. Beneficiaries can avail cashless treatment at any empanelled "
                    "hospital. Official website: pmjay.gov.in. The scheme does NOT provide "
                    "direct cash transfer or monthly pension."
                ),
                "url": "https://pmjay.gov.in",
                "source": "Official Government",
                "date": "2024-01-01",
                "doc_type": "official",
                "scheme_name": "PM-JAY",
                "is_active": True,
            },
            {
                "title": "Pradhan Mantri Ujjwala Yojana (PMUY)",
                "text": (
                    "PMUY provides free LPG connections to women from BPL households. Under "
                    "PMUY 2.0, beneficiaries get a deposit-free LPG connection with first refill "
                    "and hotplate free of cost. The scheme does NOT provide monthly cash "
                    "payments. Any message claiming cash transfer under Ujjwala is FALSE. "
                    "Official website: pmuy.gov.in"
                ),
                "url": "https://pmuy.gov.in",
                "source": "Official Government",
                "date": "2024-01-01",
                "doc_type": "official",
                "scheme_name": "PMUY",
                "is_active": True,
            },
            {
                "title": "PIB Fact Check - Common Scams",
                "text": (
                    "FAKE: Messages claiming government is providing free smartphones, laptops, "
                    "or Rs 6000 monthly to all citizens are FAKE. FAKE: Claims about PM Modi "
                    "announcing universal basic income of Rs 15,000/month are FALSE. FAKE: "
                    "WhatsApp forwards about free solar panels being distributed door-to-door "
                    "by government are MISLEADING. Always verify government scheme details at "
                    "myscheme.gov.in or pib.gov.in/factcheck"
                ),
                "url": "https://factcheck.pib.gov.in",
                "source": "PIB Fact Check",
                "date": "2024-01-01",
                "doc_type": "fact_check",
            },
            {
                "title": "PM Vishwakarma Yojana",
                "text": (
                    "PM Vishwakarma provides support to artisans and craftspeople working with "
                    "their hands and tools. Benefits include: recognition through PM Vishwakarma "
                    "certificate and ID card, skill upgradation, toolkit incentive of Rs 15,000, "
                    "collateral-free credit support up to Rs 1 lakh (first tranche) and Rs 2 lakh "
                    "(second tranche) at concessional interest rate of 5%, and digital incentive. "
                    "The scheme is for 18 identified trades including carpenter, blacksmith, "
                    "goldsmith, potter, sculptor, cobbler, tailor, and others. Claims of Rs 5 lakh "
                    "direct transfer are FALSE."
                ),
                "url": "https://pmvishwakarma.gov.in",
                "source": "Official Government",
                "date": "2024-01-01",
                "doc_type": "official",
                "scheme_name": "PM Vishwakarma",
                "is_active": True,
            },
            {
                "title": "Sukanya Samriddhi Yojana (SSY)",
                "text": (
                    "Sukanya Samriddhi Yojana is a savings scheme for the girl child under "
                    "Beti Bachao Beti Padhao campaign. It offers interest rate of 8.2% per annum "
                    "(as of Q1 2024). Minimum deposit Rs 250 per year, maximum Rs 1.5 lakh. "
                    "Account can be opened for a girl child below 10 years of age. The maturity "
                    "period is 21 years from opening. Tax benefits under Section 80C. Claims "
                    "about government doubling SSY deposits or providing bonus payments are "
                    "MISINFORMATION."
                ),
                "url": "https://www.india.gov.in/sukanya-samriddhi-yojna",
                "source": "Official Government",
                "date": "2024-01-01",
                "doc_type": "official",
                "scheme_name": "SSY",
                "is_active": True,
            },
            {
                "title": "Digital India Scam Awareness",
                "text": (
                    "SCAM ALERT: Messages claiming free data or free recharge from Jio, Airtel, "
                    "or government under Digital India programme are SCAMS. The Digital India "
                    "programme focuses on digital infrastructure, digital governance, and digital "
                    "empowerment. It does NOT provide free mobile data, recharges, or smartphones "
                    "to citizens. Clicking on links in such messages may lead to phishing "
                    "websites that steal personal information. Report such messages to "
                    "cybercrime.gov.in or call 1930."
                ),
                "url": "https://www.digitalindia.gov.in",
                "source": "PIB Fact Check",
                "date": "2024-01-01",
                "doc_type": "fact_check",
            },
            {
                "title": "Aadhaar Fraud Prevention",
                "text": (
                    "UIDAI never asks for Aadhaar OTP over phone or WhatsApp. Sharing Aadhaar "
                    "OTP can lead to identity theft and financial fraud. No government official "
                    "will ask you to share your Aadhaar number, OTP, or biometrics over phone. "
                    "Messages claiming Aadhaar card will be deactivated if not linked to mobile "
                    "number within 24 hours are FAKE. To lock/unlock Aadhaar biometrics, visit "
                    "uidai.gov.in. Report Aadhaar misuse at 1947 helpline."
                ),
                "url": "https://uidai.gov.in",
                "source": "Official Government",
                "date": "2024-01-01",
                "doc_type": "official",
                "scheme_name": "Aadhaar",
                "is_active": True,
            },
        ]
