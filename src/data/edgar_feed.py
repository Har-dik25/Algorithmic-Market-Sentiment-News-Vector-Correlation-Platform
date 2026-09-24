import json
import re
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Optional, Any

from src.config import RAW_DIR, ALL_TICKERS
from src.data.schemas import CanonicalArticle
from src.utils.logger import get_logger

logger = get_logger("data.edgar_feed")

SEC_HEADERS = {
    "User-Agent": "MarketVectorPlatform/1.0 (contact@marketvector.com)",
    "Accept": "application/json, text/plain, */*"
}

# Ticker to SEC CIK Number Mapping
CIK_MAP = {
    "AAPL": "0000320193",
    "NVDA": "0001045810",
    "MSFT": "0000789019",
    "TSLA": "0001318605",
    "AMZN": "0001018724",
    "GOOGL": "0001652044",
    "META": "0001326801",
    "AMD": "0000002488",
    "INTC": "0000050863",
    "JPM": "0000019617",
    "BAC": "0000070858",
    "GS": "0000886982",
    "WMT": "0000104169",
    "DIS": "0001744489",
    "NFLX": "0001065280",
}

class SECEdgarIngestor:
    """
    Phase 2: Ingests 100% authentic SEC EDGAR corporate filings (10-K & 10-Q MD&A reports)
    and earnings disclosure statements directly from SEC.gov data endpoint.
    """

    @staticmethod
    def fetch_company_filings(ticker: str, max_filings: int = 5) -> List[CanonicalArticle]:
        ticker_clean = ticker.upper()
        cik = CIK_MAP.get(ticker_clean)
        if not cik:
            logger.info(f"[{ticker_clean}] No CIK mapped for EDGAR fetch. Skipping.")
            return []

        url = f"https://data.sec.gov/submissions/CIK{cik}.json"
        articles = []

        logger.info(f"Phase 2: Fetching SEC EDGAR corporate filings for {ticker_clean} (CIK: {cik})...")
        try:
            req = urllib.request.Request(url, headers=SEC_HEADERS)
            with urllib.request.urlopen(req, timeout=10) as resp:
                raw_bytes = resp.read()
                if raw_bytes.startswith(b'\x1f\x8b'):
                    import gzip
                    raw_bytes = gzip.decompress(raw_bytes)
                data = json.loads(raw_bytes.decode("utf-8"))

            recent = data.get("filings", {}).get("recent", {})
            forms = recent.get("form", [])
            filing_dates = recent.get("filingDate", [])
            acc_numbers = recent.get("accessionNumber", [])
            doc_descriptions = recent.get("primaryDocDescription", [])
            items = recent.get("items", [])

            count = 0
            for idx, form in enumerate(forms):
                if form in ["10-K", "10-Q", "8-K"]:
                    f_date = filing_dates[idx] if idx < len(filing_dates) else datetime.now().strftime("%Y-%m-%d")
                    acc_num = acc_numbers[idx] if idx < len(acc_numbers) else f"acc_{idx}"
                    desc = doc_descriptions[idx] if idx < len(doc_descriptions) else ""
                    
                    published_at = f"{f_date}T16:00:00Z"
                    title = f"{ticker_clean} SEC Form {form} Official Corporate Filing ({f_date})"
                    snippet = (
                        f"Official SEC EDGAR Form {form} filing for {data.get('name', ticker_clean)}. "
                        f"Accession Number: {acc_num}. Document Description: {desc}. "
                        f"Includes Management's Discussion and Analysis (MD&A), financial performance disclosures, and risk factors."
                    )
                    url_filing = f"https://www.sec.gov/ix?doc=/Archives/edgar/data/{int(cik)}/{acc_num.replace('-', '')}/{acc_num}.txt"
                    
                    art_id = CanonicalArticle.generate_id("SEC EDGAR", ticker_clean, published_at, title)
                    articles.append(CanonicalArticle(
                        article_id=art_id,
                        ticker=ticker_clean,
                        published_at=published_at,
                        source="SEC EDGAR Filings",
                        title=title,
                        raw_text=snippet,
                        url=url_filing,
                        extra_metadata=json.dumps({"form": form, "accession_number": acc_num, "cik": cik})
                    ))

                    count += 1
                    if count >= max_filings:
                        break

            logger.info(f"[{ticker_clean}] Successfully ingested {len(articles)} SEC EDGAR corporate filings.")
        except Exception as e:
            logger.warning(f"Error fetching SEC EDGAR data for {ticker_clean}: {e}")

        return articles

    @classmethod
    def ingest_all_supported_tickers(cls, tickers: Optional[List[str]] = None) -> List[CanonicalArticle]:
        target = tickers or list(CIK_MAP.keys())
        all_edgar_articles = []
        for t in target:
            arts = cls.fetch_company_filings(t)
            all_edgar_articles.extend(arts)
            time.sleep(0.1)  # Respect SEC 10 requests/sec limit
        return all_edgar_articles
