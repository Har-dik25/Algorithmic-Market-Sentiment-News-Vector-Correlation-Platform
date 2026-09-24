import tempfile
from pathlib import Path
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from src.pipeline.clean_chunk import clean_text, deduplicate_articles, chunk_text
from src.pipeline.embeddings import EmbeddingEngine
from src.pipeline.vector_store import QdrantVectorStore
from src.analytics.correlation import CorrelationEngine
from src.api.main import app

def test_clean_text_strips_html_and_boilerplate():
    html_input = "<p>Apple stock rallied today. Copyright 2026 Reuters. All rights reserved.</p>"
    cleaned = clean_text(html_input)
    assert "Apple stock rallied today" in cleaned
    assert "Copyright" not in cleaned
    assert "All rights reserved" not in cleaned
    assert "<p>" not in cleaned

def test_chunking_respects_sentence_boundaries():
    text = "First financial sentence about revenue. Second sentence about profit margins. Third sentence about dividend payouts."
    chunks = chunk_text(text, max_chunk_chars=60, overlap_chars=20)
    assert len(chunks) > 1
    assert "First financial sentence" in chunks[0]

def test_deduplication():
    df = pd.DataFrame([
        {"article_id": "id1", "ticker": "AAPL", "title": "Apple iPhone Surge", "raw_text": "Content 1"},
        {"article_id": "id1", "ticker": "AAPL", "title": "Apple iPhone Surge", "raw_text": "Content 1"},
        {"article_id": "id2", "ticker": "AAPL", "title": "iPhone Surge Apple", "raw_text": "Content 2"},
        {"article_id": "id3", "ticker": "MSFT", "title": "Microsoft Cloud Boom", "raw_text": "Content 3"},
    ])
    deduped = deduplicate_articles(df)
    assert len(deduped) == 2  # id1 duplicate and id2 near-duplicate dropped

def test_embedding_engine():
    engine = EmbeddingEngine.get_instance()
    texts = ["Record revenue growth for Nvidia GPUs", "Federal Reserve interest rate cuts"]
    embs = engine.embed_texts(texts)
    assert embs.shape == (2, 384)
    # Norm of unit vectors is approximately 1.0
    norm = np.linalg.norm(embs[0])
    assert abs(norm - 1.0) < 1e-4

def test_qdrant_vector_store_roundtrip():
    with tempfile.TemporaryDirectory() as tmp_dir:
        storage_path = Path(tmp_dir) / "test_qdrant"
        store = QdrantVectorStore(storage_path=storage_path, collection_name="test_collection")

        df = pd.DataFrame([
            {
                "chunk_id": "test_chunk_1",
                "article_id": "art_1",
                "chunk_index": 0,
                "ticker": "AAPL",
                "published_at": "2026-09-24T10:00:00Z",
                "source": "Yahoo Finance",
                "title": "Apple AI Product",
                "chunk_text": "Apple is introducing a new AI silicon chip."
            }
        ])
        emb = np.random.randn(1, 384).astype(np.float32)
        emb = emb / np.linalg.norm(emb)

        store.upsert_chunks(df, emb)
        stats = store.get_collection_stats()
        assert stats["vectors_count"] == 1

        hits = store.search_similar(query_vector=emb[0].tolist(), ticker="AAPL", top_k=1)
        assert len(hits) == 1
        assert hits[0]["payload"]["ticker"] == "AAPL"
        assert "Apple AI Product" in hits[0]["payload"]["title"]
        store.close()

def test_correlation_engine_math():
    corr_engine = CorrelationEngine()
    signals_df = pd.DataFrame([
        {"ticker": "NVDA", "date": f"2026-09-0{i}", "sentiment_signal": 0.1 * i, "article_count": 2, "semantic_dispersion": 0.1}
        for i in range(1, 9)
    ])
    prices_df = pd.DataFrame([
        {"ticker": "NVDA", "date": f"2026-09-0{i}", "close": 100.0 + 2 * i, "log_return": 0.02}
        for i in range(1, 9)
    ])

    res = corr_engine.compute_lead_lag_correlation("NVDA", signals_df, prices_df)
    assert res["status"] == "SUCCESS"
    assert "optimal_lag_days" in res
    assert len(res["correlation_curve"]) == 11  # -5 to +5 lags

def test_fastapi_endpoints():
    client = TestClient(app)
    # /health
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "HEALTHY"

    # /tickers
    res_t = client.get("/tickers")
    assert res_t.status_code == 200
    assert "AAPL" in res_t.json()["all_tickers"]

    # /api/v1/ml-metrics
    res_m = client.get("/api/v1/ml-metrics")
    assert res_m.status_code == 200
    metrics = res_m.json()
    assert "test_high_confidence" in metrics
    assert metrics["test_high_confidence"]["accuracy"] >= 0.85

def test_high_accuracy_predictor_gating():
    from src.analytics.high_accuracy_model import HighAccuracyPredictor
    predictor = HighAccuracyPredictor(confidence_threshold=0.70)
    
    # Synthetic feature matrix: 50 samples, 10 features
    np.random.seed(42)
    X = np.random.randn(60, 10)
    # Strong synthetic target correlated with feature 0
    y = (X[:, 0] + np.random.randn(60) * 0.1 > 0).astype(int)
    
    metrics = predictor.train_and_evaluate(X, y)
    assert "test_high_confidence" in metrics
    assert metrics["test_high_confidence"]["accuracy"] >= 0.80

