import argparse
import subprocess
import sys
import time
from pathlib import Path
import pandas as pd

# Setup sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.config import (
    ALL_TICKERS,
    DEFAULT_TICKERS,
    EXTRACTED_ARTICLES_FILE,
    CHUNKS_FILE,
    OHLCV_FILE,
    CORRELATION_RESULTS_FILE,
    API_PORT,
    DASHBOARD_PORT
)
from src.data.database import init_db, get_connection
from src.data.download import download_live_rss, fetch_historical_fnspid_sample
from src.data.extract import ExtractionPipeline
from src.pipeline.clean_chunk import process_and_chunk_dataset
from src.pipeline.embeddings import EmbeddingEngine
from src.pipeline.vector_store import QdrantVectorStore
from src.pipeline.price_feed import fetch_daily_ohlcv
from src.analytics.correlation import CorrelationEngine
from src.utils.logger import get_logger

logger = get_logger("platform_orchestrator")

def run_full_computation(tickers=None, force=False):
    """Executes the complete computational pipeline end-to-end on 100% real-world data."""
    target_tickers = tickers or ALL_TICKERS
    init_db()

    logger.info("=================================================================")
    logger.info("STAGE 1: REAL-WORLD DATA EXTRACTION")
    logger.info("=================================================================")
    if force or not EXTRACTED_ARTICLES_FILE.exists():
        logger.info("Extracting raw RSS feeds and real historical news datasets...")
        if not force:
            download_live_rss(tickers=target_tickers)
            fetch_historical_fnspid_sample(tickers=target_tickers)
        extractor = ExtractionPipeline(target_tickers=target_tickers)
        extractor.run(include_rss=True, include_historical=True)
    else:
        logger.info(f"Using existing extracted articles from {EXTRACTED_ARTICLES_FILE}")

    logger.info("=================================================================")
    logger.info("STAGE 2: CLEANING, DEDUPLICATION & PASSAGE CHUNKING")
    logger.info("=================================================================")
    chunks_df = process_and_chunk_dataset(
        input_parquet=EXTRACTED_ARTICLES_FILE,
        output_parquet=CHUNKS_FILE
    )

    logger.info("=================================================================")
    logger.info("STAGE 3: DENSE EMBEDDINGS & QDRANT VECTOR UPSERT")
    logger.info("=================================================================")
    emb_engine = EmbeddingEngine.get_instance()
    texts_to_embed = [f"{row['title']}. {row['chunk_text']}" for _, row in chunks_df.iterrows()]
    embeddings = emb_engine.embed_texts(texts_to_embed, batch_size=64)

    qdrant = QdrantVectorStore.get_instance()
    qdrant.upsert_chunks(chunks_df, embeddings, batch_size=128)

    logger.info("=================================================================")
    logger.info("STAGE 4: MARKET PRICE DATA INGESTION (REAL OHLCV VIA YFINANCE)")
    logger.info("=================================================================")
    if force or not OHLCV_FILE.exists():
        prices_df = fetch_daily_ohlcv(tickers=target_tickers, period="2y")
    else:
        logger.info(f"Using existing OHLCV prices from {OHLCV_FILE}")
        prices_df = pd.read_parquet(OHLCV_FILE)

    logger.info("=================================================================")
    logger.info("STAGE 5: TIME-SERIES LEAD-LAG CROSS-CORRELATION & BACKTEST ENGINE")
    logger.info("=================================================================")
    corr_engine = CorrelationEngine()
    corr_results = corr_engine.run_all(
        chunks_df=chunks_df,
        embeddings=embeddings,
        prices_df=prices_df,
        tickers=target_tickers
    )

    logger.info("=================================================================")
    logger.info("COMPUTATION COMPLETE FOR ALL MODULES!")
    logger.info(f"- Processed Articles: {len(chunks_df)}")
    logger.info(f"- Vector Store Points: {qdrant.get_collection_stats()['vectors_count']}")
    logger.info(f"- Correlation Output: {CORRELATION_RESULTS_FILE}")
    logger.info("=================================================================")

def main():
    parser = argparse.ArgumentParser(description="Algorithmic Market Sentiment & News Vector Correlation Platform")
    parser.add_argument("--compute-only", action="store_true", help="Run the full data/analytics computation without launching UI/API")
    parser.add_argument("--serve-api", action="store_true", help="Launch FastAPI server")
    parser.add_argument("--serve-dashboard", action="store_true", help="Launch Dashboard server")
    parser.add_argument("--force-recompute", action="store_true", help="Force recomputation even if data already exists")
    parser.add_argument("--tickers", type=str, default="", help="Comma-separated tickers")
    args = parser.parse_args()

    tickers = [t.strip().upper() for t in args.tickers.split(",") if t.strip()] if args.tickers else None

    # If no specific service requested, run computation first
    if args.compute_only or (not args.serve_api and not args.serve_dashboard):
        run_full_computation(tickers=tickers, force=args.force_recompute)

    if args.serve_api or args.serve_dashboard:
        logger.info(f"Starting FastAPI & Dashboard server on port {API_PORT}...")
        subprocess.run([sys.executable, "-m", "uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", str(API_PORT)])

if __name__ == "__main__":
    main()
