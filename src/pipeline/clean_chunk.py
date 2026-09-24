import re
from pathlib import Path
from typing import List, Dict, Set, Optional
import bs4
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

from src.config import EXTRACTED_ARTICLES_FILE, CHUNKS_FILE
from src.utils.logger import get_logger

logger = get_logger("pipeline.clean_chunk")

# Financial news boilerplate patterns to eliminate
BOILERPLATE_PATTERNS = [
    re.compile(r"all rights reserved[.]?", re.IGNORECASE),
    re.compile(r"copyright \d{4}.*?(?=[.]|$)", re.IGNORECASE),
    re.compile(r"sign up for (our|free) newsletter.*?(?=[.]|$)", re.IGNORECASE),
    re.compile(r"for more information, visit .*?(?=[.]|$)", re.IGNORECASE),
    re.compile(r"disclaimer: .*?(?=[.]|$)", re.IGNORECASE),
    re.compile(r"disclosure: .*?(?=[.]|$)", re.IGNORECASE),
    re.compile(r"read more:.*?(?=[.]|$)", re.IGNORECASE),
    re.compile(r"click here to .*?(?=[.]|$)", re.IGNORECASE),
    re.compile(r"subscribe to .*?(?=[.]|$)", re.IGNORECASE),
    re.compile(r"follow us on (twitter|linkedin|facebook|x).*?(?=[.]|$)", re.IGNORECASE),
    re.compile(r"the views expressed (in this|here) .*?(?=[.]|$)", re.IGNORECASE),
]

def clean_text(text: str) -> str:
    """Strips HTML tags, boilerplate patterns, and normalizes whitespace."""
    if not text or not isinstance(text, str):
        return ""

    # 1. Strip HTML tags
    if "<" in text and ">" in text:
        try:
            soup = bs4.BeautifulSoup(text, "html.parser")
            text = soup.get_text(separator=" ")
        except Exception:
            text = re.sub(r"<[^>]+>", " ", text)

    # 2. Strip boilerplate patterns
    for pat in BOILERPLATE_PATTERNS:
        text = pat.sub(" ", text)

    # 3. Clean orphaned dots and normalize whitespace
    text = re.sub(r"\s+\.", ".", text)
    text = re.sub(r"\.{2,}", ".", text)
    clean_result = re.sub(r"\s+", " ", text).strip()
    return clean_result

def _normalize_title_for_dedupe(title: str) -> str:
    """Produces a simplified token string for near-duplicate headline detection."""
    clean = re.sub(r"[^\w\s]", "", title.lower())
    tokens = clean.split()
    return " ".join(sorted(tokens))

def deduplicate_articles(df: pd.DataFrame) -> pd.DataFrame:
    """
    Performs multi-level deduplication:
    1. Exact deduplication on article_id.
    2. Near-duplicate deduplication on normalized title within the same ticker.
    """
    initial_len = len(df)
    # 1. Exact ID dedupe
    df_deduped = df.drop_duplicates(subset=["article_id"]).copy()

    # 2. Near-duplicate detection on title tokens per ticker
    df_deduped["title_norm"] = df_deduped["title"].apply(_normalize_title_for_dedupe)
    df_deduped = df_deduped.drop_duplicates(subset=["ticker", "title_norm"]).drop(columns=["title_norm"])

    final_len = len(df_deduped)
    dropped = initial_len - final_len
    logger.info(f"Deduplication completed: {initial_len} -> {final_len} records ({dropped} duplicates removed).")
    return df_deduped

def chunk_text(
    text: str,
    max_chunk_chars: int = 1200,
    overlap_chars: int = 150
) -> List[str]:
    """
    Splits text into ~500-token passages respecting sentence boundaries.
    """
    if len(text) <= max_chunk_chars:
        return [text]

    # Split by sentence terminators
    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunks: List[str] = []
    current_chunk: List[str] = []
    current_len = 0

    for sentence in sentences:
        s_len = len(sentence)
        if current_len + s_len > max_chunk_chars and current_chunk:
            chunk_str = " ".join(current_chunk)
            chunks.append(chunk_str)
            # Create overlap
            overlap_target = overlap_chars
            overlap_sentences = []
            accum_overlap = 0
            for prev_s in reversed(current_chunk):
                accum_overlap += len(prev_s)
                overlap_sentences.insert(0, prev_s)
                if accum_overlap >= overlap_target:
                    break
            current_chunk = overlap_sentences
            current_len = sum(len(s) for s in current_chunk)

        current_chunk.append(sentence)
        current_len += s_len

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks

def process_and_chunk_dataset(
    input_parquet: Path = EXTRACTED_ARTICLES_FILE,
    output_parquet: Path = CHUNKS_FILE
) -> pd.DataFrame:
    """
    Reads extracted articles, cleans text, deduplicates, chunks long articles,
    and saves resulting passages with enriched metadata to Parquet.
    """
    if not input_parquet.exists():
        raise FileNotFoundError(f"Extracted dataset not found at {input_parquet}")

    logger.info(f"Loading extracted articles from {input_parquet}...")
    df = pd.read_parquet(input_parquet)
    logger.info(f"Loaded {len(df)} extracted articles.")

    # 1. Clean raw text & title
    df["title"] = df["title"].astype(str).str.strip()
    df["clean_text"] = df["raw_text"].astype(str).apply(clean_text)

    # Use title as text fallback if cleaned text is too short
    df["final_text"] = df.apply(
        lambda row: row["clean_text"] if len(row["clean_text"]) >= 20 else row["title"],
        axis=1
    )

    # 2. Deduplicate
    df_clean = deduplicate_articles(df)

    # 3. Chunk articles
    chunk_records: List[Dict] = []
    for _, row in df_clean.iterrows():
        text_to_chunk = row["final_text"]
        passages = chunk_text(text_to_chunk)

        for idx, passage in enumerate(passages):
            chunk_id = f"{row['article_id']}_c{idx}"
            chunk_records.append({
                "chunk_id": chunk_id,
                "article_id": row["article_id"],
                "chunk_index": idx,
                "total_chunks": len(passages),
                "ticker": row["ticker"],
                "published_at": row["published_at"],
                "source": row["source"],
                "title": row["title"],
                "chunk_text": passage,
                "url": row.get("url", ""),
                "extra_metadata": row.get("extra_metadata", "{}")
            })

    chunks_df = pd.DataFrame(chunk_records)
    logger.info(f"Generated {len(chunks_df)} chunks across {len(df_clean)} unique articles.")

    # Save to Parquet
    output_parquet.parent.mkdir(parents=True, exist_ok=True)
    chunks_df.to_parquet(output_parquet, index=False, compression="snappy")
    logger.info(f"Saved processed chunks to {output_parquet}")

    return chunks_df
