
// ---------- Types ----------
export type Direction = "LONG" | "SHORT";
export type SignalStatus = "ACTIVE" | "PENDING" | "TP_HIT" | "SL_HIT" | "CLOSED";
export type AssetClass = "Crypto" | "Forex" | "Stocks" | "Commodities" | "Indices";

export interface Asset {
  symbol: string;
  name: string;
  klass: AssetClass;
  price: number;
  change24h: number;
  volume24h: number;
  spark: number[];
}

export interface Signal {
  id: string;
  asset: string;
  assetName: string;
  klass: AssetClass;
  direction: Direction;
  status: SignalStatus;
  entry: number;
  takeProfit: number;
  stopLoss: number;
  rr: number;
  confidence: number;
  ageMinutes: number;
  strategy: string;
  pnl?: number;
  currentPrice?: number;
}

export interface KpiStat {
  label: string;
  value: string;
  delta: number;
  deltaLabel: string;
  spark: number[];
  tone: "positive" | "negative" | "neutral";
}

// ---------- Deterministic PRNG ----------
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20240924);

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function round(n: number, dp = 2) {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

function genSpark(base: number, points = 16, vol = 0.02): number[] {
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < points; i++) {
    v = v * (1 + (rng() - 0.5) * vol * 2);
    out.push(round(v, 2));
  }
  return out;
}

// ---------- Assets ----------
const ASSET_DEFS: { symbol: string; name: string; klass: AssetClass; price: number }[] = [
  { symbol: "NVDA", name: "NVIDIA Corporation", klass: "Stocks", price: 128.45 },
  { symbol: "AAPL", name: "Apple Inc.", klass: "Stocks", price: 224.30 },
  { symbol: "MSFT", name: "Microsoft Corporation", klass: "Stocks", price: 448.90 },
  { symbol: "TSLA", name: "Tesla, Inc.", klass: "Stocks", price: 254.80 },
  { symbol: "AMZN", name: "Amazon.com, Inc.", klass: "Stocks", price: 186.20 },
  { symbol: "GOOGL", name: "Alphabet Inc.", klass: "Stocks", price: 179.50 },
  { symbol: "META", name: "Meta Platforms Inc.", klass: "Stocks", price: 502.10 },
  { symbol: "AMD", name: "Advanced Micro Devices", klass: "Stocks", price: 156.40 },
  { symbol: "RELIANCE.NS", name: "Reliance Industries", klass: "Stocks", price: 2940.50 },
  { symbol: "TCS.NS", name: "Tata Consultancy Services", klass: "Stocks", price: 3820.00 },
  { symbol: "INFY.NS", name: "Infosys Limited", klass: "Stocks", price: 1540.25 },
  { symbol: "BTC-USD", name: "Bitcoin USD", klass: "Crypto", price: 64820.00 },
  { symbol: "GC=F", name: "Gold Futures", klass: "Commodities", price: 2368.50 },
  { symbol: "^GSPC", name: "S&P 500 Index", klass: "Indices", price: 5460.20 },
];

export const ASSETS: Asset[] = ASSET_DEFS.map((a) => {
  const change = round((rng() - 0.45) * 7, 2);
  return {
    ...a,
    change24h: change,
    volume24h: round(a.price * (50_000_000 + rng() * 950_000_000), 0),
    spark: genSpark(a.price, 20, Math.abs(change) / 100 + 0.008),
  };
});

// ---------- Strategies ----------
const STRATEGIES = [
  "News Vector Lead-Lag",
  "Centroid Shift Correlation",
  "Sentiment Momentum",
  "SEC 8-K Regulatory Filing",
  "NSE Sentiment Confluence",
  "Dense Vector Search Spike",
  "HistGradientBoosting ML",
  "Macro Sentiment Drift",
];

const STATUSES: SignalStatus[] = ["ACTIVE", "PENDING", "TP_HIT", "SL_HIT", "CLOSED"];

// ---------- Signals ----------
function makeSignal(i: number): Signal {
  const asset = ASSET_DEFS[i % ASSET_DEFS.length];
  const direction: Direction = rng() > 0.5 ? "LONG" : "SHORT";
  const entry = round(asset.price * (1 + (rng() - 0.5) * 0.01), asset.price > 1000 ? 2 : 4);
  const risk = entry * (0.008 + rng() * 0.02);
  const reward = risk * (1.5 + rng() * 2.5);
  const takeProfit = round(
    direction === "LONG" ? entry + reward : entry - reward,
    asset.price > 1000 ? 2 : 4
  );
  const stopLoss = round(
    direction === "LONG" ? entry - risk : entry + risk,
    asset.price > 1000 ? 2 : 4
  );
  const rr = round(reward / risk, 2);
  const status = i < 4 ? "ACTIVE" : i < 7 ? "PENDING" : pick(STATUSES);
  // Deterministic age in minutes (no Date.now() — avoids SSR/client hydration mismatch)
  const ageMinutes = 1 + Math.floor(rng() * 1560); // up to ~26h
  const confidence = round(62 + rng() * 36, 0);
  const pnl =
    status === "TP_HIT"
      ? round(reward * (0.5 + rng()), 2)
      : status === "SL_HIT"
        ? round(-risk * (0.5 + rng()), 2)
        : status === "CLOSED"
          ? round((rng() - 0.4) * reward, 2)
          : undefined;
  return {
    id: `SD-${(1000 + i).toString()}`,
    asset: asset.symbol,
    assetName: asset.name,
    klass: asset.klass,
    direction,
    status,
    entry,
    takeProfit,
    stopLoss,
    rr,
    confidence,
    ageMinutes,
    strategy: pick(STRATEGIES),
    pnl,
    currentPrice: round(entry * (1 + (rng() - 0.5) * 0.012), asset.price > 1000 ? 2 : 4),
  };
}

export const SIGNALS: Signal[] = Array.from({ length: 48 }, (_, i) => makeSignal(i)).sort(
  (a, b) => a.ageMinutes - b.ageMinutes
);

// ---------- KPIs ----------
export const KPIS: KpiStat[] = [
  {
    label: "Active Signals",
    value: SIGNALS.filter((s) => s.status === "ACTIVE").length.toString(),
    delta: 12.5,
    deltaLabel: "vs last week",
    spark: genSpark(12, 16, 0.08),
    tone: "positive",
  },
  {
    label: "Win Rate (30d)",
    value: "68.4%",
    delta: 4.2,
    deltaLabel: "vs prev 30d",
    spark: [58, 61, 60, 63, 62, 65, 64, 66, 67, 66, 68, 68.4],
    tone: "positive",
  },
  {
    label: "Realized P&L",
    value: "+$24,832",
    delta: 18.9,
    deltaLabel: "this month",
    spark: genSpark(8000, 16, 0.05).map((n) => n + 4000),
    tone: "positive",
  },
  {
    label: "Avg R:R",
    value: "2.34",
    delta: -3.1,
    deltaLabel: "vs last week",
    spark: [2.8, 2.6, 2.7, 2.5, 2.4, 2.6, 2.5, 2.4, 2.3, 2.34],
    tone: "negative",
  },
];

// ---------- Performance (monthly) ----------
export const MONTHLY_PERF = [
  { month: "Jan", pnl: 4200, win: 18, loss: 9 },
  { month: "Feb", pnl: -1800, win: 12, loss: 14 },
  { month: "Mar", pnl: 6100, win: 22, loss: 8 },
  { month: "Apr", pnl: 3400, win: 19, loss: 11 },
  { month: "May", pnl: 5250, win: 21, loss: 10 },
  { month: "Jun", pnl: -2100, win: 14, loss: 16 },
  { month: "Jul", pnl: 7820, win: 25, loss: 7 },
  { month: "Aug", pnl: 4150, win: 20, loss: 12 },
  { month: "Sep", pnl: 24832, win: 31, loss: 13 },
];

// ---------- Equity curve ----------
export function genEquityCurve(points = 60): { t: number; equity: number }[] {
  let eq = 100000;
  const out: { t: number; equity: number }[] = [];
  for (let i = 0; i < points; i++) {
    eq = eq * (1 + (rng() - 0.42) * 0.012);
    out.push({ t: i, equity: round(eq, 0) });
  }
  return out;
}

export const EQUITY_CURVE = genEquityCurve(60);

// ---------- BTC price series for main chart ----------
export function genPriceSeries(points = 90): { t: number; price: number }[] {
  let p = 62000;
  const out: { t: number; price: number }[] = [];
  for (let i = 0; i < points; i++) {
    p = p * (1 + (rng() - 0.48) * 0.015);
    out.push({ t: i, price: round(p, 2) });
  }
  // anchor end near current BTC price
  return out;
}

export const BTC_SERIES = genPriceSeries(90);

// Markers on the BTC chart (signal entries)
export const CHART_MARKERS = [
  { t: 18, type: "long", label: "SD-1042", price: 63120 },
  { t: 41, type: "short", label: "SD-1071", price: 66840 },
  { t: 58, type: "long", label: "SD-1088", price: 65110 },
  { t: 74, type: "long", label: "SD-1097", price: 66420 },
  { t: 85, type: "short", label: "SD-1103", price: 67980 },
];

// ---------- Market sentiment ----------
export const SENTIMENT = { fear: 22, neutral: 18, greed: 60 };

// ---------- Ticker tape ----------
export const TICKER = ASSETS.map((a) => ({
  symbol: a.symbol,
  price: a.price,
  change: a.change24h,
}));

// ---------- Helpers ----------
export function fmtPrice(n: number) {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

export function fmtCompact(n: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

// Deterministic, locale-free relative time formatter (SSR-safe).
// `ageMinutes` is a plain number stored on the signal, NOT derived from Date.now(),
// so server and client render identical strings.
export function fmtAgo(ageMinutes: number): string {
  if (ageMinutes < 1) return "just now";
  if (ageMinutes < 60) return `${ageMinutes}m ago`;
  const h = Math.floor(ageMinutes / 60);
  const m = ageMinutes % 60;
  if (h < 24) return m ? `${h}h ${m}m ago` : `${h}h ago`;
  const d = Math.floor(h / 24);
  const remH = h % 24;
  return remH ? `${d}d ${remH}h ago` : `${d}d ago`;
}

export function statusTone(status: SignalStatus): "positive" | "negative" | "neutral" | "warning" {
  switch (status) {
    case "TP_HIT":
      return "positive";
    case "SL_HIT":
      return "negative";
    case "ACTIVE":
      return "warning";
    case "PENDING":
      return "neutral";
    default:
      return "neutral";
  }
}

export function statusLabel(status: SignalStatus) {
  switch (status) {
    case "TP_HIT":
      return "Take Profit";
    case "SL_HIT":
      return "Stop Loss";
    case "ACTIVE":
      return "Active";
    case "PENDING":
      return "Pending";
    case "CLOSED":
      return "Closed";
  }
}
