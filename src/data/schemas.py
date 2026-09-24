import hashlib
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
import pyarrow as pa

class CanonicalArticle(BaseModel):
    """
    Standardized schema for raw extracted financial news articles.
    Directly aligns with the handoff contract in PRD Section 8.
    """
    article_id: str = Field(..., description="Deterministic SHA-256 hash identifier")
    ticker: str = Field(..., description="Stock symbol (uppercase, e.g. AAPL)")
    published_at: str = Field(..., description="ISO 8601 UTC timestamp (YYYY-MM-DDTHH:MM:SSZ)")
    source: str = Field(..., description="Name of news source or wire agency")
    title: str = Field(..., description="Article headline")
    raw_text: str = Field(..., description="Article text or summary body")
    url: Optional[str] = Field(default="", description="Source link/URL")
    extra_metadata: str = Field(default="{}", description="JSON string with dataset-specific metadata")

    @classmethod
    def generate_id(cls, source: str, ticker: str, published_at: str, title: str) -> str:
        """
        Creates a deterministic SHA-256 hash from primary identity attributes.
        Ensures cross-run consistency and deduplication capability.
        """
        raw_key = f"{source.strip().lower()}|{ticker.strip().upper()}|{published_at.strip()}|{title.strip().lower()}"
        return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

# PyArrow Schema for high-performance Parquet storage
CANONICAL_ARROW_SCHEMA = pa.schema([
    ("article_id", pa.string()),
    ("ticker", pa.string()),
    ("published_at", pa.string()),
    ("source", pa.string()),
    ("title", pa.string()),
    ("raw_text", pa.string()),
    ("url", pa.string()),
    ("extra_metadata", pa.string())
])
