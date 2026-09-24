import sqlite3
import json
import os
from pathlib import Path
from src.config import DATA_DIR

DB_FILE = DATA_DIR / "data_store" / "correlation_platform.db"

def get_connection():
    DB_FILE.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_FILE))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database tables for prices, news vectors, articles, correlation cache, and ingestion status."""
    conn = get_connection()
    cursor = conn.cursor()

    # Price time series table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS prices (
        ticker TEXT NOT NULL,
        date TEXT NOT NULL,
        open REAL,
        high REAL,
        low REAL,
        close REAL,
        volume REAL,
        returns REAL,
        log_returns REAL,
        PRIMARY KEY (ticker, date)
    )
    """)

    # Daily aggregated news vector signal
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS news_vector_signals (
        ticker TEXT NOT NULL,
        date TEXT NOT NULL,
        signal_value REAL NOT NULL,
        centroid_drift REAL NOT NULL,
        avg_sentiment REAL NOT NULL,
        article_count INTEGER NOT NULL,
        top_keywords_json TEXT,
        vector_json TEXT,
        PRIMARY KEY (ticker, date)
    )
    """)

    # Individual news articles (Handoff contract)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS articles (
        article_id TEXT PRIMARY KEY,
        ticker TEXT NOT NULL,
        published_at TEXT NOT NULL,
        date TEXT NOT NULL,
        headline TEXT NOT NULL,
        source TEXT,
        raw_text_snippet TEXT,
        sentiment_score REAL,
        embedding_json TEXT
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_articles_ticker_date ON articles(ticker, date)")

    # Precomputed Correlation Results Cache
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS correlation_results (
        ticker TEXT PRIMARY KEY,
        calculated_at TEXT NOT NULL,
        lag_min INTEGER NOT NULL,
        lag_max INTEGER NOT NULL,
        optimal_lag INTEGER NOT NULL,
        max_correlation REAL NOT NULL,
        lead_lag_classification TEXT NOT NULL,
        p_value_at_optimal REAL NOT NULL,
        sample_size INTEGER NOT NULL,
        lags_json TEXT NOT NULL,
        pearson_r_json TEXT NOT NULL,
        spearman_rho_json TEXT NOT NULL,
        p_values_json TEXT NOT NULL,
        ci_lower_json TEXT NOT NULL,
        ci_upper_json TEXT NOT NULL,
        backtest_accuracy REAL
    )
    """)

    # System Health & Ingestion Log
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ingestion_logs (
        source_name TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        records_count INTEGER NOT NULL,
        last_run_at TEXT NOT NULL,
        details TEXT
    )
    """)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print(f"Database schema initialized successfully at {DB_FILE}")
