<div align="center">

<!-- ═══════════════════════════════════════════════════════ -->
<!--                       HERO SECTION                      -->
<!-- ═══════════════════════════════════════════════════════ -->

<img src="https://img.shields.io/badge/%E2%97%86-Signal_Desk-0E1420?style=for-the-badge&labelColor=0E1420&color=E8A33D" alt="Signal Desk" height="40"/>

# Algorithmic Market Sentiment &<br/>News Vector Correlation Platform

**Decode the signal. Quantify the edge. Predict what moves markets.**

An end-to-end data engineering and applied-ML system that ingests live financial news,<br/>
converts articles into 384-dimensional semantic embeddings, indexes them in a vector database,<br/>
and statistically tests whether shifts in the news *sentiment vector space*<br/>
**lead or lag** subsequent equity price movements.

<br/>

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Qdrant](https://img.shields.io/badge/Qdrant-Vector_DB-DC382D?style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiPjwvc3ZnPg==&logoColor=white)](https://qdrant.tech)
[![SentenceTransformers](https://img.shields.io/badge/🤗_Embeddings-MiniLM--L6--v2-FFD21E?style=flat-square)](https://sbert.net)
[![Tests](https://img.shields.io/badge/Tests-13%2F13_Passing-2EA44F?style=flat-square&logo=pytest&logoColor=white)]()
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](Dockerfile)

---

<table>
<tr>
<td width="33%" align="center">
<h4>🎯 25+ Tickers</h4>
<sub>US Mega-Caps · Nifty 50 · Crypto · Commodities</sub>
</td>
<td width="33%" align="center">
<h4>⚡ &lt;300ms p95</h4>
<sub>Qdrant semantic search latency</sub>
</td>
<td width="33%" align="center">
<h4>📐 384-dim Vectors</h4>
<sub>Dense SentenceTransformer embeddings</sub>
</td>
</tr>
</table>

</div>

---

## 🏗️ System Architecture

```mermaid
flowchart LR
  subgraph INGEST ["① Data Ingestion"]
    direction TB
    RSS["Yahoo Finance RSS<br/>Google News RSS"]
    EDGAR["SEC EDGAR<br/>8-K / 10-K Filings"]
    HF["HuggingFace FNSPID<br/>Historical Parquet"]
    NSE["NSE India<br/>Nifty 50 Feed"]
  end

  subgraph PROCESS ["② NLP Pipeline"]
    direction TB
    CLN["Clean & Deduplicate<br/>MinHash + Boilerplate Strip"]
    CHK["Sentence-Boundary<br/>Chunking (~500 tok)"]
    EMB["SentenceTransformers<br/>all-MiniLM-L6-v2"]
  end

  subgraph STORE ["③ Storage Layer"]
    direction TB
    QDR[("Qdrant Vector DB<br/>384-dim · Metadata Filters")]
    PRC[("Price Store<br/>OHLCV Parquet")]
  end

  subgraph ANALYTICS ["④ Analytics Engine"]
    direction TB
    SIG["Daily Signal<br/>Aggregation"]
    CORR["Lead-Lag Cross-Correlation<br/>±5 Trading Days"]
    ML["HistGradientBoosting<br/>+ Technical Indicators"]
  end

  subgraph SERVE ["⑤ Serving"]
    direction TB
    API["FastAPI REST<br/>:8000/docs"]
    WEB["Signal Desk Next.js Console<br/>:3000"]
  end

  RSS --> CLN
  EDGAR --> CLN
  HF --> CLN
  NSE --> CLN
  CLN --> CHK --> EMB --> QDR
  QDR --> SIG --> CORR
  PRC --> CORR
  CORR --> ML
  CORR --> API
  ML --> API
  QDR --> API
  API --> WEB
```

---

## ✨ Feature Highlights

<table>
<tr>
<td width="50%">

### 🔍 Semantic News Search
Query the vector database with natural language. Returns the most semantically similar articles with cosine similarity scores — not just keyword matches.

</td>
<td width="50%">

### 📊 Lead-Lag Correlation
Statistically test whether news sentiment **leads** or **lags** price movements across a configurable ±5 day window, with p-values and regime classification.

</td>
</tr>
<tr>
<td width="50%">

### 🧠 ML Prediction Engine
HistGradientBoosting model fuses technical indicators (RSI, MACD, Bollinger) with sentiment signals for confidence-gated directional predictions.

</td>
<td width="50%">

### 🌐 Multi-Market Coverage
US mega-caps (NVDA, AAPL, TSLA), Indian equities (RELIANCE, TCS, INFY), crypto (BTC-USD), commodities (Gold), and major indices (S&P 500, Nasdaq 100).

</td>
</tr>
<tr>
<td width="50%">

### ⚡ Real-Time Ingestion Queue
Async streaming worker accepts live article pushes via API, embedding and indexing them into Qdrant in near real-time without pipeline restarts.

</td>
<td width="50%">

### 🛡️ Evidence Traceability
Every signal spike is traceable back to source articles. The `/evidence/{ticker}` endpoint returns the exact news snippets that drove a given day's sentiment.

</td>
</tr>
</table>

---

## 📂 Project Structure

```
Algorithmic-Market-Sentiment-News-Vector-Correlation-Platform/
│
├── src/
│   ├── config.py                    # Central configuration — paths, tickers, model params
│   ├── api/
│   │   ├── main.py                  # FastAPI application — REST endpoints + Signal Desk server
│   │   └── schemas.py               # Pydantic request/response models
│   ├── data/
│   │   ├── download.py              # Live RSS feed scraper (Yahoo Finance, Google News)
│   │   ├── edgar_feed.py            # SEC EDGAR 8-K/10-K filing ingestor
│   │   ├── fnspid_hf_feed.py        # HuggingFace FNSPID historical dataset loader
│   │   ├── nse_feed.py              # NSE India equity news feed
│   │   ├── extract.py               # Canonical normalization & SHA-256 dedup
│   │   ├── database.py              # SQLite connection manager
│   │   ├── vector_handoff.py        # Qdrant ↔ analytics bridge
│   │   ├── schemas.py               # Data layer Pydantic models
│   │   └── validators.py            # Input validation utilities
│   ├── pipeline/
│   │   ├── clean_chunk.py           # HTML stripping, boilerplate removal, passage chunking
│   │   ├── embeddings.py            # SentenceTransformers embedding engine
│   │   ├── vector_store.py          # Qdrant persistent collection manager
│   │   ├── price_feed.py            # Yahoo Finance OHLCV downloader + log returns
│   │   └── realtime_queue.py        # Async real-time article ingestion worker
│   ├── analytics/
│   │   ├── correlation.py           # Lead-lag cross-correlation + backtest engine
│   │   └── high_accuracy_model.py   # HistGradientBoosting ML predictor
│   ├── dashboard/
│   │   └── app.py                   # Streamlit interactive analytics dashboard
│   └── utils/
│       └── logger.py                # Structured logging configuration
│
├── web/                             # Signal Desk — Next.js 16 (React / Tailwind / shadcn) UI
│   ├── src/
│   │   ├── app/                     # Next.js App Router pages & API proxy routes
│   │   ├── components/              # Signal Desk dashboard widgets & UI components
│   │   └── lib/                     # Signal data definitions & utilities
│   ├── public/                      # Static assets & brand graphics
│   ├── package.json
│   └── next.config.ts
│
├── tests/
│   ├── test_extraction.py           # Data pipeline unit tests
│   └── test_full_platform.py        # End-to-end integration tests
│
├── data/                            # Runtime data (gitignored, structure preserved)
│   ├── raw/                         # RSS XML feeds & historical downloads
│   ├── extracted/                   # Canonical articles (Parquet)
│   ├── processed/                   # Chunked passages (Parquet)
│   ├── prices/                      # OHLCV price data (Parquet)
│   ├── analytics/                   # Correlation results (JSON)
│   ├── data_store/                  # SQLite database
│   └── qdrant_db/                   # Vector database storage
│
├── run_platform.py                  # 🚀 Main orchestrator — pipeline + services
├── run_extraction.py                # Standalone extraction pipeline runner
├── ingest_massive_data.py           # Multi-phase bulk data ingestion script
├── requirements.txt                 # Python dependencies
├── Dockerfile                       # Container build
├── docker-compose.yml               # Multi-service orchestration
├── .env.example                     # Environment variable template
└── LICENSE                          # MIT License
```

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+**
- **pip** (or **uv** for faster installs)

### 1. Clone & Install

```bash
git clone https://github.com/Har-dik25/Algorithmic-Market-Sentiment-News-Vector-Correlation-Platform.git
cd Algorithmic-Market-Sentiment-News-Vector-Correlation-Platform

# Install dependencies
pip install -r requirements.txt
```

### 2. Run the Full Pipeline

```bash
# Execute the complete computational pipeline end-to-end:
#   Ingest → Clean → Embed → Store → Fetch Prices → Correlate
python run_platform.py --compute-only
```

### 3. Launch Services

```bash
# Option A: API only (Swagger UI at http://localhost:8000/docs)
python run_platform.py --serve-api

# Option B: Signal Desk Next.js Frontend (http://localhost:3000)
cd web && npm run dev

# Option C: Everything — API + Next.js Frontend concurrently
python run_platform.py --serve-api --serve-frontend
```

### 4. Docker Quick Start (Alternative)

```bash
# One command to spin up the entire stack (API + Web + Qdrant)
docker compose up --build

# Include the Streamlit analytics companion too
docker compose --profile full up --build
```

---

## 🔌 API Reference

All endpoints are auto-documented at [`http://localhost:8000/docs`](http://localhost:8000/docs) via Swagger UI.

| Method | Endpoint | Description |
|:---:|---|---|
| `GET` | `/health` | System health — Qdrant vector count, price records, pipeline freshness, uptime |
| `GET` | `/tickers` | Full ticker universe grouped by sector |
| `GET` | `/correlation/{ticker}` | Lead-lag correlation curve across ±5 trading days, optimal lag offset, market regime classification (`LEADING_SIGNAL` · `LAGGING_SIGNAL` · `COINCIDENT`) |
| `GET` | `/signals/{ticker}` | Aligned daily time series — stock close price × news-vector sentiment score |
| `GET` | `/search?query=...&ticker=...` | Dense semantic similarity search against Qdrant (<300ms p95) |
| `GET` | `/evidence/{ticker}?date=YYYY-MM-DD` | Source articles and text snippets behind a specific signal date |
| `POST` | `/ingest` | Push a live article into the real-time ingestion queue |
| `POST` | `/recompute?api_key=...` | Trigger a full pipeline recomputation (protected) |

---

## 🧪 Testing

```bash
# Run full test suite (13 tests — unit + integration)
python -m pytest tests/ -v
```

| Test | Scope | Validates |
|---|---|---|
| `test_rss_extractor` | Unit | RSS XML parsing → CanonicalArticle mapping |
| `test_edgar_extractor` | Unit | SEC EDGAR filing extraction pipeline |
| `test_fnspid_extractor` | Unit | HuggingFace Parquet dataset loading |
| `test_parquet_save_and_validation` | Integration | End-to-end Parquet serialization + schema validation |
| `test_clean_text_strips_html` | Unit | HTML boilerplate removal accuracy |
| `test_chunking_respects_boundaries` | Unit | Sentence-boundary splitting correctness |
| `test_deduplication` | Unit | Near-duplicate filtering via MinHash |
| `test_embedding_engine` | Integration | SentenceTransformers vector shape and cosine similarity |
| `test_qdrant_vector_store_roundtrip` | Integration | Embed → upsert → query roundtrip through Qdrant |
| `test_correlation_engine_math` | Unit | Cross-correlation computation and p-value math |
| `test_fastapi_endpoints` | Integration | All REST endpoints return correct status codes + schemas |
| `test_high_accuracy_predictor_gating` | Integration | ML model confidence gating and prediction pipeline |
| `test_extraction_pipeline` | Integration | Full 4-source extraction pipeline validation |

---

## 🚀 Production Deployment

### Option A — Docker Compose (Recommended for Self-Hosting)

The entire platform ships as a multi-container Docker Compose stack. One command launches everything.

**Prerequisites:** [Docker Desktop](https://docs.docker.com/get-docker/) or Docker Engine + Compose plugin.

```bash
# 1. Clone the repository
git clone https://github.com/Har-dik25/Algorithmic-Market-Sentiment-News-Vector-Correlation-Platform.git
cd Algorithmic-Market-Sentiment-News-Vector-Correlation-Platform

# 2. Create your environment file
cp .env.example .env        # edit API keys if needed

# 3. Build & start the full stack
docker compose up --build -d

# 4. (Optional) Include Streamlit analytics companion
docker compose --profile full up --build -d
```

| Service | URL | Container |
|---------|-----|-----------|
| **FastAPI Backend** | http://localhost:8000/docs | `market_sentiment_api` |
| **Signal Desk (Next.js)** | http://localhost:3000 | `market_sentiment_web` |
| **Qdrant Vector DB** | http://localhost:6333/dashboard | `market_sentiment_qdrant` |
| **Streamlit Dashboard** | http://localhost:8501 *(profile: full)* | `market_sentiment_dashboard` |

```bash
# View logs
docker compose logs -f api web

# Stop everything
docker compose down

# Stop and remove volumes (full reset)
docker compose down -v
```

---

### Option B — Render (One-Click Cloud Deploy)

The repo includes a [`render.yaml`](render.yaml) blueprint for zero-config deployment on [Render](https://render.com).

**Steps:**

1. Push your code to GitHub.
2. Go to [Render Dashboard](https://dashboard.render.com/) → **New** → **Blueprint**.
3. Connect your GitHub repo and select the branch (`main`).
4. Render auto-detects `render.yaml` and provisions two services:
   - `market-sentiment-api` — Python FastAPI backend (free tier).
   - `market-sentiment-web` — Node.js Signal Desk frontend (free tier).
5. The frontend's `NEXT_PUBLIC_API_URL` is auto-wired to the backend's URL.
6. Click **Apply** — both services build and go live in ~5 minutes.

> [!NOTE]
> The free tier uses in-memory Qdrant (`QDRANT_MODE=memory`). Data resets on cold starts. Upgrade to a paid plan for persistent storage, or provision a Qdrant Cloud instance and set `QDRANT_HOST` / `QDRANT_PORT`.

---

### Option C — Vercel (Frontend) + Render (Backend)

For maximum performance, deploy the frontend on [Vercel](https://vercel.com) and the backend on Render.

**Backend (Render):**
- Follow Option B above, but only deploy the `market-sentiment-api` service.
- Note your backend URL (e.g., `https://market-sentiment-api.onrender.com`).

**Frontend (Vercel):**

1. Go to [vercel.com/new](https://vercel.com/new) → Import your GitHub repo.
2. Set **Root Directory** to `web`.
3. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL = https://market-sentiment-api.onrender.com
   ```
4. Click **Deploy**. Vercel auto-detects Next.js and builds it.

> [!TIP]
> Update the `destination` in [`web/vercel.json`](web/vercel.json) to match your Render backend URL if you want server-side API proxying.

---

### Option D — Railway (Alternative PaaS)

[Railway](https://railway.app) supports multi-service deploys from a single repo.

1. Create a new project → **Deploy from GitHub Repo**.
2. Add two services:
   - **Backend:** Root `/`, start command `python run_platform.py --serve-api`.
   - **Frontend:** Root `web/`, start command `npm run start`.
3. Add a **Qdrant** plugin from Railway's marketplace.
4. Set environment variables (`QDRANT_HOST`, `QDRANT_PORT`, `NEXT_PUBLIC_API_URL`).
5. Deploy.

---

### Option E — Manual VPS / Cloud VM

For full control on any Linux server (AWS EC2, GCP, DigitalOcean, etc.):

```bash
# 1. SSH into your server
ssh user@your-server-ip

# 2. Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker

# 3. Clone and deploy
git clone https://github.com/Har-dik25/Algorithmic-Market-Sentiment-News-Vector-Correlation-Platform.git
cd Algorithmic-Market-Sentiment-News-Vector-Correlation-Platform
cp .env.example .env

# 4. Launch (detached)
docker compose up --build -d

# 5. (Optional) Set up reverse proxy with Nginx + SSL
sudo apt install -y nginx certbot python3-certbot-nginx
# Configure nginx to proxy port 3000 (web) and 8000 (api)
```

---

### Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `API_PORT` | `8000` | FastAPI server port |
| `DASHBOARD_PORT` | `8501` | Streamlit dashboard port |
| `CORS_ORIGINS` | `*` | Allowed CORS origins (comma-separated) |
| `QDRANT_HOST` | `localhost` | Qdrant server host (`qdrant` in Docker) |
| `QDRANT_PORT` | `6333` | Qdrant gRPC port |
| `QDRANT_MODE` | `memory` | `memory` for in-process, or `persistent` for external Qdrant |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend URL for the frontend |
| `API_KEY` | *(empty)* | Admin key for `/recompute` endpoint |
| `SEC_EDGAR_USER_AGENT` | *(example)* | Required for SEC EDGAR API |
| `ALPHA_VANTAGE_API_KEY` | *(empty)* | Optional market data API key |

---

### ✅ Production Checklist

- [ ] Set `CORS_ORIGINS` to your actual frontend domain(s) instead of `*`
- [ ] Generate a strong `API_KEY` for the `/recompute` endpoint
- [ ] Run `python run_platform.py --compute-only` once to populate data before first deploy
- [ ] Verify `/health` endpoint returns healthy status for all subsystems
- [ ] Set up a custom domain and TLS/SSL certificate (Render and Vercel handle this automatically)
- [ ] Configure monitoring and alerts on the `/health` endpoint
- [ ] Review and pin dependency versions in `requirements.txt` and `package.json`

---

## 🛠️ Tech Stack

| Layer | Technology | Role |
|---|---|---|
| **API** | FastAPI + Uvicorn | Async REST service with auto-generated OpenAPI docs |
| **Embeddings** | SentenceTransformers (`all-MiniLM-L6-v2`) | 384-dim dense vector generation — runs locally, no API keys |
| **Vector DB** | Qdrant (local persistent) | Sub-300ms semantic search with metadata filtering |
| **ML** | scikit-learn (HistGradientBoosting) | Confidence-gated directional prediction |
| **Analytics** | NumPy · SciPy · pandas | Cross-correlation, statistical testing, time-series alignment |
| **Visualization** | Recharts · Framer Motion | Interactive trading charts, sparklines, and signal feeds |
| **Frontend** | Next.js 16 (React 19 / Tailwind / shadcn) | Full-featured Signal Desk trading terminal console |
| **Data** | Apache Parquet · SQLite | Columnar storage for articles/prices, relational for metadata |
| **Infra** | Docker · GitHub Actions | Containerized deployment and CI pipeline |

---

## 📈 How It Works

```
                    ┌─────────────────────────────────────────────┐
   Day 0            │  "NVIDIA announces record AI chip orders"   │
   ──────────────── │  "Tesla Cybertruck deliveries surge 40%"    │
                    │  "Fed signals rate pause — markets rally"   │
                    └──────────────┬──────────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │   embed() → 384-dim vector    │
                    │   per chunk, per article       │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │   Aggregate daily centroid     │
                    │   drift from rolling baseline  │
                    │   = "News Vector Signal"       │
                    └──────────────┬───────────────┘
                                   │
            ┌──────────────────────┼──────────────────────┐
            ▼                      ▼                      ▼
     ┌─────────────┐     ┌─────────────┐      ┌──────────────────┐
     │  Lag = -2    │     │  Lag = 0    │      │   Lag = +3       │
     │  corr: 0.12  │     │  corr: 0.31 │      │   corr: 0.47 ★  │
     │  p: 0.34     │     │  p: 0.08    │      │   p: 0.003       │
     └─────────────┘     └─────────────┘      └──────────────────┘
                                                       │
                                                       ▼
                                              LEADING_SIGNAL
                                        "News led price by 3 days"
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
<br/>

**Built with ◆ by [Har-dik25](https://github.com/Har-dik25)**

<sub>If this project helped you, consider giving it a ⭐</sub>

</div>
