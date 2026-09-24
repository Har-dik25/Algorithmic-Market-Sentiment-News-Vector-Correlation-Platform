"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  ComposedChart,
} from "recharts";
import { TrendingUp, TrendingDown, Maximize2, Activity, Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ASSETS } from "@/lib/signal-data";
import { cn } from "@/lib/utils";

// Generate deterministic price+sentiment series for each ticker
function genSeries(symbol: string, basePrice: number): { t: number; price: number; sentiment: number }[] {
  // Use symbol hash as seed for deterministic results
  let seed = 0;
  for (let i = 0; i < symbol.length; i++) seed = seed * 31 + symbol.charCodeAt(i);
  const rng = () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return Array.from({ length: 60 }, (_, i) => {
    const trend = (rng() - 0.48) * 0.008;
    const noise = Math.sin(i / (3 + rng() * 2)) * basePrice * 0.03;
    const price = Number((basePrice * (1 + trend * i) + noise).toFixed(2));
    const sentiment = Number((((rng() - 0.5) * 0.8) + Math.sin(i / 4) * 0.3).toFixed(2));
    return { t: i, price, sentiment: Math.max(-1, Math.min(1, sentiment)) };
  });
}

// Build series map for all tickers
const ALL_TICKER_SERIES: Record<string, {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  pct: number;
  series: { t: number; price: number; sentiment: number }[];
}> = {};

ASSETS.forEach((a) => {
  ALL_TICKER_SERIES[a.symbol] = {
    symbol: a.symbol,
    name: `${a.name} (${a.sector})`,
    sector: a.sector,
    price: a.price,
    change: a.change24h > 0 ? Number((a.price * a.change24h / 100).toFixed(2)) : Number((a.price * a.change24h / 100).toFixed(2)),
    pct: a.change24h,
    series: genSeries(a.symbol, a.price),
  };
});

const TIMEFRAMES = ["1D", "1W", "1M", "3M", "1Y"] as const;

interface MainChartProps {
  selectedTicker?: string;
  onTickerChange?: (ticker: string) => void;
}

export function MainChart({ selectedTicker, onTickerChange }: MainChartProps) {
  const [localTicker, setLocalTicker] = React.useState("NVDA");
  const [tf, setTf] = React.useState<(typeof TIMEFRAMES)[number]>("3M");

  const ticker = selectedTicker ?? localTicker;
  const setTicker = onTickerChange ?? setLocalTicker;

  const item = ALL_TICKER_SERIES[ticker] || ALL_TICKER_SERIES["NVDA"];
  const up = item.pct >= 0;
  const series = item.series;

  // Compute sentiment range for right Y-axis
  const minSent = Math.min(...series.map((d) => d.sentiment));
  const maxSent = Math.max(...series.map((d) => d.sentiment));

  return (
    <Card className="overflow-hidden p-0">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary font-bold text-sm">
              {item.symbol.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <select
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  className="bg-transparent text-base font-bold tracking-tight text-foreground focus:outline-none cursor-pointer"
                >
                  {Object.keys(ALL_TICKER_SERIES).map((sym) => (
                    <option key={sym} value={sym} className="bg-popover text-foreground">
                      {sym} — {ALL_TICKER_SERIES[sym].name}
                    </option>
                  ))}
                </select>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  OHLCV + Vector Overlay
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{item.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Expand">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className="tnum text-3xl font-semibold tracking-tight">
              {item.price >= 1000 ? `$${item.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : `$${item.price.toFixed(2)}`}
            </span>
            <span
              className={cn(
                "tnum flex items-center gap-1 text-sm font-medium",
                up ? "text-success" : "text-danger"
              )}
            >
              {up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {up ? "+" : ""}
              {item.change.toFixed(2)} ({item.pct.toFixed(2)}%)
            </span>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
            {TIMEFRAMES.map((t) => (
              <button
                key={t}
                onClick={() => setTf(t)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                  tf === t
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dual-Axis Chart */}
      <div className="p-4 sm:p-5">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 10, right: 50, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.7 0.16 158)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="oklch(0.7 0.16 158)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false} />
              <XAxis dataKey="t" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
              {/* Left Y-Axis: Price */}
              <YAxis
                yAxisId="price"
                orientation="left"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                domain={["dataMin - 5", "dataMax + 5"]}
                tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`}
              />
              {/* Right Y-Axis: Sentiment */}
              <YAxis
                yAxisId="sentiment"
                orientation="right"
                tick={{ fontSize: 10, fill: "oklch(0.66 0.13 230)" }}
                tickLine={false}
                axisLine={false}
                domain={[-1, 1]}
                tickFormatter={(v) => v.toFixed(1)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-border bg-popover/95 p-3 shadow-xl backdrop-blur text-xs">
                      <p className="text-[10px] text-muted-foreground font-mono">Day #{d.t + 1}</p>
                      <p className="tnum font-bold text-foreground mt-0.5">
                        Price: ${d.price >= 1000 ? d.price.toLocaleString() : d.price}
                      </p>
                      <p className="tnum font-semibold text-chart-4 mt-0.5">
                        News Vector Signal: {d.sentiment > 0 ? `+${d.sentiment}` : d.sentiment}
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                yAxisId="price"
                type="monotone"
                dataKey="price"
                stroke="oklch(0.7 0.16 158)"
                strokeWidth={2.2}
                fill="url(#priceFill)"
              />
              <Line
                yAxisId="sentiment"
                type="monotone"
                dataKey="sentiment"
                stroke="oklch(0.66 0.13 230)"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 2"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-2 w-2 rounded-full bg-success" /> Stock Close Price ($)
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-2 w-4 rounded-full bg-chart-4" style={{ background: "oklch(0.66 0.13 230)" }} /> Daily News Vector Signal (−1.0 to +1.0)
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono text-primary">
            <Activity className="h-3 w-3" />
            <span>Dual-Axis Overlay · Zoom & Pan</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
