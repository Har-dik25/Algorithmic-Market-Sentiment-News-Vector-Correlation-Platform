import queue
import threading
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
import numpy as np
import pandas as pd

from src.pipeline.clean_chunk import clean_text, chunk_text
from src.pipeline.embeddings import EmbeddingEngine
from src.pipeline.vector_store import QdrantVectorStore
from src.data.vector_handoff import VectorStoreHandoff
from src.data.database import init_db
from src.utils.logger import get_logger

logger = get_logger("pipeline.realtime_queue")

class RealtimeIngestionQueue:
    """
    Phase 4: Async Real-time Ingestion Worker Queue.
    Accepts live streaming news items/webhooks, processes text instantly,
    generates 384-d dense embeddings, and upserts into Qdrant & SQLite database.
    """
    _instance: Optional["RealtimeIngestionQueue"] = None

    def __init__(self):
        self.item_queue: queue.Queue = queue.Queue()
        self.is_running = False
        self.worker_thread: Optional[threading.Thread] = None
        self.vector_store = QdrantVectorStore.get_instance()
        self.embedding_engine = EmbeddingEngine.get_instance()
        self.vector_handoff = VectorStoreHandoff()
        init_db()

    @classmethod
    def get_instance(cls) -> "RealtimeIngestionQueue":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def start_worker(self):
        """Starts the background worker thread."""
        if not self.is_running:
            self.is_running = True
            self.worker_thread = threading.Thread(target=self._process_queue, daemon=True)
            self.worker_thread.start()
            logger.info("Phase 4: Real-time Ingestion Queue Background Worker started.")

    def stop_worker(self):
        """Stops the background worker gracefully."""
        self.is_running = False
        if self.worker_thread and self.worker_thread.is_alive():
            self.worker_thread.join(timeout=3)
        logger.info("Real-time Ingestion Queue Background Worker stopped.")

    def push_article(self, article: Dict[str, Any]):
        """
        Pushes a new real-time news article into the async queue.
        Required keys: 'ticker', 'title', 'raw_text'
        Optional keys: 'source', 'published_at', 'url'
        """
        self.item_queue.put(article)
        logger.info(f"Pushed article for ticker '{article.get('ticker')}' to real-time queue. Queue size: {self.item_queue.qsize()}")

    def _process_queue(self):
        while self.is_running:
            try:
                article = self.item_queue.get(timeout=1.0)
            except queue.Empty:
                continue

            try:
                ticker = str(article.get("ticker", "GENERAL")).upper()
                title = str(article.get("title", "")).strip()
                raw_text = str(article.get("raw_text", title)).strip()
                published_at = article.get("published_at") or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                source = str(article.get("source", "Real-Time Feed"))
                url = str(article.get("url", ""))

                if not title:
                    self.item_queue.task_done()
                    continue

                # Clean and chunk
                cleaned = clean_text(f"{title}. {raw_text}")
                chunks = chunk_text(cleaned, max_chunk_chars=1200, overlap_chars=200)

                # Generate embeddings
                embeddings = self.embedding_engine.embed_texts(chunks, batch_size=16)

                # Build chunks dataframe for Qdrant
                chunk_records = []
                articles_to_db = []
                for idx, (c_text, emb) in enumerate(zip(chunks, embeddings)):
                    chunk_id = f"rt_{ticker}_{int(time.time()*1000)}_{idx}"
                    chunk_records.append({
                        "chunk_id": chunk_id,
                        "article_id": f"art_rt_{ticker}_{int(time.time())}",
                        "chunk_index": idx,
                        "ticker": ticker,
                        "published_at": published_at,
                        "source": source,
                        "title": title,
                        "chunk_text": c_text,
                        "url": url
                    })
                    articles_to_db.append({
                        "article_id": chunk_id,
                        "ticker": ticker,
                        "published_at": published_at,
                        "headline": title,
                        "source": source,
                        "raw_text_snippet": c_text[:500],
                        "sentiment_score": float(np.dot(emb, self.embedding_engine.embed_texts(["bullish market growth"])[0])),
                        "embedding_vector": emb.tolist()
                    })

                chunks_df = pd.DataFrame(chunk_records)
                self.vector_store.upsert_chunks(chunks_df, embeddings)
                self.vector_handoff.save_articles(articles_to_db)

                logger.info(f"Real-time worker embedded and stored {len(chunks)} passages for {ticker} into Qdrant & DB.")
            except Exception as e:
                logger.error(f"Error processing real-time article item: {e}")
            finally:
                self.item_queue.task_done()
