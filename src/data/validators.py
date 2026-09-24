import json
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any

import pandas as pd
import pyarrow.parquet as pq

from src.config import EXTRACTION_REPORT_FILE, EXTRACTED_ARTICLES_FILE
from src.data.schemas import CanonicalArticle
from src.utils.logger import get_logger

logger = get_logger("data.validators")

def validate_extracted_dataset(
    parquet_path: Path = EXTRACTED_ARTICLES_FILE,
    report_path: Path = EXTRACTION_REPORT_FILE
) -> Dict[str, Any]:
    """
    Validates the extracted Parquet dataset against data quality rules
    and generates an extraction report.
    """
    if not parquet_path.exists():
        raise FileNotFoundError(f"Parquet dataset not found at {parquet_path}")

    df = pd.read_parquet(parquet_path)
    total_records = len(df)

    if total_records == 0:
        logger.warning("Extracted dataset is empty!")
        return {"status": "FAILED", "reason": "0 records found"}

    # Quality checks
    null_ids = int(df["article_id"].isna().sum())
    unique_ids = int(df["article_id"].nunique())
    duplicate_ids = total_records - unique_ids
    empty_titles = int((df["title"].str.strip() == "").sum())
    empty_text = int((df["raw_text"].str.strip() == "").sum())

    # Timestamp validity check
    invalid_timestamps = 0
    valid_dates = []
    for ts in df["published_at"]:
        try:
            # Expect YYYY-MM-DDTHH:MM:SSZ
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            valid_dates.append(dt)
        except Exception:
            invalid_timestamps += 1

    earliest_date = min(valid_dates).isoformat() if valid_dates else None
    latest_date = max(valid_dates).isoformat() if valid_dates else None

    # Distributions
    ticker_counts = df["ticker"].value_counts().to_dict()
    source_counts = df["source"].value_counts().to_dict()

    quality_passed = (
        null_ids == 0 and
        duplicate_ids == 0 and
        empty_titles == 0 and
        invalid_timestamps == 0
    )

    report = {
        "status": "PASSED" if quality_passed else "WARNINGS_FOUND",
        "dataset_path": str(parquet_path),
        "total_articles": total_records,
        "unique_articles": unique_ids,
        "null_id_count": null_ids,
        "duplicate_id_count": duplicate_ids,
        "empty_title_count": empty_titles,
        "empty_text_count": empty_text,
        "invalid_timestamp_count": invalid_timestamps,
        "time_span": {
            "earliest": earliest_date,
            "latest": latest_date
        },
        "ticker_distribution": ticker_counts,
        "source_distribution": source_counts,
        "validated_at": datetime.now().isoformat()
    }

    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    logger.info("=== DATA EXTRACTION & QUALITY REPORT ===")
    logger.info(f"Status: {report['status']}")
    logger.info(f"Total Canonical Articles: {total_records}")
    logger.info(f"Unique Tickers Covered: {len(ticker_counts)}")
    logger.info(f"Time Range: {earliest_date} -> {latest_date}")
    logger.info(f"Quality Metrics: null_ids={null_ids}, duplicates={duplicate_ids}, invalid_dates={invalid_timestamps}")
    logger.info(f"Report saved to {report_path}")

    return report
