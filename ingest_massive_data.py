"""
Massive Multi-Phase Real-World Financial News & Corporate Data Ingester
Executes all 4 Real-World Data Expansion Phases:
- Phase 1: HuggingFace FNSPID Bulk Shards & Live RSS feeds
- Phase 2: SEC EDGAR Corporate Filings (10-K / 10-Q MD&A)
- Phase 3: Indian Equities (NSE Bhavcopy & Regional Financial News)
- Phase 4: Real-time Async Ingestion Queue Worker
"""
import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.config import ALL_TICKERS, RAW_RSS_DIR, RAW_HISTORICAL_DIR
from src.data.download import download_live_rss, fetch_historical_fnspid_sample
from src.data.fnspid_hf_feed import download_fnspid_parquet_shards
from src.data.edgar_feed import SECEdgarIngestor
from src.data.nse_feed import NSEIndiaIngestor
from src.data.extract import ExtractionPipeline
from src.pipeline.realtime_queue import RealtimeIngestionQueue
from src.utils.logger import get_logger

logger = get_logger("massive_ingester")

def run_all_4_phases(max_hf_shards: int = 2):
    logger.info("=" * 80)
    logger.info("EXECUTION OF ALL 4 REAL-WORLD DATA EXPANSION PHASES")
    logger.info("=" * 80)

    # Phase 1: HuggingFace FNSPID Bulk Dataset & Live RSS Feeds
    logger.info("--- PHASE 1: HUGGINGFACE FNSPID BULK DATASETS & LIVE RSS FEEDS ---")
    download_live_rss(tickers=ALL_TICKERS)
    download_fnspid_parquet_shards(max_shards=max_hf_shards)
    fetch_historical_fnspid_sample(tickers=ALL_TICKERS)

    # Phase 2: SEC EDGAR Corporate Filings (10-K / 10-Q MD&A Reports)
    logger.info("--- PHASE 2: SEC EDGAR CORPORATE FILINGS (10-K & 10-Q) ---")
    edgar_arts = SECEdgarIngestor.ingest_all_supported_tickers()
    logger.info(f"Phase 2 complete: Ingested {len(edgar_arts)} official SEC EDGAR filings.")

    # Phase 3: Indian Equities Markets Feeds & NSE Bhavcopy
    logger.info("--- PHASE 3: INDIAN EQUITIES & REGIONAL MARKETS (NSE BHAVCOPY) ---")
    nse_arts = NSEIndiaIngestor.fetch_indian_news()
    logger.info(f"Phase 3 complete: Ingested {len(nse_arts)} Indian financial market news items.")

    # Phase 4: Async Real-Time Ingestion Queue Worker
    logger.info("--- PHASE 4: ASYNC REAL-TIME INGESTION QUEUE WORKER ---")
    rt_queue = RealtimeIngestionQueue.get_instance()
    rt_queue.start_worker()
    
    # Push sample live streaming article item to queue
    rt_queue.push_article({
        "ticker": "NVDA",
        "title": "NVIDIA Unveils Next-Generation AI Supercomputing Architecture",
        "raw_text": "NVIDIA announced new high-performance AI chips driving record enterprise cloud demand.",
        "source": "Real-Time Streaming Queue",
        "url": "https://example.com/nvda-realtime"
    })
    time.sleep(2)
    rt_queue.stop_worker()

    # Unified Extraction Pipeline
    logger.info("--- UNIFIED PARQUET EXTRACTION PIPELINE ---")
    extractor = ExtractionPipeline(target_tickers=ALL_TICKERS)
    all_extracted = extractor.run(include_rss=True, include_historical=True, include_edgar=True, include_nse=True)

    logger.info("=" * 80)
    logger.info("ALL 4 REAL-WORLD DATA PHASES COMPLETED SUCCESSFULLY!")
    logger.info(f"Total Canonical Articles Extracted: {len(all_extracted)}")
    logger.info("Next: Run 'python run_platform.py --compute-only' to update vectors and correlation engine.")
    logger.info("=" * 80)

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Massive multi-phase real-world financial data ingester")
    parser.add_argument("--hf-shards", type=int, default=1, help="Number of HuggingFace FNSPID shards to download")
    args = parser.parse_args()

    run_all_4_phases(max_hf_shards=args.hf_shards)

if __name__ == "__main__":
    main()
