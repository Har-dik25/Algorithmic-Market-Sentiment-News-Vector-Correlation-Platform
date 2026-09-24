# Signal Desk — Pro Trading Signals Terminal

A professional, production-grade trading-signals terminal frontend built with
**Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS 4**, **shadcn/ui**,
**Recharts**, and **Framer Motion**.

![Signal Desk](https://img.shields.io/badge/Next.js-16-black) ![TS](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8)

## ✨ Features

- **Live trading terminal** — KPI cards with sparklines & deltas, BTC/USDT price
  chart with signal entry markers, and a streaming live signal feed.
- **Real-time feel** — simulated price ticking with green/red flash, streaming
  signal cards via `AnimatePresence`, pulsing live indicators, marquee ticker tape.
- **Signals log** — filterable table (status / direction / search) backed by a
  real `/api/signals` route, with loading skeletons, confidence bars & risk metrics.
- **Watchlist** — multi-asset (Crypto, Forex, Stocks, Commodities, Indices) with
  live prices, 24h change, volume and trend sparklines.
- **Analytics** — equity curve (area), monthly P&L (bar), strategy-mix donut, and a
  fear/greed sentiment gauge.
- **AI Scout** — rotating AI market-intelligence insights.
- **Polished UX** — dark/light themes, scroll-spy sidebar navigation, sticky
  topbar with ⌘K search, live UTC market clock, notifications, command palette.
- **Responsive** — mobile-first; sidebar collapses to a sheet, tables scroll,
  charts reflow. Sticky footer with ticker tape on every page.

## 🛠 Tech Stack

| Area        | Tech                                              |
| ----------- | ------------------------------------------------- |
| Framework   | Next.js 16 (App Router)                            |
| Language    | TypeScript 5                                       |
| Styling     | Tailwind CSS 4 + shadcn/ui (New York)             |
| Charts      | Recharts                                          |
| Animation   | Framer Motion                                     |
| Icons       | lucide-react                                       |
| Fonts       | Geist Sans / Mono + JetBrains Mono (tabular nums) |

## 🚀 Getting Started

```bash
# install dependencies
bun install

# start the dev server (http://localhost:3000)
bun run dev
```

> The app uses a local SQLite database via Prisma (already configured). If you
> need to (re)create the schema, run `bun run db:push`. The demo data is
> generated in-memory by `src/lib/signal-data.ts` and served through the API
> routes — no external services required.

## 📁 Project Structure

```
src/
├─ app/
│  ├─ api/
│  │  ├─ signals/route.ts   # filterable signals endpoint
│  │  ├─ market/route.ts     # assets / watchlist data
│  │  └─ stats/route.ts      # KPIs, equity, monthly, sentiment
│  ├─ globals.css            # trading theme (dark/light), animations
│  ├─ layout.tsx             # metadata, ThemeProvider, fonts
│  └─ page.tsx               # the terminal dashboard (single route)
├─ components/
│  ├─ signal-desk/           # all terminal UI components
│  │  ├─ sidebar.tsx, topbar.tsx, footer.tsx, ticker-tape.tsx
│  │  ├─ kpi-cards.tsx, main-chart.tsx, signal-feed.tsx
│  │  ├─ watchlist.tsx, signals-table.tsx
│  │  ├─ performance.tsx, strategy-distribution.tsx, ai-scout.tsx
│  │  ├─ sparkline.tsx, logo.tsx, section-header.tsx, ...
│  └─ ui/                    # shadcn/ui primitives
└─ lib/
   ├─ signal-data.ts         # types + deterministic mock market data
   ├─ db.ts                  # Prisma client
   └─ utils.ts
```

## 🎨 Design Notes

- Color tokens use `oklch()` with semantic `--success / --danger / --warning`
  variables so the whole UI stays consistent across themes.
- Financial numbers use a monospace stack + `tabular-nums` for perfect alignment.
- Default theme is **dark** (trading-terminal aesthetic); toggle to light from
  the topbar.

---

Built with Z.ai Code.
