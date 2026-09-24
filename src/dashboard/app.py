import json
import sys
from pathlib import Path
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import streamlit as st
import requests

# Setup sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.config import (
    ALL_TICKERS,
    TICKER_UNIVERSE,
    CORRELATION_RESULTS_FILE,
    DAILY_SIGNALS_FILE,
    OHLCV_FILE,
    API_PORT
)

API_BASE = f"http://127.0.0.1:{API_PORT}"

# Page Config
st.set_page_config(
    page_title="Market Sentiment & News Vector Platform",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styling (Dark-mode, Clean Typography, Visual polish)
st.markdown("""
<style>
    .main-title {
        font-size: 2.2rem;
        font-weight: 700;
        background: linear-gradient(90deg, #38bdf8, #818cf8);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0.2rem;
    }
    .sub-title {
        color: #94a3b8;
        font-size: 1.05rem;
        margin-bottom: 1.5rem;
    }
    .metric-card {
        background-color: #1e293b;
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 16px;
        text-align: center;
    }
    .metric-value {
        font-size: 1.8rem;
        font-weight: 700;
        color: #38bdf8;
    }
    .metric-label {
        font-size: 0.85rem;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .article-box {
        background-color: #0f172a;
        border-left: 4px solid #38bdf8;
        border-radius: 4px;
        padding: 12px 16px;
        margin-bottom: 12px;
    }
</style>
""", unsafe_allow_html=True)

# App Header
st.markdown('<div class="main-title">Algorithmic Market Sentiment & News Vector Correlation Platform</div>', unsafe_allow_html=True)
st.markdown('<div class="sub-title">Dense Semantic News Embeddings vs. Lead-Lag Price Cross-Correlation Analysis</div>', unsafe_allow_html=True)

# Sidebar
st.sidebar.header("Controls & Filters")
sector_choice = st.sidebar.selectbox("Select Sector", ["All Sectors"] + list(TICKER_UNIVERSE.keys()))

if sector_choice == "All Sectors":
    available_tickers = ALL_TICKERS
else:
    available_tickers = TICKER_UNIVERSE[sector_choice]

selected_ticker = st.sidebar.selectbox("Select Ticker", available_tickers, index=0)

# Load Data
@st.cache_data
def load_correlation_data():
    if not CORRELATION_RESULTS_FILE.exists():
        return {}
    with open(CORRELATION_RESULTS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

@st.cache_data
def load_time_series_data(ticker: str):
    if not DAILY_SIGNALS_FILE.exists() or not OHLCV_FILE.exists():
        return None
    try:
        signals_df = pd.read_parquet(DAILY_SIGNALS_FILE)
        prices_df = pd.read_parquet(OHLCV_FILE)
        t_sig = signals_df[signals_df["ticker"] == ticker]
        t_pr = prices_df[prices_df["ticker"] == ticker]
        if t_sig.empty or t_pr.empty:
            return None
        merged = pd.merge(t_pr, t_sig, on="date", how="left").sort_values("date")
        merged["sentiment_signal"] = merged["sentiment_signal"].fillna(0.0)
        merged["article_count"] = merged["article_count"].fillna(0).astype(int)
        return merged
    except Exception:
        return None

corr_data = load_correlation_data()
ticker_corr = corr_data.get(selected_ticker, {})

# Top KPIs
col1, col2, col3, col4 = st.columns(4)

with col1:
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-label">Selected Equity</div>
        <div class="metric-value">{selected_ticker}</div>
    </div>
    """, unsafe_allow_html=True)

with col2:
    optimal_lag = ticker_corr.get("optimal_lag_days", "N/A")
    lag_label = f"{optimal_lag} Days" if optimal_lag != "N/A" else "N/A"
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-label">Optimal Lead-Lag Offset</div>
        <div class="metric-value">{lag_label}</div>
    </div>
    """, unsafe_allow_html=True)

with col3:
    peak_r = ticker_corr.get("peak_correlation", 0.0)
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-label">Peak |Correlation|</div>
        <div class="metric-value">{abs(peak_r):.4f}</div>
    </div>
    """, unsafe_allow_html=True)

with col4:
    regime = ticker_corr.get("regime", "ANALYZING")
    regime_display = regime.replace("_", " ")
    color = "#10b981" if "LEADING" in regime else "#f59e0b"
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-label">Market Dynamic</div>
        <div class="metric-value" style="color: {color}; font-size: 1.35rem;">{regime_display}</div>
    </div>
    """, unsafe_allow_html=True)

st.markdown("---")

# Main Content Tabs
tab1, tab2, tab3 = st.tabs(["📊 Lead-Lag Correlation Analysis", "📈 Price & Sentiment Overlay", "🔍 'Show Me The Evidence' Drill-Down"])

with tab1:
    st.subheader(f"Lead-Lag Cross-Correlation Curve: {selected_ticker}")
    st.caption("Visualizes whether news sentiment vectors systematically lead subsequent price returns (negative lag) or lag after the move (positive lag).")

    curve = ticker_corr.get("correlation_curve", [])
    if curve:
        curve_df = pd.DataFrame(curve)

        # Plotly Bar Chart
        colors = []
        for _, row in curve_df.iterrows():
            if row["lag_days"] == optimal_lag:
                colors.append("#38bdf8")  # Cyan for optimal
            elif row["pearson_r"] >= 0:
                colors.append("#10b981")  # Emerald for positive
            else:
                colors.append("#f43f5e")  # Rose for negative

        fig_corr = go.Figure()
        fig_corr.add_trace(go.Bar(
            x=curve_df["lag_days"],
            y=curve_df["pearson_r"],
            marker_color=colors,
            text=[f"r={r:.3f}<br>(p={p:.3f})" for r, p in zip(curve_df["pearson_r"], curve_df["p_value"])],
            textposition="auto",
            name="Correlation"
        ))

        # Add vertical line at lag 0
        fig_corr.add_vline(x=0, line_dash="dash", line_color="#94a3b8", annotation_text="Lag 0 (Same-day)")

        # Shaded Background Annotations
        fig_corr.add_vrect(x0=-5.5, x1=-0.1, fillcolor="#047857", opacity=0.08, line_width=0, annotation_text="NEWS LEADS PRICE (Early Signal)", annotation_position="top left")
        fig_corr.add_vrect(x0=0.1, x1=5.5, fillcolor="#b45309", opacity=0.08, line_width=0, annotation_text="NEWS LAGS PRICE (Reactionary)", annotation_position="top right")

        fig_corr.update_layout(
            template="plotly_dark",
            title=f"Cross-Correlation vs. Trading Day Lag Window [-5, +5] for {selected_ticker}",
            xaxis_title="Lag Offset in Trading Days (k)",
            yaxis_title="Pearson Correlation Coefficient (r)",
            yaxis=dict(range=[-1.0, 1.0]),
            height=480,
            margin=dict(l=40, r=40, t=60, b=40)
        )
        st.plotly_chart(fig_corr, use_container_width=True)

        summary_text = ticker_corr.get("summary", "")
        if summary_text:
            st.info(f"**Interpretation**: {summary_text}")
    else:
        st.warning(f"No correlation curve data computed for {selected_ticker} yet. Run the analytics pipeline.")

with tab2:
    st.subheader(f"Equity Price vs. News Sentiment Vector Signal: {selected_ticker}")
    ts_data = load_time_series_data(selected_ticker)

    if ts_data is not None and not ts_data.empty:
        # Dual-axis chart
        fig_ts = make_subplots(specs=[[{"secondary_y": True}]])

        # Price line
        fig_ts.add_trace(
            go.Scatter(
                x=ts_data["date"],
                y=ts_data["close"],
                name="Stock Price ($)",
                line=dict(color="#38bdf8", width=2.5)
            ),
            secondary_y=False
        )

        # Sentiment Vector Signal bars/line
        fig_ts.add_trace(
            go.Bar(
                x=ts_data["date"],
                y=ts_data["sentiment_signal"],
                name="News Sentiment Signal",
                marker_color="#818cf8",
                opacity=0.5
            ),
            secondary_y=True
        )

        fig_ts.update_layout(
            template="plotly_dark",
            title=f"{selected_ticker} Daily Closing Price vs. News Vector Sentiment Signal",
            height=480,
            hovermode="x unified",
            margin=dict(l=40, r=40, t=60, b=40)
        )
        fig_ts.update_yaxes(title_text="Close Price ($)", secondary_y=False)
        fig_ts.update_yaxes(title_text="News Sentiment Vector Signal", range=[-1.0, 1.0], secondary_y=True)

        st.plotly_chart(fig_ts, use_container_width=True)
    else:
        st.warning(f"Time series data for {selected_ticker} not available.")

with tab3:
    st.subheader(f"Traceable Evidence & Semantic Retrieval: {selected_ticker}")
    st.caption("Drill down into the actual articles in the vector database driving sentiment spikes.")

    col_date, col_search = st.columns([1, 1])
    with col_date:
        target_date = st.date_input("Filter by Date", value=pd.to_datetime("today"))
        target_date_str = target_date.strftime("%Y-%m-%d")

    with col_search:
        search_query = st.text_input("Or Search Vector Space Semantically", placeholder="e.g. AI chips, revenue growth, downgrade")

    # Use FastAPI backend for vector search (avoids Qdrant lock conflicts)
    if search_query.strip():
        st.markdown(f"**Semantic Search Results for:** `'{search_query}'`")
        try:
            resp = requests.get(f"{API_BASE}/search", params={"query": search_query, "ticker": selected_ticker, "top_k": 5}, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                hits = data.get("results", [])
                if hits:
                    for hit in hits:
                        p = hit["payload"]
                        score = hit["score"]
                        st.markdown(f"""
                        <div class="article-box">
                            <span style="background-color: #38bdf8; color: #000; font-size: 0.75rem; font-weight: bold; padding: 2px 6px; border-radius: 4px;">{p.get('source', 'News')}</span>
                            <span style="color: #10b981; font-weight: bold; margin-left: 8px;">Similarity: {score:.3f}</span>
                            <span style="color: #94a3b8; font-size: 0.85rem; margin-left: 8px;">{p.get('published_at', '')}</span>
                            <h4 style="margin: 8px 0 4px 0; color: #f8fafc;">{p.get('title', 'Article')}</h4>
                            <p style="color: #cbd5e1; font-size: 0.9rem; margin-bottom: 4px;">{p.get('snippet', p.get('full_chunk', ''))}</p>
                            <a href="{p.get('url', '#')}" target="_blank" style="color: #818cf8; font-size: 0.85rem;">Read Full Source Article ↗</a>
                        </div>
                        """, unsafe_allow_html=True)
                else:
                    st.info("No matching articles found in vector store.")
            else:
                st.error(f"API error: {resp.status_code}")
        except requests.ConnectionError:
            st.error("⚠️ Cannot connect to FastAPI backend. Ensure `uvicorn src.api.main:app` is running on port 8000.")
    else:
        st.markdown(f"**Articles on or around:** `{target_date_str}`")
        articles = []
        try:
            resp = requests.get(f"{API_BASE}/evidence/{selected_ticker}", params={"date": target_date_str, "limit": 5}, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                articles = data.get("evidence_articles", [])
        except requests.ConnectionError:
            st.error("⚠️ Cannot connect to FastAPI backend. Ensure `uvicorn src.api.main:app` is running on port 8000.")

        if not articles:
            st.info(f"No specific articles published exactly on {target_date_str} for {selected_ticker}.")

        for art in articles:
            st.markdown(f"""
            <div class="article-box">
                <span style="background-color: #38bdf8; color: #000; font-size: 0.75rem; font-weight: bold; padding: 2px 6px; border-radius: 4px;">{art.get('source', 'Wire')}</span>
                <span style="color: #94a3b8; font-size: 0.85rem; margin-left: 8px;">{art.get('published_at', '')}</span>
                <h4 style="margin: 8px 0 4px 0; color: #f8fafc;">{art.get('title', 'Article')}</h4>
                <p style="color: #cbd5e1; font-size: 0.9rem; margin-bottom: 4px;">{art.get('snippet', art.get('full_chunk', ''))}</p>
                <a href="{art.get('url', '#')}" target="_blank" style="color: #818cf8; font-size: 0.85rem;">Read Source Article ↗</a>
            </div>
            """, unsafe_allow_html=True)

# Footer
st.markdown("---")
st.markdown("<div style='text-align: center; color: #64748b; font-size: 0.85rem;'>Algorithmic Market Sentiment & News Vector Correlation Platform • Portfolio Capstone</div>", unsafe_allow_html=True)
