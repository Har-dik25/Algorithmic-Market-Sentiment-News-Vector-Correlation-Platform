import argparse
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.config import ALL_TICKERS, EXTRACTED_ARTICLES_FILE, EXTRACTION_REPORT_FILE
from src.data.download import download_live_rss, fetch_historical_fnspid_sample
from src.data.extract import ExtractionPipeline
from src.data.validators import validate_extracted_dataset
from src.utils.logger import get_logger

logger = get_logger("run_extraction")

def main():
    parser = argparse.ArgumentParser(
        description="Real-World Financial News Data Acquisition & Extraction Pipeline (Hardik - Part 1)"
    )
    parser.add_argument(
        "--source",
        choices=["live", "historical", "all"],
        default="all",
        help="Data source mode: 'live' (live RSS per ticker), 'historical' (real FNSPID dataset), or 'all' (both)"
    )
    parser.add_argument(
        "--tickers",
        type=str,
        default="",
        help="Comma-separated list of equity tickers (e.g., 'AAPL,MSFT,NVDA,GOOGL'). Defaults to all 16 universe tickers."
    )
    parser.add_argument(
        "--no-download",
        action="store_true",
        help="Skip download phase and extract only from existing files in data/raw/"
    )
    parser.add_argument(
        "--output",
        type=str,
        default=str(EXTRACTED_ARTICLES_FILE),
        help="Path to output Parquet file"
    )

    args = parser.parse_args()

    # Determine tickers to process
    if args.tickers.strip():
        tickers = [t.strip().upper() for t in args.tickers.split(",") if t.strip()]
    else:
        tickers = ALL_TICKERS

    output_path = Path(args.output)

    logger.info("=" * 65)
    logger.info("STARTING REAL-WORLD DATA EXTRACTION PIPELINE")
    logger.info(f"Target Universe: {tickers}")
    logger.info(f"Mode: {args.source} | Output: {output_path}")
    logger.info("=" * 65)

    # 1. Download Phase
    if not args.no_download:
        if args.source in ("live", "all"):
            logger.info(">>> Phase 1A: Downloading Real-World Live News Feeds (Yahoo Finance / Wire)...")
            download_live_rss(tickers=tickers)

        if args.source in ("historical", "all"):
            logger.info(">>> Phase 1B: Fetching Real-World Historical News Dataset (FNSPID)...")
            fetch_historical_fnspid_sample(tickers=tickers)

    # 2. Extraction & Normalization Phase
    logger.info(">>> Phase 2: Running Extraction & Canonical Normalization Engine...")
    pipeline = ExtractionPipeline(target_tickers=tickers)
    include_rss = args.source in ("live", "all")
    include_historical = args.source in ("historical", "all")

    extracted_articles = pipeline.run(
        include_rss=include_rss,
        include_historical=include_historical,
        output_file=output_path
    )

    if not extracted_articles:
        logger.error("No articles extracted! Please check raw data directories or internet connection.")
        sys.exit(1)

    # 3. Validation & Reporting Phase
    logger.info(">>> Phase 3: Validating Dataset & Generating Quality Metrics Report...")
    report = validate_extracted_dataset(parquet_path=output_path, report_path=EXTRACTION_REPORT_FILE)

    logger.info("=" * 65)
    logger.info("EXTRACTION PIPELINE COMPLETED SUCCESSFULLY!")
    logger.info(f"Extracted Dataset: {output_path} ({len(extracted_articles)} records)")
    logger.info(f"Validation Report: {EXTRACTION_REPORT_FILE}")
    logger.info("Next Phase: Cleaning & Deduplication -> SentenceTransformers Embeddings -> Qdrant Handoff")
    logger.info("=" * 65)

if __name__ == "__main__":
    main()
