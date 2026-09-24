import json
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import List, Dict, Optional
import pandas as pd
import yfinance as yf

from src.data.schemas import CanonicalArticle
from src.utils.logger import get_logger

logger = get_logger("data.nse_feed")

INDIAN_TICKERS = [
    {"symbol": "RELIANCE.NS", "name": "Reliance Industries Ltd", "sector": "Energy & Telecom (India)"},
    {"symbol": "TCS.NS", "name": "Tata Consultancy Services", "sector": "IT Services (India)"},
    {"symbol": "INFY.NS", "name": "Infosys Limited", "sector": "IT Services (India)"},
    {"symbol": "HDFCBANK.NS", "name": "HDFC Bank Limited", "sector": "Banking & Finance (India)"},
    {"symbol": "ICICIBANK.NS", "name": "ICICI Bank Limited", "sector": "Banking & Finance (India)"},
    {"symbol": "TATAMOTORS.NS", "name": "Tata Motors Limited", "sector": "Automotive (India)"},
    {"symbol": "SBIN.NS", "name": "State Bank of India", "sector": "Banking & Finance (India)"},
    {"symbol": "BHARTIARTL.NS", "name": "Bharti Airtel Limited", "sector": "Telecom (India)"}
]

INDIAN_RSS_FEEDS = {
    "Economic Times Markets": "https://news.google.com/rss/search?q=site:economictimes.com+stock+market+Nifty&hl=en-IN&gl=IN&ceid=IN:en",
    "Moneycontrol News": "https://news.google.com/rss/search?q=site:moneycontrol.com+stock+market+sensex&hl=en-IN&gl=IN&ceid=IN:en",
    "LiveMint Markets": "https://news.google.com/rss/search?q=site:livemint.com+market+stocks&hl=en-IN&gl=IN&ceid=IN:en"
}

class NSEIndiaIngestor:
    """
    Phase 3: Ingests NSE/BSE Indian equities price history and financial news feeds
    from official RSS sources and yfinance.
    """

    @staticmethod
    def fetch_indian_news() -> List[CanonicalArticle]:
        articles = []
        logger.info("Phase 3: Fetching Indian Equities & Nifty 50 market news feeds...")

        headers = {"User-Agent": "Mozilla/5.0"}
        for source_name, feed_url in INDIAN_RSS_FEEDS.items():
            try:
                req = urllib.request.Request(feed_url, headers=headers)
                with urllib.request.urlopen(req, timeout=10) as resp:
                    xml_data = resp.read()
                    tree = ET.fromstring(xml_data)

                    for idx, item in enumerate(tree.findall(".//item")[:20]):
                        title = (item.findtext("title") or "").strip()
                        pub_date = (item.findtext("pubDate") or "").strip()
                        link = (item.findtext("link") or "").strip()
                        
                        if not title:
                            continue

                        # Determine ticker tag
                        ticker_tag = "RELIANCE.NS"
                        title_upper = title.upper()
                        if "TCS" in title_upper or "TATA CONSULTANCY" in title_upper:
                            ticker_tag = "TCS.NS"
                        elif "INFOSYS" in title_upper or "INFY" in title_upper:
                            ticker_tag = "INFY.NS"
                        elif "HDFC" in title_upper:
                            ticker_tag = "HDFCBANK.NS"
                        elif "ICICI" in title_upper:
                            ticker_tag = "ICICIBANK.NS"
                        elif "TATA MOTORS" in title_upper:
                            ticker_tag = "TATAMOTORS.NS"

                        published_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                        art_id = CanonicalArticle.generate_id(source_name, ticker_tag, published_at, title)

                        articles.append(CanonicalArticle(
                            article_id=art_id,
                            ticker=ticker_tag,
                            published_at=published_at,
                            source=source_name,
                            title=title,
                            raw_text=title,
                            url=link,
                            extra_metadata=json.dumps({"region": "India", "exchange": "NSE"})
                        ))
                logger.info(f"[{source_name}] Retrieved {len(articles)} Indian financial articles.")
            except Exception as e:
                logger.warning(f"Error fetching Indian RSS feed {source_name}: {e}")

        return articles

    @staticmethod
    def fetch_nse_prices(period: str = "2y") -> pd.DataFrame:
        logger.info(f"Phase 3: Fetching NSE Bhavcopy OHLCV price series for Indian equities...")
        symbols = [t["symbol"] for t in INDIAN_TICKERS]
        all_dfs = []
        for sym in symbols:
            try:
                ticker = yf.Ticker(sym)
                hist = ticker.history(period=period, auto_adjust=True)
                if not hist.empty:
                    hist.reset_index(inplace=True)
                    date_col = "Date" if "Date" in hist.columns else hist.columns[0]
                    hist["date"] = pd.to_datetime(hist[date_col]).dt.strftime("%Y-%m-%d")
                    hist["ticker"] = sym.upper()
                    hist.rename(columns={"Open": "open", "High": "high", "Low": "low", "Close": "close", "Volume": "volume"}, inplace=True)
                    hist["returns"] = hist["close"].pct_change().fillna(0.0)
                    hist["log_return"] = np.log(hist["close"] / hist["close"].shift(1)).fillna(0.0)
                    all_dfs.append(hist[["date", "ticker", "open", "high", "low", "close", "volume", "returns", "log_return"]])
            except Exception as e:
                logger.warning(f"Error fetching NSE prices for {sym}: {e}")

        if all_dfs:
            return pd.concat(all_dfs, ignore_index=True)
        return pd.DataFrame()
