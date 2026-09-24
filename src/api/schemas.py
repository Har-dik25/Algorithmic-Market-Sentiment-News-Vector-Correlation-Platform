from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class TickerItem(BaseModel):
    symbol: str
    name: str
    sector: str

class TickerListResponse(BaseModel):
    tickers: List[TickerItem]

class PriceRecord(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: float
    returns: Optional[float] = 0.0
    log_returns: Optional[float] = 0.0


class PriceDataResponse(BaseModel):
    ticker: str
    records: List[PriceRecord]

class ArticleItem(BaseModel):
    article_id: str
    ticker: str
    published_at: str
    date: Optional[str] = None
    headline: str
    source: Optional[str] = None
    raw_text_snippet: Optional[str] = None
    sentiment_score: Optional[float] = 0.0
    similarity_score: Optional[float] = None

class SimilaritySearchRequest(BaseModel):
    ticker: str
    query_text: str
    top_k: int = Field(default=5, ge=1, le=50)

class SimilaritySearchResponse(BaseModel):
    ticker: str
    query_text: str
    results: List[ArticleItem]

class CorrelationQueryResponse(BaseModel):
    ticker: str
    calculated_at: str
    lag_min: int
    lag_max: int
    optimal_lag: int
    max_correlation: float
    lead_lag_classification: str
    p_value_at_optimal: float
    sample_size: int
    lags: List[int]
    pearson_r: List[float]
    spearman_rho: List[float]
    p_values: List[float]
    ci_lower: List[float]
    ci_upper: List[float]
    backtest_accuracy: float

class HealthStatusResponse(BaseModel):
    status: str
    uptime_seconds: float
    database: str
    total_tickers: int
    total_articles: int
    total_price_records: int
    last_correlation_run: str
