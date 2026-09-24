# Signal Desk — Frontend

A standalone, professional-grade frontend for the Algorithmic Market Sentiment & News Vector Correlation Platform. Plain HTML/CSS/JS — no build step, no framework, no backend included.

## Run it

Just open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 5500
# then visit http://localhost:5500
```

It loads with **generated demo data** so every panel is browsable immediately, with no backend running.

## Connect it to the real API

1. Start the platform's FastAPI backend (`python run_platform.py --serve-api` in the main project repo).
2. In the top-right **API** field, enter the backend's URL (defaults to `http://localhost:8000`).
3. Click **connect**.

If the health check succeeds, the status pill switches to "live" and a toast confirms the connection. If any individual call fails afterward, that panel silently falls back to demo data instead of breaking, so a partially-running backend degrades gracefully.

Endpoints used:
- `GET /health`, `GET /tickers`
- `GET /correlation/{ticker}`, `GET /signals/{ticker}`, `GET /api/v1/price-data`
- `GET /evidence/{ticker}?date=`, `GET /search?query=&ticker=`
- `GET /backtest/{ticker}`, `GET /api/v1/ml-metrics` (feed the KPI strip)

## Features

- **KPI strip** — tracked tickers, indexed articles, backtest accuracy, last correlation run, and model confidence at a glance, refreshed on every ticker change.
- **Sector filter chips + live search** in the sidebar, on top of the full ticker watchlist.
- **Keyboard navigation** — `↑`/`↓` to move through the watchlist, `Enter` to select.
- **Compare mode** — overlay a second ticker's correlation curve (dashed) on the primary chart to eyeball which one leads.
- **Click-to-evidence** — click any point on the price/signal overlay chart to jump straight to that date's evidence panel.
- **Semantic search** panel against the vector store, with similarity scores.
- **Chart export** — download the correlation chart as a PNG.
- **Toast notifications** for connection state, search/evidence errors, and compare-mode changes.
- **Skeleton loading states** on both charts while data is in flight.
- **Watchlist regime dots** — every ticker in the sidebar shows a small lead/lag/coincident dot, lazily loaded and cached per session.
- **Auto-refresh** — while connected, the health check and KPI strip quietly re-poll every 30 seconds; if the backend drops, it falls back to demo data automatically with a toast.
- **Recompute trigger** — a top-bar button that calls the backend's `/api/v1/recompute` endpoint (with a confirmation prompt) to kick off a full correlation recompute.
- **Remembers you** — your API URL, active ticker, compare selection, and sector filter persist in `localStorage` between visits.
- **Help panel** (the `?` button) documenting shortcuts and features in-app.
- Fully responsive down to mobile, visible keyboard focus rings, and `prefers-reduced-motion` respected.

## Files

- `index.html` — page structure
- `style.css` — design system (dark console theme, one accent color, semantic lead/lag/coincident colors, toasts, skeletons)
- `app.js` — data fetching, demo-data fallback, compare mode, keyboard nav, and Plotly chart rendering (Plotly loaded from CDN)

## Notes

- No CORS proxy is included — if your backend is on a different origin than the page, make sure its CORS settings allow it (the sample backend's `CORSMiddleware` already allows `*`).
- This package is frontend-only by design: there's no server code, database, or embedding pipeline here — pair it with the backend from the main repo to see real signals.
