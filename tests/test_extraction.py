import json
import tempfile
from pathlib import Path
import pytest
import pandas as pd
import pyarrow.parquet as pq

from src.data.schemas import CanonicalArticle, CANONICAL_ARROW_SCHEMA
from src.data.extract import (
    parse_rfc2822_or_iso_date,
    RSSExtractor,
    FNSPIDExtractor,
    ExtractionPipeline
)
from src.data.validators import validate_extracted_dataset

def test_canonical_article_id_determinism():
    """Verify that article ID generation is deterministic and unique across variations."""
    id1 = CanonicalArticle.generate_id("Yahoo Finance", "AAPL", "2026-09-24T10:00:00Z", "Apple Unveils New Product")
    id2 = CanonicalArticle.generate_id("Yahoo Finance", "AAPL", "2026-09-24T10:00:00Z", "Apple Unveils New Product")
    id3 = CanonicalArticle.generate_id("Yahoo Finance", "MSFT", "2026-09-24T10:00:00Z", "Apple Unveils New Product")

    assert id1 == id2
    assert id1 != id3
    assert len(id1) == 64  # SHA-256 hex string

def test_date_parsing_rfc2822_and_iso():
    """Verify that multiple date conventions properly normalize to UTC ISO format."""
    # RFC 2822 (RSS format)
    rfc_date = "Thu, 24 Sep 2026 05:14:41 +0000"
    parsed_rfc = parse_rfc2822_or_iso_date(rfc_date)
    assert parsed_rfc == "2026-09-24T05:14:41Z"

    # Standard YYYY-MM-DD
    simple_date = "2026-09-24"
    parsed_simple = parse_rfc2822_or_iso_date(simple_date)
    assert parsed_simple.startswith("2026-09-24")

def test_rss_extractor_with_mock_xml():
    """Verify that RSS XML structure is correctly parsed into CanonicalArticle objects."""
    xml_content = """<?xml version="1.0" encoding="utf-8"?>
    <rss version="2.0">
      <channel>
        <title>Yahoo Finance: AAPL News</title>
        <item>
          <title>Apple AI Revenue Surges</title>
          <link>https://finance.yahoo.com/news/apple-ai-revenue.html</link>
          <description>Apple reported substantial AI revenue growth.</description>
          <pubDate>Thu, 24 Sep 2026 08:30:00 +0000</pubDate>
        </item>
      </channel>
    </rss>
    """
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_file = Path(tmp_dir) / "AAPL_yahoo_test.xml"
        tmp_file.write_text(xml_content, encoding="utf-8")

        articles = RSSExtractor.extract_from_file(tmp_file, ticker_hint="AAPL")
        assert len(articles) == 1
        art = articles[0]
        assert art.ticker == "AAPL"
        assert art.title == "Apple AI Revenue Surges"
        assert art.source == "Yahoo Finance"
        assert art.published_at == "2026-09-24T08:30:00Z"
        assert "substantial AI revenue" in art.raw_text

def test_fnspid_extractor():
    """Verify that FNSPID format CSV files are mapped properly."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        csv_file = Path(tmp_dir) / "fnspid_sample.csv"
        df = pd.DataFrame([
            {
                "Date": "2023-05-15 14:00:00",
                "Stock_symbol": "MSFT",
                "Article_title": "Microsoft Cloud Accelerates",
                "Article": "Microsoft Azure customer spending jumped significantly this quarter.",
                "URL": "https://example.com/msft-news",
                "Sentiment_score": 0.85
            }
        ])
        df.to_csv(csv_file, index=False)

        articles = FNSPIDExtractor.extract_from_file(csv_file, target_tickers={"MSFT"})
        assert len(articles) == 1
        art = articles[0]
        assert art.ticker == "MSFT"
        assert art.title == "Microsoft Cloud Accelerates"
        assert art.source == "FNSPID"
        assert "Azure customer" in art.raw_text
        extra = json.loads(art.extra_metadata)
        assert extra["fnspid_sentiment"] == 0.85

def test_parquet_save_and_validation():
    """Verify writing canonical articles to Parquet and running validation."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        parquet_file = Path(tmp_dir) / "test_articles.parquet"
        report_file = Path(tmp_dir) / "test_report.json"

        art = CanonicalArticle(
            article_id=CanonicalArticle.generate_id("Yahoo Finance", "NVDA", "2026-09-24T11:00:00Z", "Nvidia GPU Demand"),
            ticker="NVDA",
            published_at="2026-09-24T11:00:00Z",
            source="Yahoo Finance",
            title="Nvidia GPU Demand",
            raw_text="Demand for next-gen GPUs remains at record highs.",
            url="https://example.com/nvda",
            extra_metadata="{}"
        )

        ExtractionPipeline.save_to_parquet([art], parquet_file)
        assert parquet_file.exists()

        report = validate_extracted_dataset(parquet_path=parquet_file, report_path=report_file)
        assert report["status"] == "PASSED"
        assert report["total_articles"] == 1
        assert report["ticker_distribution"]["NVDA"] == 1
        assert report_file.exists()
