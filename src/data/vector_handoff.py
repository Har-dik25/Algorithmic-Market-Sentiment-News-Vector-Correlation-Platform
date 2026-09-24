import json
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from src.data.database import get_connection
from src.pipeline.vector_store import QdrantVectorStore
from src.pipeline.embeddings import EmbeddingEngine
from src.utils.logger import get_logger

logger = get_logger("data.vector_handoff")

class VectorStoreHandoff:
    """
    Interface between Hardik's Vector Store (Qdrant/SentenceTransformers) and Uttam's Correlation Engine.
    Implements the exact Handoff Contract defined in Section 8 of PRD:
    - ticker: uppercase stock symbol
    - article_id / chunk_id: article tracking identifier
    - published_at: ISO 8601 timestamp
    - embedding_vector: dense float vector
    - raw_text_snippet: article summary for evidence panel
    """

    def __init__(self):
        pass

    def save_articles(self, articles: List[Dict[str, Any]]):
        """Batch save articles conforming to handoff contract into DB."""
        if not articles:
            return
        conn = get_connection()
        cursor = conn.cursor()
        for art in articles:
            date_str = str(art.get('published_at', ''))[:10]
            emb_vec = art.get('embedding_vector', [])
            emb_json = json.dumps(emb_vec if isinstance(emb_vec, list) else list(emb_vec))
            cursor.execute("""
            INSERT OR REPLACE INTO articles (article_id, ticker, published_at, date, headline, source, raw_text_snippet, sentiment_score, embedding_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(art['article_id']),
                str(art['ticker']).upper(),
                str(art['published_at']),
                date_str,
                str(art.get('headline', art.get('title', ''))),
                str(art.get('source', 'Financial News')),
                str(art.get('raw_text_snippet', art.get('snippet', art.get('raw_text', ''))))[:500],
                float(art.get('sentiment_score', 0.0)),
                emb_json
            ))
        conn.commit()
        conn.close()
        logger.info(f"Saved {len(articles)} articles into SQLite database.")

    def get_articles_by_ticker_date(self, ticker: str, date: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Retrieve evidentiary articles driving a signal on a specific date."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
        SELECT article_id, ticker, published_at, date, headline, source, raw_text_snippet, sentiment_score, embedding_json
        FROM articles
        WHERE ticker = ? AND date = ?
        ORDER BY published_at DESC
        LIMIT ?
        """, (ticker.upper(), date, limit))
        rows = cursor.fetchall()

        if not rows:
            # Fallback query matching start of published_at date
            cursor.execute("""
            SELECT article_id, ticker, published_at, date, headline, source, raw_text_snippet, sentiment_score, embedding_json
            FROM articles
            WHERE ticker = ? AND published_at LIKE ?
            ORDER BY published_at DESC
            LIMIT ?
            """, (ticker.upper(), f"{date}%", limit))
            rows = cursor.fetchall()

        conn.close()

        results = []
        for r in rows:
            results.append({
                "article_id": r['article_id'],
                "ticker": r['ticker'],
                "published_at": r['published_at'],
                "date": r['date'],
                "headline": r['headline'],
                "source": r['source'],
                "raw_text_snippet": r['raw_text_snippet'],
                "sentiment_score": float(r['sentiment_score'] or 0.0),
                "has_embedding": bool(r['embedding_json'])
            })
        return results

    def get_daily_signal_series(self, ticker: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> pd.DataFrame:
        """
        Retrieves daily aggregated news-vector signal series from database.
        Returns DataFrame with columns: ['date', 'signal_value', 'centroid_drift', 'avg_sentiment', 'article_count']
        """
        conn = get_connection()
        query = "SELECT date, signal_value, centroid_drift, avg_sentiment, article_count FROM news_vector_signals WHERE ticker = ?"
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

    def save_daily_signal_series(self, ticker: str, df_signals: pd.DataFrame):
        """Save pre-aggregated daily signals to DB."""
        if df_signals.empty:
            return
        conn = get_connection()
        cursor = conn.cursor()
        for _, row in df_signals.iterrows():
            cursor.execute("""
            INSERT OR REPLACE INTO news_vector_signals (ticker, date, signal_value, centroid_drift, avg_sentiment, article_count, top_keywords_json, vector_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                ticker.upper(),
                str(row['date']),
                float(row.get('signal_value', row.get('sentiment_signal', 0.0))),
                float(row.get('centroid_drift', row.get('semantic_dispersion', 0.0))),
                float(row.get('avg_sentiment', row.get('sentiment_signal', 0.0))),
                int(row.get('article_count', 1)),
                json.dumps(row.get('top_keywords', [])),
                json.dumps(row.get('vector', []))
            ))
        conn.commit()
        conn.close()
        logger.info(f"Saved {len(df_signals)} daily news signals for {ticker} into database.")

    def vector_similarity_search(self, ticker: str, query_text: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Top-k similarity search over stored news articles using Qdrant vector database
        with fallback to SQLite text matching.
        """
        t_clean = ticker.upper()
        # 1. Try Qdrant search first
        try:
            emb_engine = EmbeddingEngine.get_instance()
            qdrant = QdrantVectorStore.get_instance()
            query_vec = emb_engine.embed_query(query_text)
            q_results = qdrant.search_similar(query_vector=query_vec, ticker=t_clean, top_k=top_k)
            if q_results:
                formatted = []
                for hit in q_results:
                    p = hit["payload"]
                    formatted.append({
                        "article_id": p.get("article_id", p.get("chunk_id")),
                        "ticker": p.get("ticker", t_clean),
                        "published_at": p.get("published_at"),
                        "headline": p.get("title", ""),
                        "source": p.get("source", "Financial News"),
                        "snippet": p.get("snippet", p.get("full_chunk", ""))[:300],
                        "sentiment_score": float(hit.get("score", 0.8)),
                        "similarity_score": round(float(hit.get("score", 0.8)), 4)
                    })
                return formatted
        except Exception as e:
            logger.warning(f"Qdrant vector search fallback: {e}")

        # 2. SQLite text matching fallback
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
        SELECT article_id, ticker, published_at, date, headline, source, raw_text_snippet, sentiment_score
        FROM articles
        WHERE ticker = ?
        ORDER BY published_at DESC
        LIMIT 100
        """, (t_clean,))
        rows = cursor.fetchall()
        conn.close()

        query_words = set(query_text.lower().split())
        scored_results = []
        for r in rows:
            text = (str(r['headline']) + " " + str(r['raw_text_snippet'])).lower()
            text_words = set(text.split())
            overlap = len(query_words.intersection(text_words))
            relevance = (overlap + 1.0) / (len(query_words) + 1.0)
            scored_results.append({
                "article_id": r['article_id'],
                "ticker": r['ticker'],
                "published_at": r['published_at'],
                "headline": r['headline'],
                "source": r['source'],
                "snippet": r['raw_text_snippet'],
                "sentiment_score": float(r['sentiment_score'] or 0.0),
                "similarity_score": round(min(0.99, max(0.40, relevance + 0.35)), 4)
            })

        scored_results.sort(key=lambda x: x['similarity_score'], reverse=True)
        return scored_results[:top_k]
