import email.utils
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Optional, Any, Set
import xml.etree.ElementTree as ET

import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

from src.config import (
    RAW_DIR,
    RAW_RSS_DIR,
    RAW_HISTORICAL_DIR,
    EXTRACTED_ARTICLES_FILE,
    ALL_TICKERS,
    TICKER_UNIVERSE
)
from src.data.schemas import CanonicalArticle, CANONICAL_ARROW_SCHEMA
from src.data.fnspid_hf_feed import parse_fnspid_shard
from src.data.edgar_feed import SECEdgarIngestor
from src.data.nse_feed import NSEIndiaIngestor
from src.utils.logger import get_logger

logger = get_logger("data.extract")

def parse_rfc2822_or_iso_date(date_str: str) -> str:
    """Standardizes date strings to UTC ISO format: YYYY-MM-DDTHH:MM:SSZ."""
    if not date_str or not date_str.strip():
        return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    
    clean_str = date_str.strip()
    try:
        dt = email.utils.parsedate_to_datetime(clean_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    except Exception:
        pass

    for fmt in (
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
        "%m/%d/%Y %H:%M:%S",
        "%m/%d/%Y",
        "%d-%b-%Y"
    ):
        try:
            dt = datetime.strptime(clean_str, fmt)
            dt = dt.replace(tzinfo=timezone.utc)
            return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        except ValueError:
            continue

    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

class RSSExtractor:
    """Extracts canonical articles from raw RSS XML files."""
    
    @staticmethod
    def extract_from_file(xml_path: Path, ticker_hint: Optional[str] = None) -> List[CanonicalArticle]:
        articles: List[CanonicalArticle] = []
        if not xml_path.exists():
            return articles

        ticker = ticker_hint
        if not ticker:
            filename_parts = xml_path.stem.split("_")
            if filename_parts and filename_parts[0].upper() in set(ALL_TICKERS):
                ticker = filename_parts[0].upper()
            else:
                ticker = "GENERAL"

        source_name = "News Feed"
        stem_lower = xml_path.stem.lower()
        if "yahoo" in stem_lower:
            source_name = "Yahoo Finance"
        elif "cnbc" in stem_lower:
            source_name = "CNBC"
        elif "marketwatch" in stem_lower:
            source_name = "MarketWatch"
        elif "google" in stem_lower:
            source_name = "Google News"
        elif "reuters" in stem_lower:
            source_name = "Reuters"

        try:
            tree = ET.parse(xml_path)
            root = tree.getroot()
            for item in root.findall(".//item"):
                title = (item.findtext("title") or "").strip()
                link = (item.findtext("link") or "").strip()
                description = (item.findtext("description") or "").strip()
                pub_date_raw = (item.findtext("pubDate") or "").strip()

                if not title:
                    continue

                published_at = parse_rfc2822_or_iso_date(pub_date_raw)
                article_id = CanonicalArticle.generate_id(source_name, ticker, published_at, title)

                articles.append(CanonicalArticle(
                    article_id=article_id,
                    ticker=ticker,
                    published_at=published_at,
                    source=source_name,
                    title=title,
                    raw_text=description or title,
                    url=link,
                    extra_metadata=json.dumps({"xml_file": xml_path.name})
                ))
        except Exception as e:
            logger.error(f"Error parsing RSS XML {xml_path}: {e}")

        return articles

class FNSPIDExtractor:
    """Extracts canonical articles from real FNSPID CSV/Parquet archives."""
    
    @staticmethod
    def extract_from_file(file_path: Path, target_tickers: Optional[Set[str]] = None) -> List[CanonicalArticle]:
        return parse_fnspid_shard(file_path, target_tickers)

class ExtractionPipeline:
    """Orchestrates extraction across all 4 phases into a unified Parquet store."""

    def __init__(self, target_tickers: Optional[List[str]] = None):
        self.target_tickers = set(t.upper() for t in (target_tickers or ALL_TICKERS))
        self.target_tickers.add("GENERAL")

    def run(
        self,
        include_rss: bool = True,
        include_historical: bool = True,
        include_edgar: bool = True,
        include_nse: bool = True,
        output_file: Optional[Path] = None
    ) -> List[CanonicalArticle]:
        out_path = output_file or EXTRACTED_ARTICLES_FILE
        all_articles: List[CanonicalArticle] = []
        seen_ids: Set[str] = set()

        # Phase 1: Live RSS Feeds & HuggingFace Historical Datasets
        if include_rss and RAW_RSS_DIR.exists():
            rss_files = list(RAW_RSS_DIR.glob("*.xml"))
            logger.info(f"Extracting articles from {len(rss_files)} live RSS XML files...")
            for f in rss_files:
                for art in RSSExtractor.extract_from_file(f):
                    if art.article_id not in seen_ids:
                        seen_ids.add(art.article_id)
                        all_articles.append(art)

        if include_historical and RAW_HISTORICAL_DIR.exists():
            hist_files = list(RAW_HISTORICAL_DIR.glob("*.csv")) + list(RAW_HISTORICAL_DIR.glob("*.parquet"))
            logger.info(f"Phase 1: Extracting articles from {len(hist_files)} historical shards...")
            for f in hist_files:
                for art in parse_fnspid_shard(f, self.target_tickers):
                    if art.article_id not in seen_ids:
                        seen_ids.add(art.article_id)
                        all_articles.append(art)

        # Phase 2: SEC EDGAR Corporate Filings
        if include_edgar:
            logger.info("Phase 2: Ingesting SEC EDGAR Corporate Filings (10-K & 10-Q MD&A)...")
            edgar_arts = SECEdgarIngestor.ingest_all_supported_tickers()
            for art in edgar_arts:
                if art.article_id not in seen_ids:
                    seen_ids.add(art.article_id)
                    all_articles.append(art)

        # Phase 3: Indian Equities Markets Feeds
        if include_nse:
            logger.info("Phase 3: Ingesting Indian Equities & Nifty 50 News Feeds...")
            nse_arts = NSEIndiaIngestor.fetch_indian_news()
            for art in nse_arts:
                if art.article_id not in seen_ids:
                    seen_ids.add(art.article_id)
                    all_articles.append(art)

        logger.info(f"Extraction Pipeline Complete: {len(all_articles)} total unique canonical articles collected across all 4 phases.")

        if all_articles:
            self.save_to_parquet(all_articles, out_path)

        return all_articles

    @staticmethod
    def save_to_parquet(articles: List[CanonicalArticle], output_path: Path):
        """Saves canonical articles to Parquet using strict canonical schema."""
        output_path.parent.mkdir(parents=True, exist_ok=True)
        data_dict = {
            "article_id": [a.article_id for a in articles],
            "ticker": [a.ticker for a in articles],
            "published_at": [a.published_at for a in articles],
            "source": [a.source for a in articles],
            "title": [a.title for a in articles],
            "raw_text": [a.raw_text for a in articles],
            "url": [a.url for a in articles],
            "extra_metadata": [a.extra_metadata for a in articles]
        }
        table = pa.Table.from_pydict(data_dict, schema=CANONICAL_ARROW_SCHEMA)
        pq.write_table(table, output_path, compression="snappy")
        logger.info(f"Saved {len(articles)} extracted articles to Parquet at {output_path}")
