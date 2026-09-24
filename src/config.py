from pathlib import Path
from typing import List, Dict, Any

# Paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
RAW_RSS_DIR = RAW_DIR / "rss"
RAW_HISTORICAL_DIR = RAW_DIR / "historical"
EXTRACTED_DIR = DATA_DIR / "extracted"
PROCESSED_DIR = DATA_DIR / "processed"
PRICES_DIR = DATA_DIR / "prices"
ANALYTICS_DIR = DATA_DIR / "analytics"
DATA_STORE_DIR = DATA_DIR / "data_store"
QDRANT_STORAGE_DIR = Path.home() / ".market_vector_qdrant"  # Outside OneDrive to avoid sync lock conflicts

# Ensure all essential directories exist
for directory in [
    DATA_DIR, RAW_DIR, RAW_RSS_DIR, RAW_HISTORICAL_DIR,
    EXTRACTED_DIR, PROCESSED_DIR, PRICES_DIR, ANALYTICS_DIR, DATA_STORE_DIR, QDRANT_STORAGE_DIR
]:
    directory.mkdir(parents=True, exist_ok=True)

# Expanded Real-World Ticker Universe (US Equities, Indian Nifty 50, Crypto, Global Indices)
DEFAULT_TICKERS: List[Dict[str, str]] = [
    # US Mega-Cap Tech & AI
    {"symbol": "NVDA", "name": "NVIDIA Corporation", "sector": "Semiconductors & AI"},
    {"symbol": "AAPL", "name": "Apple Inc.", "sector": "Consumer Electronics"},
    {"symbol": "MSFT", "name": "Microsoft Corporation", "sector": "Software & Cloud"},
    {"symbol": "TSLA", "name": "Tesla, Inc.", "sector": "Automotive / EV"},
    {"symbol": "AMZN", "name": "Amazon.com, Inc.", "sector": "E-Commerce & Cloud"},
    {"symbol": "GOOGL", "name": "Alphabet Inc.", "sector": "Search & AI"},
    {"symbol": "META", "name": "Meta Platforms Inc.", "sector": "Social Media & AI"},
    {"symbol": "AMD", "name": "Advanced Micro Devices", "sector": "Semiconductors & AI"},
    {"symbol": "INTC", "name": "Intel Corporation", "sector": "Semiconductors"},
    {"symbol": "NFLX", "name": "Netflix, Inc.", "sector": "Digital Media & Streaming"},
    {"symbol": "AVGO", "name": "Broadcom Inc.", "sector": "Semiconductors"},
    {"symbol": "ORCL", "name": "Oracle Corporation", "sector": "Enterprise Software"},
    {"symbol": "PLTR", "name": "Palantir Technologies", "sector": "AI Analytics"},
    
    # Financials & Global Banking
    {"symbol": "JPM", "name": "JPMorgan Chase & Co.", "sector": "Banking & Finance"},
    {"symbol": "BAC", "name": "Bank of America Corp.", "sector": "Banking & Finance"},
    {"symbol": "GS", "name": "The Goldman Sachs Group", "sector": "Investment Banking"},

    # Indian Equities & Nifty 50 Large-Caps
    {"symbol": "RELIANCE.NS", "name": "Reliance Industries", "sector": "Energy & Telecom (India)"},
    {"symbol": "TCS.NS", "name": "Tata Consultancy Services", "sector": "IT Services (India)"},
    {"symbol": "INFY.NS", "name": "Infosys Limited", "sector": "IT Services (India)"},
    {"symbol": "HDFCBANK.NS", "name": "HDFC Bank Limited", "sector": "Banking & Finance (India)"},
    {"symbol": "ICICIBANK.NS", "name": "ICICI Bank Limited", "sector": "Banking & Finance (India)"},

    # Crypto, Commodities & Global Indices
    {"symbol": "^GSPC", "name": "S&P 500 Index", "sector": "Global Macro Indices"},
    {"symbol": "^NDX", "name": "Nasdaq 100 Index", "sector": "Global Macro Indices"},
    {"symbol": "BTC-USD", "name": "Bitcoin USD", "sector": "Crypto & Digital Assets"},
    {"symbol": "GC=F", "name": "Gold Futures", "sector": "Commodities & Macro"}
]

# Ticker Universe grouped by sector for legacy endpoints
TICKER_UNIVERSE: Dict[str, List[str]] = {}
for item in DEFAULT_TICKERS:
    sec = item["sector"]
    if sec not in TICKER_UNIVERSE:
        TICKER_UNIVERSE[sec] = []
    TICKER_UNIVERSE[sec].append(item["symbol"])

# Flattened list of all active ticker symbols
ALL_TICKERS: List[str] = [t["symbol"] for t in DEFAULT_TICKERS]
SECTORS: List[str] = sorted(list(set(t['sector'] for t in DEFAULT_TICKERS)))

# Database
DB_FILE = DATA_STORE_DIR / "correlation_platform.db"
DATABASE_URL = f"sqlite:///{DB_FILE}"

# Real-World News Feed Templates
YAHOO_RSS_TEMPLATE = "https://finance.yahoo.com/rss/headline?s={ticker}"
GOOGLE_NEWS_RSS_TEMPLATE = "https://news.google.com/rss/search?q={ticker}+stock+when:7d&hl=en-US&gl=US&ceid=US:en"

# Historical Dataset References
FNSPID_HF_REPO = "sabareesh88/FNSPID_nasdaq"
FNSPID_OFFICIAL_REPO = "Zihan1004/FNSPID"

# Downstream Handoff Files & Paths
EXTRACTED_ARTICLES_FILE = EXTRACTED_DIR / "articles.parquet"
EXTRACTION_REPORT_FILE = EXTRACTED_DIR / "extraction_report.json"
CHUNKS_FILE = PROCESSED_DIR / "chunks.parquet"

# Embedding & Vector DB Config
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384
QDRANT_COLLECTION_NAME = "news_embeddings"

# Market Prices & Analytics
OHLCV_FILE = PRICES_DIR / "ohlcv.parquet"
DAILY_SIGNALS_FILE = ANALYTICS_DIR / "daily_signals.parquet"
CORRELATION_RESULTS_FILE = ANALYTICS_DIR / "correlations.json"

DEFAULT_LAG_RANGE = (-5, 5)
API_PORT = 8000
DASHBOARD_PORT = 8501
