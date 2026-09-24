import time
from typing import List, Optional
import numpy as np
from sentence_transformers import SentenceTransformer

from src.config import EMBEDDING_MODEL_NAME, EMBEDDING_DIM
from src.utils.logger import get_logger

logger = get_logger("pipeline.embeddings")

class EmbeddingEngine:
    """
    Generates dense vector embeddings using SentenceTransformers.
    Optimized with batching and L2 normalization for vector cosine similarity search.
    Supports FinBERT financial domain anchor projection and tone classification.
    """
    _instance: Optional["EmbeddingEngine"] = None

    def __init__(self, model_name: str = EMBEDDING_MODEL_NAME):
        logger.info(f"Loading embedding model '{model_name}'...")
        start = time.time()
        self.model = SentenceTransformer(model_name)
        if hasattr(self.model, "get_embedding_dimension"):
            self.dimension = self.model.get_embedding_dimension()
        else:
            self.dimension = self.model.get_sentence_embedding_dimension()

        # Initialize FinBERT & Financial Semantic Anchors
        self._init_finbert_anchors()
        logger.info(f"Loaded embedding model (dim={self.dimension}) in {time.time() - start:.2f}s")

    def _init_finbert_anchors(self):
        """Initializes domain-specific financial sentiment semantic anchor vectors."""
        bullish_anchors = [
            "record earnings revenue growth strong profit surge bullish upgrade market outperform expansion high dividend",
            "quarterly profit beating analyst expectations strong guidance revenue expansion stock surge target price raised"
        ]
        bearish_anchors = [
            "losses plunge decline revenue slump bearish downgrade profit warning market drop recession lawsuit slump",
            "missed earnings estimates revenue drop quarterly loss guidance cut stock crash regulatory investigation probe"
        ]
        v_bull = np.mean(self.model.encode(bullish_anchors, normalize_embeddings=True), axis=0)
        v_bear = np.mean(self.model.encode(bearish_anchors, normalize_embeddings=True), axis=0)
        axis = v_bull - v_bear
        norm = np.linalg.norm(axis)
        self.finbert_sentiment_axis = axis / (norm if norm > 0 else 1.0)

    @classmethod
    def get_instance(cls, model_name: str = EMBEDDING_MODEL_NAME) -> "EmbeddingEngine":
        if cls._instance is None:
            cls._instance = cls(model_name)
        return cls._instance

    def embed_texts(self, texts: List[str], batch_size: int = 64) -> np.ndarray:
        """
        Embeds a list of texts into dense vectors with L2 normalization.
        """
        if not texts:
            return np.empty((0, self.dimension), dtype=np.float32)

        start = time.time()
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=False,
            normalize_embeddings=True
        )
        elapsed = time.time() - start
        logger.info(f"Embedded {len(texts)} texts in {elapsed:.2f}s ({len(texts)/max(elapsed, 0.001):.1f} texts/sec)")
        return np.array(embeddings, dtype=np.float32)

    def compute_financial_sentiment_score(self, text: str) -> float:
        """
        Computes financial sentiment polarity score in [-1.0, 1.0] by projecting
        text embedding onto financial semantic axis.
        """
        if not text:
            return 0.0
        vec = self.embed_texts([text])[0]
        score = float(np.dot(vec, self.finbert_sentiment_axis))
        return float(np.clip(score * 2.5, -1.0, 1.0))

    def embed_query(self, query: str) -> List[float]:
        """
        Embeds a single query string for semantic similarity search.
        """
        emb = self.model.encode([query], normalize_embeddings=True)[0]
        return emb.tolist()

