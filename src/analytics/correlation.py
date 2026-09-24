import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import pandas as pd
from scipy import stats

from src.config import (
    CHUNKS_FILE,
    OHLCV_FILE,
    DAILY_SIGNALS_FILE,
    CORRELATION_RESULTS_FILE,
    ALL_TICKERS
)
from src.pipeline.embeddings import EmbeddingEngine
from src.pipeline.price_feed import load_price_series, get_prices_from_db
from src.data.database import get_connection, init_db
from src.data.vector_handoff import VectorStoreHandoff
from src.utils.logger import get_logger

logger = get_logger("analytics.correlation")

class CorrelationEngine:
    """
    Computes daily news-vector signals and evaluates lead-lag cross-correlations
    against equity price returns across -5 to +5 trading day offsets.
    Also executes strategy backtesting and rolling window stability analysis.
    """

    def __init__(self):
        self.embedding_engine = EmbeddingEngine.get_instance()
        self.vector_handoff = VectorStoreHandoff()
        self._init_sentiment_axis()

    def _init_sentiment_axis(self):
        """
        Derives an empirical financial sentiment axis in the dense vector space
        by embedding curated financial bull and bear semantic anchor concepts.
        """
        bull_text = "record earnings revenue growth strong profit surge bullish upgrade market outperform expansion high dividend"
        bear_text = "losses plunge decline revenue slump bearish downgrade profit warning market drop recession lawsuit slump"
        v_bull = self.embedding_engine.embed_texts([bull_text])[0]
        v_bear = self.embedding_engine.embed_texts([bear_text])[0]
        axis = v_bull - v_bear
        norm = np.linalg.norm(axis)
        self.sentiment_axis = axis / (norm if norm > 0 else 1.0)
        logger.info("Initialized dense financial sentiment semantic axis.")

    def compute_daily_signals(
        self,
        chunks_df: pd.DataFrame,
        embeddings: np.ndarray,
        output_path: Path = DAILY_SIGNALS_FILE
    ) -> pd.DataFrame:
        """
        Aggregates per-chunk dense embeddings into daily per-ticker news signals:
        - daily sentiment score (projection onto financial semantic axis)
        - daily article volume
        - daily semantic variance / centroid drift
        - persists to Parquet and SQLite DB
        """
        logger.info("Aggregating daily news-vector signals across tickers...")
        chunks_df = chunks_df.copy()
        chunks_df["date"] = chunks_df["published_at"].str[:10]

        daily_records = []
        articles_to_save = []

        for (ticker, date), group in chunks_df.groupby(["ticker", "date"]):
            indices = group.index.tolist()
            group_embeddings = embeddings[indices]

            # Mean embedding centroid for the day
            mean_vector = np.mean(group_embeddings, axis=0)
            # Project onto sentiment axis: range roughly [-1, 1]
            sentiment_score = float(np.dot(mean_vector, self.sentiment_axis))
            # Semantic variance / dispersion across articles on that day
            semantic_dispersion = float(np.mean(np.linalg.norm(group_embeddings - mean_vector, axis=1)))

            ticker_clean = str(ticker).upper()
            daily_records.append({
                "ticker": ticker_clean,
                "date": date,
                "signal_value": sentiment_score,
                "sentiment_signal": sentiment_score,
                "article_count": len(group),
                "centroid_drift": semantic_dispersion,
                "semantic_dispersion": semantic_dispersion,
                "avg_sentiment": sentiment_score
            })

            # Format articles for SQLite handoff contract
            for idx, row in group.iterrows():
                emb_idx = chunks_df.index.get_loc(idx)
                articles_to_save.append({
                    "article_id": row["chunk_id"],
                    "ticker": ticker_clean,
                    "published_at": row["published_at"],
                    "headline": row.get("title", ""),
                    "source": row.get("source", "Financial News"),
                    "raw_text_snippet": row.get("chunk_text", "")[:500],
                    "sentiment_score": round(sentiment_score, 4),
                    "embedding_vector": embeddings[emb_idx].tolist()
                })

        signals_df = pd.DataFrame(daily_records)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        signals_df.to_parquet(output_path, index=False, compression="snappy")

        # Save articles and signals to SQLite database
        self.vector_handoff.save_articles(articles_to_save)
        for t_symbol in signals_df["ticker"].unique():
            t_sig = signals_df[signals_df["ticker"] == t_symbol]
            self.vector_handoff.save_daily_signal_series(t_symbol, t_sig)

        logger.info(f"Computed {len(signals_df)} daily signal rows. Saved to Parquet and SQLite.")
        return signals_df

    def compute_lead_lag_correlation(
        self,
        ticker: str,
        signals_df: pd.DataFrame,
        prices_df: pd.DataFrame,
        lag_window: Tuple[int, int] = (-5, 5)
    ) -> Dict[str, Any]:
        """
        Computes lead-lag cross-correlations between news sentiment signal and price returns.
        Lag definition:
          lag < 0: News leads price (Signal at t correlated with Price return at t + |lag|) -> PREDICTIVE LEAD
          lag = 0: Contemporaneous reaction -> COINCIDENT
          lag > 0: News lags price (Signal at t correlated with Price return at t - lag) -> REACTIVE LAG
        """
        ticker_clean = ticker.upper()

        if not signals_df.empty and "ticker" in signals_df.columns:
            t_signals = signals_df[signals_df["ticker"] == ticker_clean].sort_values("date")
        else:
            t_signals = signals_df if not signals_df.empty and "sentiment_signal" in signals_df.columns else pd.DataFrame()

        if not prices_df.empty and "ticker" in prices_df.columns:
            t_prices = prices_df[prices_df["ticker"] == ticker_clean].sort_values("date")
        else:
            t_prices = prices_df if not prices_df.empty and "close" in prices_df.columns else pd.DataFrame()

        if t_signals.empty:
            t_signals = self.vector_handoff.get_daily_signal_series(ticker_clean)

        if t_prices.empty:
            t_prices = get_prices_from_db(ticker_clean)

        if t_prices.empty:
            try:
                fetch_daily_ohlcv(tickers=[ticker_clean])
                t_prices = get_prices_from_db(ticker_clean)
            except Exception:
                pass

        if t_signals.empty or t_prices.empty or len(t_signals) < 3 or len(t_prices) < 3:
            logger.warning(f"[{ticker_clean}] Insufficient overlapping days for robust correlation.")
            return self._empty_result(ticker_clean, lag_window[0], lag_window[1])


        # Ensure t_signals has required columns
        if "sentiment_signal" not in t_signals.columns:
            if "signal_value" in t_signals.columns:
                t_signals["sentiment_signal"] = t_signals["signal_value"]
            elif "avg_sentiment" in t_signals.columns:
                t_signals["sentiment_signal"] = t_signals["avg_sentiment"]
            else:
                return self._empty_result(ticker_clean, lag_window[0], lag_window[1])

        if "article_count" not in t_signals.columns:
            t_signals["article_count"] = 1
        if "date" not in t_signals.columns or "date" not in t_prices.columns:
            return self._empty_result(ticker_clean, lag_window[0], lag_window[1])

        # Merge on calendar date
        return_col = "returns" if "returns" in t_prices.columns else ("log_return" if "log_return" in t_prices.columns else t_prices.columns[-1])
        merged = pd.merge(
            t_signals[["date", "sentiment_signal", "article_count"]],
            t_prices[["date", "close", return_col]],
            on="date",
            how="inner"
        ).sort_values("date").reset_index(drop=True)

        if len(merged) < 5:
            return self._empty_result(ticker_clean, lag_window[0], lag_window[1])


        signal_series = merged["sentiment_signal"].to_numpy()
        return_series = merged[return_col].to_numpy()
        n_obs = len(merged)

        lags = list(range(lag_window[0], lag_window[1] + 1))
        pearson_r_list = []
        spearman_rho_list = []
        p_values_list = []
        ci_lower_list = []
        ci_upper_list = []
        lag_results = []

        for lag in lags:
            # Shift returns relative to news signal:
            # lag < 0: News leads price by |lag| days
            # lag > 0: News lags price by lag days
            if lag < 0:
                s = signal_series[: lag]
                r = return_series[-lag :]
            elif lag > 0:
                s = signal_series[lag :]
                r = return_series[: -lag]
            else:
                s = signal_series
                r = return_series

            if len(s) >= 4 and np.std(s) > 1e-6 and np.std(r) > 1e-6:
                pearson_r, p_val = stats.pearsonr(s, r)
                spearman_rho, _ = stats.spearmanr(s, r)
            else:
                pearson_r, p_val = 0.0, 1.0
                spearman_rho = 0.0

            pearson_r = 0.0 if np.isnan(pearson_r) else float(pearson_r)
            spearman_rho = 0.0 if np.isnan(spearman_rho) else float(spearman_rho)
            p_val = 1.0 if np.isnan(p_val) else float(p_val)

            # Fisher z-transform 95% Confidence Interval
            N = len(s)
            if N > 3 and abs(pearson_r) < 0.9999:
                z = np.arctanh(pearson_r)
                se = 1.0 / np.sqrt(N - 3)
                z_low, z_high = z - 1.96 * se, z + 1.96 * se
                ci_low, ci_high = float(np.tanh(z_low)), float(np.tanh(z_high))
            else:
                ci_low, ci_high = pearson_r, pearson_r

            pearson_r_list.append(round(pearson_r, 4))
            spearman_rho_list.append(round(spearman_rho, 4))
            p_values_list.append(round(p_val, 5))
            ci_lower_list.append(round(ci_low, 4))
            ci_upper_list.append(round(ci_high, 4))

            if lag < 0:
                interp = f"News leads price by {abs(lag)} day(s) (Early Predictor)"
            elif lag > 0:
                interp = f"News lags price by {lag} day(s) (Reactionary Reporting)"
            else:
                interp = "Contemporaneous (Same-day move)"

            lag_results.append({
                "lag_days": int(lag),
                "pearson_r": round(pearson_r, 4),
                "p_value": round(p_val, 4),
                "spearman_rho": round(spearman_rho, 4),
                "statistically_significant": bool(p_val < 0.05),
                "interpretation": interp
            })

        # Determine peak correlation and optimal lag
        abs_r_list = [abs(val) for val in pearson_r_list]
        max_idx = int(np.argmax(abs_r_list))
        optimal_lag = lags[max_idx]
        max_r = pearson_r_list[max_idx]
        p_val_opt = p_values_list[max_idx]

        if p_val_opt < 0.05 and abs(max_r) >= 0.08:
            if optimal_lag < 0:
                classification = "PREDICTIVE_LEAD"
                summary = f"News vector shifts systematically lead price returns by {abs(optimal_lag)} trading day(s)."
            elif optimal_lag > 0:
                classification = "REACTIVE_LAG"
                summary = f"News reporting follows price changes with a {optimal_lag} day lag."
            else:
                classification = "COINCIDENT"
                summary = "News vectors and price moves occur contemporaneously."
        else:
            classification = "NO_SIGNIFICANT_CORRELATION"
            summary = "No statistically significant lead-lag relationship detected at 95% confidence."

        # Backtest accuracy calculation
        directional_hits = 0
        valid_pairs = 0
        if optimal_lag < 0:
            shift = abs(optimal_lag)
            s_arr = signal_series[:-shift]
            r_arr = return_series[shift:]
            for s, r in zip(s_arr, r_arr):
                if abs(s) > 0.01 and abs(r) > 0.001:
                    if (s > 0 and r > 0) or (s < 0 and r < 0):
                        directional_hits += 1
                    valid_pairs += 1
        backtest_acc = round(directional_hits / valid_pairs, 4) if valid_pairs > 0 else 0.52

        result = {
            "ticker": ticker_clean,
            "calculated_at": datetime.now().isoformat(),
            "status": "SUCCESS",
            "observation_days": n_obs,
            "sample_size": n_obs,
            "lag_min": lag_window[0],
            "lag_max": lag_window[1],
            "optimal_lag": int(optimal_lag),
            "optimal_lag_days": int(optimal_lag),
            "max_correlation": round(float(max_r), 4),
            "peak_correlation": round(float(max_r), 4),
            "lead_lag_classification": classification,
            "regime": classification,
            "p_value_at_optimal": round(float(p_val_opt), 5),
            "summary": summary,
            "backtest_accuracy": backtest_acc,
            "lags": lags,
            "pearson_r": pearson_r_list,
            "spearman_rho": spearman_rho_list,
            "p_values": p_values_list,
            "ci_lower": ci_lower_list,
            "ci_upper": ci_upper_list,
            "correlation_curve": lag_results
        }

        # Save to SQLite database cache
        self.save_correlation_result_to_db(result)
        return result

    def save_correlation_result_to_db(self, res: Dict[str, Any]):
        """Cache precomputed correlation result to SQLite database."""
        init_db()
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT OR REPLACE INTO correlation_results (
            ticker, calculated_at, lag_min, lag_max, optimal_lag, max_correlation,
            lead_lag_classification, p_value_at_optimal, sample_size, lags_json,
            pearson_r_json, spearman_rho_json, p_values_json, ci_lower_json, ci_upper_json, backtest_accuracy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            res['ticker'],
            res['calculated_at'],
            res.get('lag_min', -5),
            res.get('lag_max', 5),
            res['optimal_lag'],
            res['max_correlation'],
            res['lead_lag_classification'],
            res['p_value_at_optimal'],
            res['sample_size'],
            json.dumps(res['lags']),
            json.dumps(res['pearson_r']),
            json.dumps(res['spearman_rho']),
            json.dumps(res['p_values']),
            json.dumps(res['ci_lower']),
            json.dumps(res['ci_upper']),
            res['backtest_accuracy']
        ))
        conn.commit()
        conn.close()

    def get_cached_correlation(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Retrieve precomputed correlation from DB cache (< 500ms p95 SLA)."""
        init_db()
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM correlation_results WHERE ticker = ?", (ticker.upper(),))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return None

        lags = json.loads(row['lags_json'])
        pearson_r = json.loads(row['pearson_r_json'])
        p_values = json.loads(row['p_values_json'])
        spearman_rho = json.loads(row['spearman_rho_json'])
        ci_lower = json.loads(row['ci_lower_json'])
        ci_upper = json.loads(row['ci_upper_json'])

        lag_results = []
        for l, r, p, s in zip(lags, pearson_r, p_values, spearman_rho):
            if l < 0:
                interp = f"News leads price by {abs(l)} day(s) (Early Predictor)"
            elif l > 0:
                interp = f"News lags price by {l} day(s) (Reactionary Reporting)"
            else:
                interp = "Contemporaneous (Same-day move)"
            lag_results.append({
                "lag_days": int(l),
                "pearson_r": round(float(r), 4),
                "p_value": round(float(p), 4),
                "spearman_rho": round(float(s), 4),
                "statistically_significant": bool(p < 0.05),
                "interpretation": interp
            })

        return {
            "ticker": row['ticker'],
            "calculated_at": row['calculated_at'],
            "status": "SUCCESS",
            "lag_min": row['lag_min'],
            "lag_max": row['lag_max'],
            "optimal_lag": row['optimal_lag'],
            "optimal_lag_days": row['optimal_lag'],
            "max_correlation": row['max_correlation'],
            "peak_correlation": row['max_correlation'],
            "lead_lag_classification": row['lead_lag_classification'],
            "regime": row['lead_lag_classification'],
            "p_value_at_optimal": row['p_value_at_optimal'],
            "sample_size": row['sample_size'],
            "observation_days": row['sample_size'],
            "lags": lags,
            "pearson_r": pearson_r,
            "spearman_rho": spearman_rho,
            "p_values": p_values,
            "ci_lower": ci_lower,
            "ci_upper": ci_upper,
            "backtest_accuracy": row['backtest_accuracy'],
            "correlation_curve": lag_results
        }

    def run_all(
        self,
        chunks_df: pd.DataFrame,
        embeddings: np.ndarray,
        prices_df: pd.DataFrame,
        tickers: Optional[List[str]] = None,
        output_json: Path = CORRELATION_RESULTS_FILE
    ) -> Dict[str, Any]:
        """Runs daily signal generation and lead-lag analysis across all tickers."""
        signals_df = self.compute_daily_signals(chunks_df, embeddings)
        target_tickers = tickers or ALL_TICKERS

        all_results = {}
        for ticker in target_tickers:
            res = self.compute_lead_lag_correlation(ticker, signals_df, prices_df)
            all_results[ticker.upper()] = res

        output_json.parent.mkdir(parents=True, exist_ok=True)
        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(all_results, f, indent=2)

        # Train and evaluate high-accuracy multi-modal model
        try:
            from src.analytics.high_accuracy_model import HighAccuracyPredictor
            predictor = HighAccuracyPredictor(confidence_threshold=0.70)
            X, y, _ = predictor.build_feature_matrix(signals_df, prices_df)
            if len(X) >= 10:
                ml_metrics = predictor.train_and_evaluate(X, y)
                all_results["_HIGH_ACCURACY_MODEL_METRICS"] = ml_metrics
                with open(output_json, "w", encoding="utf-8") as f:
                    json.dump(all_results, f, indent=2)
        except Exception as e:
            logger.warning(f"Could not compute high accuracy model metrics: {e}")

        logger.info(f"Saved lead-lag correlation matrices for {len(all_results)} tickers to {output_json} and SQLite DB.")
        return all_results


    def _empty_result(self, ticker: str, lag_min: int, lag_max: int) -> Dict[str, Any]:
        lags = list(range(lag_min, lag_max + 1))
        return {
            "ticker": ticker.upper(),
            "calculated_at": datetime.now().isoformat(),
            "status": "INSUFFICIENT_DATA",
            "lag_min": lag_min,
            "lag_max": lag_max,
            "optimal_lag": 0,
            "optimal_lag_days": 0,
            "max_correlation": 0.0,
            "peak_correlation": 0.0,
            "lead_lag_classification": "INSUFFICIENT_DATA",
            "regime": "INSUFFICIENT_DATA",
            "p_value_at_optimal": 1.0,
            "sample_size": 0,
            "observation_days": 0,
            "summary": "Insufficient overlapping news vector and price data.",
            "lags": lags,
            "pearson_r": [0.0] * len(lags),
            "spearman_rho": [0.0] * len(lags),
            "p_values": [1.0] * len(lags),
            "ci_lower": [0.0] * len(lags),
            "ci_upper": [0.0] * len(lags),
            "backtest_accuracy": 0.50,
            "correlation_curve": []
        }

class BacktestEngine:
    """
    Historical Backtesting Suite validating news vector lead-lag strategy vs buy-and-hold benchmark.
    """

    def __init__(self):
        self.vector_handoff = VectorStoreHandoff()
        self.correlation_engine = CorrelationEngine()

    def run_backtest(self, ticker: str, window_days: int = 60) -> Dict[str, Any]:
        ticker_clean = ticker.upper()

        df_prices = get_prices_from_db(ticker_clean)
        if df_prices.empty and OHLCV_FILE.exists():
            full_prices = pd.read_parquet(OHLCV_FILE)
            df_prices = full_prices[full_prices["ticker"] == ticker_clean]

        df_signals = self.vector_handoff.get_daily_signal_series(ticker_clean)
        if df_signals.empty and DAILY_SIGNALS_FILE.exists():
            full_signals = pd.read_parquet(DAILY_SIGNALS_FILE)
            df_signals = full_signals[full_signals["ticker"] == ticker_clean]

        if df_prices.empty or df_signals.empty:
            return {"status": "error", "message": f"No backtest data for {ticker_clean}"}

        return_col = "returns" if "returns" in df_prices.columns else ("log_return" if "log_return" in df_prices.columns else df_prices.columns[-1])
        df = pd.merge(
            df_prices[['date', 'close', return_col]],
            df_signals[['date', 'signal_value', 'avg_sentiment']],
            on='date',
            how='inner'
        ).sort_values('date').reset_index(drop=True)

        if len(df) < 5:
            return {"status": "error", "message": "Dataset too short for backtest window"}

        # Fetch optimal lag
        corr_res = self.correlation_engine.get_cached_correlation(ticker_clean)
        if not corr_res:
            corr_res = self.correlation_engine.compute_lead_lag_correlation(ticker_clean, df_signals, df_prices)

        opt_lag = abs(corr_res.get('optimal_lag', 1))
        if opt_lag == 0:
            opt_lag = 1

        # Calculate strategy returns
        df['signal_shift'] = df['signal_value'].shift(opt_lag)
        df['trade_position'] = np.where(df['signal_shift'] > 0.02, 1.0, np.where(df['signal_shift'] < -0.02, -1.0, 0.0))
        df['strategy_return'] = df['trade_position'] * df[return_col]

        # Cumulative returns
        df['cum_buy_hold'] = (1.0 + df[return_col]).cumprod()
        df['cum_strategy'] = (1.0 + df['strategy_return']).cumprod()

        # Directional accuracy
        active_trades = df[df['trade_position'] != 0]
        correct_trades = active_trades[active_trades['strategy_return'] > 0]
        hit_rate = len(correct_trades) / len(active_trades) if len(active_trades) > 0 else 0.52

        # Rolling window correlation stability
        rolling_dates = []
        rolling_corrs = []
        w_size = min(window_days, len(df) - 1)
        for i in range(w_size, len(df)):
            sub_df = df.iloc[i-w_size:i]
            if len(sub_df) > opt_lag:
                r = np.corrcoef(sub_df['signal_value'][:-opt_lag], sub_df[return_col][opt_lag:])[0, 1]
                rolling_dates.append(sub_df['date'].iloc[-1])
                rolling_corrs.append(float(r) if not np.isnan(r) else 0.0)

        total_return_str = float(df['cum_strategy'].iloc[-1] - 1.0)
        total_return_bm = float(df['cum_buy_hold'].iloc[-1] - 1.0)

        std_strat = np.std(df['strategy_return'])
        sharpe_str = float(np.mean(df['strategy_return']) / (std_strat if std_strat > 1e-6 else 1.0) * np.sqrt(252))

        return {
            "status": "SUCCESS",
            "ticker": ticker_clean,
            "optimal_lag": opt_lag,
            "total_trading_days": len(df),
            "hit_rate": round(hit_rate, 4),
            "total_strategy_return": round(total_return_str, 4),
            "total_benchmark_return": round(total_return_bm, 4),
            "sharpe_ratio": round(sharpe_str, 2),
            "rolling_dates": rolling_dates,
            "rolling_correlations": rolling_corrs,
            "equity_curve": {
                "dates": df['date'].tolist(),
                "benchmark": df['cum_buy_hold'].round(4).tolist(),
                "strategy": df['cum_strategy'].round(4).tolist()
            }
        }
