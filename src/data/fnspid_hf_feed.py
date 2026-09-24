import json
import hashlib
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Optional, Set
import urllib.request
import pandas as pd
import pyarrow.parquet as pq

from src.config import (
    RAW_HISTORICAL_DIR,
    ALL_TICKERS,
    FNSPID_HF_REPO
)
from src.data.schemas import CanonicalArticle
from src.utils.logger import get_logger

logger = get_logger("data.fnspid_hf_feed")

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

def download_fnspid_parquet_shards(
    repo: str = FNSPID_HF_REPO,
    max_shards: int = 2,
    output_dir: Path = RAW_HISTORICAL_DIR
) -> List[Path]:
    """
    Downloads real multi-year financial news Parquet shards from HuggingFace dataset repo.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    downloaded_paths = []

    logger.info(f"Phase 1: Fetching HuggingFace FNSPID shards (repo: {repo}, max_shards: {max_shards})...")

    for i in range(max_shards):
        shard_filename = f"fnspid_hf_shard_{i}.parquet"
        dest_path = output_dir / shard_filename
        if dest_path.exists():
            logger.info(f"Shard {i} already present at {dest_path}")
            downloaded_paths.append(dest_path)
            continue

        shard_name = f"train-{i:05d}-of-00048.parquet" if "nasdaq" in repo else f"train-{i:05d}-of-00044.parquet"
        url = f"https://huggingface.co/datasets/{repo}/resolve/main/data/{shard_name}"

        try:
            logger.info(f"Downloading HuggingFace shard {i}: {url}")
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=180) as resp:
                data = resp.read()
                with open(dest_path, "wb") as f:
                    f.write(data)
                logger.info(f"Successfully downloaded shard {i} ({len(data)/1024/1024:.2f} MB) to {dest_path}")
                downloaded_paths.append(dest_path)
        except Exception as e:
            logger.warning(f"Failed downloading HuggingFace shard {i}: {e}. Trying fallback FNSPID URL...")
            # Fallback URL
            alt_url = f"https://raw.githubusercontent.com/Zdong104/FNSPID_Financial_News_Dataset/main/dataset_test/merged_eval_data_{i+25}.csv"
            try:
                alt_dest = output_dir / f"fnspid_alt_eval_{i}.csv"
                req_alt = urllib.request.Request(alt_url, headers=HEADERS)
                with urllib.request.urlopen(req_alt, timeout=30) as alt_resp:
                    content = alt_resp.read()
                    with open(alt_dest, "wb") as f:
                        f.write(content)
                    logger.info(f"Downloaded fallback FNSPID CSV dataset ({len(content)/1024:.1f} KB) to {alt_dest}")
                    downloaded_paths.append(alt_dest)
            except Exception as ex:
                logger.error(f"Fallback also failed for shard {i}: {ex}")

    return downloaded_paths

def parse_fnspid_shard(
    file_path: Path,
    target_tickers: Optional[Set[str]] = None
) -> List[CanonicalArticle]:
    """
    Parses FNSPID Parquet/CSV shard into CanonicalArticle list.
    """
    articles = []
    if not file_path.exists():
        return articles

    allowed_tickers = target_tickers or set(ALL_TICKERS)
    allowed_tickers.add("GENERAL")

    try:
        if file_path.suffix == ".parquet":
            df = pd.read_parquet(file_path)
        else:
            df = pd.read_csv(file_path)

        col_map = {str(col).lower().strip(): col for col in df.columns}
        ticker_col = col_map.get("stock_symbol") or col_map.get("ticker") or col_map.get("symbol")
        date_col = col_map.get("date") or col_map.get("published_at") or col_map.get("time")
        title_col = col_map.get("article_title") or col_map.get("title") or col_map.get("headline")
        text_col = col_map.get("article") or col_map.get("text") or col_map.get("description")
        url_col = col_map.get("url") or col_map.get("link")

        sentiment_col = col_map.get("sentiment_score") or col_map.get("sentiment")

        for _, row in df.iterrows():
            ticker = str(row.get(ticker_col, "GENERAL")).strip().upper() if ticker_col else "GENERAL"
            if allowed_tickers and ticker not in allowed_tickers and ticker != "GENERAL":
                continue

            title = str(row.get(title_col, "")).strip() if title_col else ""
            if not title:
                continue

            raw_text = str(row.get(text_col, title)).strip() if text_col else title
            raw_date = str(row.get(date_col, "")).strip() if date_col else ""

            # ISO date parsing
            try:
                dt = pd.to_datetime(raw_date, utc=True)
                iso_date = dt.strftime("%Y-%m-%dT%H:%M:%SZ")
            except Exception:
                iso_date = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

            url = str(row.get(url_col, "")) if url_col else ""
            art_id = CanonicalArticle.generate_id("FNSPID", ticker, iso_date, title)

            extra = {"shard_file": file_path.name}
            if sentiment_col and pd.notna(row.get(sentiment_col)):
                extra["fnspid_sentiment"] = float(row[sentiment_col])

            articles.append(CanonicalArticle(
                article_id=art_id,
                ticker=ticker,
                published_at=iso_date,
                source="FNSPID",
                title=title,
                raw_text=raw_text,
                url=url,
                extra_metadata=json.dumps(extra)
            ))
    except Exception as e:
        logger.error(f"Error parsing FNSPID shard {file_path}: {e}")

    logger.info(f"Extracted {len(articles)} canonical articles from {file_path.name}")
    return articles
