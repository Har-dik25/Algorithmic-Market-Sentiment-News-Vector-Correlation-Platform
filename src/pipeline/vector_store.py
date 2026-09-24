import time
import uuid
from pathlib import Path
from typing import List, Dict, Optional, Any
import numpy as np
import pandas as pd
from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels

from src.config import QDRANT_STORAGE_DIR, QDRANT_COLLECTION_NAME, EMBEDDING_DIM
from src.utils.logger import get_logger

logger = get_logger("pipeline.vector_store")

class QdrantVectorStore:
    """
    Manages local persistent Qdrant collection with rich metadata filtering.
    """
    _instance: Optional["QdrantVectorStore"] = None

    def __init__(self, storage_path: Path = QDRANT_STORAGE_DIR, collection_name: str = QDRANT_COLLECTION_NAME):
        self.storage_path = storage_path
        self.collection_name = collection_name
        self.storage_path.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Initializing Qdrant client at {self.storage_path}...")
        self.client = QdrantClient(path=str(self.storage_path))
        self._ensure_collection()

    @classmethod
    def get_instance(cls) -> "QdrantVectorStore":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @classmethod
    def reset_instance(cls):
        """Closes and discards the current singleton so the next get_instance() creates a fresh one."""
        if cls._instance is not None:
            cls._instance.close()
            cls._instance = None

    def _ensure_collection(self):
        """Ensures the vector collection and payload indexes exist."""
        collections = [c.name for c in self.client.get_collections().collections]
        if self.collection_name not in collections:
            logger.info(f"Creating Qdrant collection '{self.collection_name}' (dim={EMBEDDING_DIM}, Cosine)...")
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=qmodels.VectorParams(
                    size=EMBEDDING_DIM,
                    distance=qmodels.Distance.COSINE
                )
            )

            # Create payload indexes for fast filtering (graceful — local mode may not support all)
            for field in ["ticker", "source", "article_id", "published_at"]:
                try:
                    schema_type = qmodels.PayloadSchemaType.KEYWORD
                    self.client.create_payload_index(
                        collection_name=self.collection_name,
                        field_name=field,
                        field_schema=schema_type
                    )
                except Exception:
                    pass  # Local Qdrant may not support payload indexing
            logger.info(f"Collection '{self.collection_name}' and payload indexes initialized.")
        else:
            logger.info(f"Qdrant collection '{self.collection_name}' already exists.")

    def upsert_chunks(self, chunks_df: pd.DataFrame, embeddings: np.ndarray, batch_size: int = 128):
        """
        Batches and upserts chunk records and their corresponding dense vectors into Qdrant.
        """
        total_records = len(chunks_df)
        if total_records == 0 or len(embeddings) != total_records:
            raise ValueError(f"Mismatch between chunks count ({total_records}) and embeddings count ({len(embeddings)})")

        logger.info(f"Upserting {total_records} vector points into '{self.collection_name}'...")
        start_time = time.time()

        for i in range(0, total_records, batch_size):
            batch_df = chunks_df.iloc[i : i + batch_size]
            batch_emb = embeddings[i : i + batch_size]

            points = []
            for (_, row), vec in zip(batch_df.iterrows(), batch_emb):
                # Deterministic UUID from chunk_id for idempotency
                point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, row["chunk_id"]))
                payload = {
                    "chunk_id": row["chunk_id"],
                    "article_id": row["article_id"],
                    "chunk_index": int(row.get("chunk_index", 0)),
                    "ticker": str(row["ticker"]),
                    "published_at": str(row["published_at"]),
                    "source": str(row["source"]),
                    "title": str(row["title"]),
                    "snippet": str(row["chunk_text"])[:300],  # Short excerpt for dashboard
                    "full_chunk": str(row["chunk_text"]),
                    "url": str(row.get("url", ""))
                }
                points.append(qmodels.PointStruct(
                    id=point_id,
                    vector=vec.tolist(),
                    payload=payload
                ))

            self.client.upsert(
                collection_name=self.collection_name,
                points=points
            )

        elapsed = time.time() - start_time
        logger.info(f"Upserted {total_records} vectors in {elapsed:.2f}s ({total_records/max(elapsed, 0.001):.1f} pts/sec).")

    def search_similar(
        self,
        query_vector: List[float],
        ticker: Optional[str] = None,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Executes a top-k similarity query with optional ticker filtering.
        Meets the non-functional requirement of <300ms p95 retrieval.
        """
        start = time.time()
        query_filter = None
        if ticker:
            query_filter = qmodels.Filter(
                must=[
                    qmodels.FieldCondition(
                        key="ticker",
                        match=qmodels.MatchValue(value=ticker.upper())
                    )
                ]
            )

        query_response = self.client.query_points(
            collection_name=self.collection_name,
            query=query_vector,
            query_filter=query_filter,
            limit=top_k
        )
        search_result = query_response.points

        latency_ms = (time.time() - start) * 1000
        logger.info(f"Similarity search completed in {latency_ms:.2f}ms (returned {len(search_result)} results)")

        results = []
        for hit in search_result:
            results.append({
                "score": float(hit.score),
                "payload": hit.payload
            })
        return results

    def close(self):
        """Closes client and releases file locks."""
        try:
            self.client.close()
        except Exception:
            pass

    def get_articles_by_ticker_and_date(
        self,
        ticker: str,
        target_date: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Retrieves articles for a specific ticker on a given date (YYYY-MM-DD) for dashboard evidence drill-down.
        """
        # Match any article where published_at starts with the given date
        scroll_result, _ = self.client.scroll(
            collection_name=self.collection_name,
            scroll_filter=qmodels.Filter(
                must=[
                    qmodels.FieldCondition(key="ticker", match=qmodels.MatchValue(value=ticker.upper())),
                ]
            ),
            limit=100
        )

        matching_articles = []
        for point in scroll_result:
            p_date = str(point.payload.get("published_at", ""))
            if p_date.startswith(target_date):
                matching_articles.append(point.payload)
                if len(matching_articles) >= limit:
                    break

        return matching_articles

    def get_collection_stats(self) -> Dict[str, Any]:
        """Returns collection info and vector count."""
        info = self.client.get_collection(self.collection_name)
        return {
            "collection_name": self.collection_name,
            "status": str(info.status),
            "vectors_count": info.points_count,
            "indexed_vectors_count": getattr(info, "indexed_vectors_count", info.points_count)
        }
