from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional, Dict
import numpy as np
import pandas as pd
import yfinance as yf

from src.config import ALL_TICKERS, OHLCV_FILE, PRICES_DIR
from src.data.database import get_connection, init_db
from src.utils.logger import get_logger

logger = get_logger("pipeline.price_feed")

def save_prices_to_db(ticker: str, df: pd.DataFrame):
    """Persist OHLCV price series for a ticker to SQLite database."""
    if df.empty:
        return
    init_db()
    conn = get_connection()
    cursor = conn.cursor()
    for _, row in df.iterrows():
        ret = float(row.get('returns', row.get('simple_return', 0.0)))
        log_ret = float(row.get('log_return', 0.0))
        cursor.execute("""
        INSERT OR REPLACE INTO prices (ticker, date, open, high, low, close, volume, returns, log_returns)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            ticker.upper(),
            str(row['date']),
            float(row.get('open', row.get('close', 0.0))),
            float(row.get('high', row.get('close', 0.0))),
            float(row.get('low', row.get('close', 0.0))),
            float(row['close']),
            float(row.get('volume', 0.0)),
            ret,
            log_ret
        ))
    conn.commit()
    conn.close()

def get_prices_from_db(ticker: str, start_date: str = None, end_date: str = None) -> pd.DataFrame:
    """Retrieve OHLCV price series for a ticker from SQLite database."""
    init_db()
    conn = get_connection()
    query = "SELECT ticker, date, open, high, low, close, volume, returns, log_returns FROM prices WHERE ticker = ?"
    params = [ticker.upper()]
    if start_date:
        query += " AND date >= ?"
        params.append(start_date)
    if end_date:
        query += " AND date <= ?"
        params.append(end_date)
    query += " ORDER BY date ASC"

    df = pd.read_sql_query(query, conn, params=params)
    conn.close()
    return df

def fetch_daily_ohlcv(
    tickers: Optional[List[str]] = None,
    period: str = "2y",
    output_parquet: Path = OHLCV_FILE
) -> pd.DataFrame:
    """
    Ingests 100% real daily OHLCV equity price histories via Yahoo Finance (yfinance).
    Calculates log returns and daily volatility.
    Saves results to data/prices/ohlcv.parquet AND correlation_platform.db.
    """
    target_tickers = tickers or ALL_TICKERS
    logger.info(f"Ingesting real OHLCV price histories for {len(target_tickers)} tickers (period={period})...")

    all_dfs = []
    for ticker in target_tickers:
        try:
            logger.info(f"Downloading market price series for {ticker} via yfinance...")
            t = yf.Ticker(ticker)
            hist = t.history(period=period, interval="1d", auto_adjust=True)

            if hist.empty:
                logger.warning(f"No yfinance price data returned for {ticker}, trying fallback lookup...")
                start_dt = (datetime.now() - timedelta(days=730)).strftime("%Y-%m-%d")
                hist = yf.download(ticker, start=start_dt, progress=False)

            if hist.empty:
                logger.warning(f"Skipping price download for {ticker} - no market data found.")
                continue

            hist = hist.reset_index()
            # Normalize date to YYYY-MM-DD string
            date_col = "Date" if "Date" in hist.columns else hist.columns[0]
            hist["date"] = pd.to_datetime(hist[date_col]).dt.tz_localize(None).dt.strftime("%Y-%m-%d")
            
            hist["ticker"] = ticker.upper()

            # Flatten MultiIndex columns if present
            if isinstance(hist.columns, pd.MultiIndex):
                hist.columns = [c[0] if isinstance(c, tuple) else c for c in hist.columns]

            renamings = {
                "Open": "open", "High": "high", "Low": "low", "Close": "close", "Volume": "volume",
                "open": "open", "high": "high", "low": "low", "close": "close", "volume": "volume"
            }
            hist = hist.rename(columns=renamings)

            # Calculate daily price returns
            hist["prev_close"] = hist["close"].shift(1)
            hist["returns"] = (hist["close"] - hist["prev_close"]) / hist["prev_close"]
            hist["returns"] = hist["returns"].fillna(0.0)
            hist["simple_return"] = hist["returns"]
            hist["log_return"] = np.log(hist["close"] / hist["prev_close"]).fillna(0.0)

            # Clean and filter columns
            clean_df = hist[["date", "ticker", "open", "high", "low", "close", "volume", "returns", "simple_return", "log_return"]].copy()
            clean_df = clean_df.sort_values("date").drop_duplicates(subset=["date"]).reset_index(drop=True)

            # Save to SQLite database
            save_prices_to_db(ticker, clean_df)

            all_dfs.append(clean_df)
            logger.info(f"[{ticker}] Processed {len(clean_df)} real trading days.")
        except Exception as e:
            logger.error(f"Error fetching OHLCV for {ticker}: {e}")

    if not all_dfs:
        logger.warning("No price data retrieved via yfinance, loading existing SQLite DB prices if present.")
        init_db()
        conn = get_connection()
        df_db = pd.read_sql_query("SELECT * FROM prices", conn)
        conn.close()
        if not df_db.empty:
            return df_db
        raise RuntimeError("Failed to fetch price series for all requested tickers and no DB cache available.")

    combined_df = pd.concat(all_dfs, ignore_index=True)
    logger.info(f"Successfully aggregated {len(combined_df)} total trading price rows across {len(all_dfs)} tickers.")

    # Save to Parquet
    output_parquet.parent.mkdir(parents=True, exist_ok=True)
    combined_df.to_parquet(output_parquet, index=False, compression="snappy")
    logger.info(f"Saved OHLCV price data to {output_parquet}")

    return combined_df

def load_price_series(ticker: str, parquet_path: Path = OHLCV_FILE) -> pd.DataFrame:
    """Loads historical prices for a specific ticker sorted by date."""
    # Try loading from database first
    db_df = get_prices_from_db(ticker)
    if not db_df.empty:
        return db_df

    if not parquet_path.exists():
        raise FileNotFoundError(f"Price dataset not found at {parquet_path}. Run price ingestion first.")

    df = pd.read_parquet(parquet_path)
    ticker_df = df[df["ticker"] == ticker.upper()].sort_values("date").reset_index(drop=True)
    return ticker_df
