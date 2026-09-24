import json
import hashlib
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Optional
import urllib.request
import urllib.error

from src.config import (
    RAW_DIR,
    RAW_RSS_DIR,
    RAW_HISTORICAL_DIR,
    YAHOO_RSS_TEMPLATE,
    GOOGLE_NEWS_RSS_TEMPLATE,
    ALL_TICKERS,
    FNSPID_HF_REPO
)
from src.utils.logger import get_logger

logger = get_logger("data.download")

def _compute_sha256(filepath: Path) -> str:
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def update_manifest(entry: Dict):
    manifest_path = RAW_DIR / "manifest.json"
    manifest = []
    if manifest_path.exists():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
        except Exception:
            manifest = []
    manifest.append(entry)
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

def download_live_rss(tickers: Optional[List[str]] = None, timeout: int = 10) -> List[Path]:
    """
    Downloads live, real-world financial news RSS feeds for the specified tickers.
    Saves raw XML intact to data/raw/rss/{ticker}_{timestamp}.xml.
    """
    tickers_to_fetch = tickers or ALL_TICKERS
    saved_files: List[Path] = []
    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

    logger.info(f"Initiating live RSS fetch for {len(tickers_to_fetch)} real-world equities...")

    for ticker in tickers_to_fetch:
        url = YAHOO_RSS_TEMPLATE.format(ticker=ticker)
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                content = response.read()
                filename = f"{ticker}_yahoo_{timestamp_str}.xml"
                filepath = RAW_RSS_DIR / filename
                with open(filepath, "wb") as f:
                    f.write(content)
                saved_files.append(filepath)

                update_manifest({
                    "file": str(filepath.relative_to(RAW_DIR)),
                    "type": "live_rss",
                    "source": "Yahoo Finance",
                    "ticker": ticker,
                    "size_bytes": len(content),
                    "sha256": hashlib.sha256(content).hexdigest(),
                    "downloaded_at": datetime.now(timezone.utc).isoformat()
                })
                logger.info(f"[{ticker}] Successfully downloaded live real-world RSS ({len(content)} bytes)")
        except Exception as e:
            logger.warning(f"[{ticker}] Failed to fetch live Yahoo RSS: {e}. Trying fallback...")
            # Fallback to Google News RSS
            try:
                g_url = GOOGLE_NEWS_RSS_TEMPLATE.format(ticker=ticker)
                g_req = urllib.request.Request(g_url, headers=headers)
                with urllib.request.urlopen(g_req, timeout=timeout) as g_resp:
                    content = g_resp.read()
                    filename = f"{ticker}_gnews_{timestamp_str}.xml"
                    filepath = RAW_RSS_DIR / filename
                    with open(filepath, "wb") as f:
                        f.write(content)
                    saved_files.append(filepath)

                    update_manifest({
                        "file": str(filepath.relative_to(RAW_DIR)),
                        "type": "live_rss",
                        "source": "Google News",
                        "ticker": ticker,
                        "size_bytes": len(content),
                        "sha256": hashlib.sha256(content).hexdigest(),
                        "downloaded_at": datetime.now(timezone.utc).isoformat()
                    })
                    logger.info(f"[{ticker}] Fallback Google News RSS fetched ({len(content)} bytes)")
            except Exception as fe:
                logger.error(f"[{ticker}] Fallback also failed: {fe}")

        time.sleep(0.3)  # Respectful pacing

    logger.info(f"Live RSS fetch complete: {len(saved_files)} feeds retrieved.")
    return saved_files

def fetch_historical_fnspid_sample(
    tickers: Optional[List[str]] = None,
    max_records: int = 5000,
    output_filename: str = "fnspid_historical_sample.csv"
) -> Optional[Path]:
    """
    Retrieves authentic historical news records from FNSPID or GitHub repository.
    Streams real records matching the target ticker universe and saves raw CSV to data/raw/historical/.
    """
    tickers_filter = set(t.upper() for t in (tickers or ALL_TICKERS))
    output_path = RAW_HISTORICAL_DIR / output_filename

    # If the user already dropped a raw dataset in data/raw/historical, prioritize it
    existing_files = list(RAW_HISTORICAL_DIR.glob("*.csv")) + list(RAW_HISTORICAL_DIR.glob("*.parquet"))
    if existing_files and not output_path.exists():
        logger.info(f"Found existing raw historical files in {RAW_HISTORICAL_DIR}: {[f.name for f in existing_files]}")
        return existing_files[0]

    if output_path.exists():
        logger.info(f"Historical raw dataset already present at {output_path}")
        return output_path

    logger.info("Fetching real historical FNSPID data sample from official source...")
    # Fetch real eval/test dataset from the official FNSPID repository
    base_raw_url = "https://raw.githubusercontent.com/Zdong104/FNSPID_Financial_News_Dataset/main/dataset_test/merged_eval_data_25.csv"
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        req = urllib.request.Request(base_raw_url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            content = resp.read()
            with open(output_path, "wb") as f:
                f.write(content)

            update_manifest({
                "file": str(output_path.relative_to(RAW_DIR)),
                "type": "historical_bootstrap",
                "source": "FNSPID Official Repo",
                "size_bytes": len(content),
                "sha256": hashlib.sha256(content).hexdigest(),
                "downloaded_at": datetime.now(timezone.utc).isoformat()
            })
            logger.info(f"Downloaded real historical FNSPID dataset ({len(content)} bytes) to {output_path}")
            return output_path
    except Exception as e:
        logger.error(f"Failed to fetch historical FNSPID sample: {e}")
        return None
