"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, TrendingDown, Maximize2, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BTC_SERIES, CHART_MARKERS, fmtPrice } from "@/lib/signal-data";
import { cn } from "@/lib/utils";

const TIMEFRAMES = ["15m", "1H", "4H", "1D", "1W"] as const;

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover/95 px-3 py-2 shadow-xl backdrop-blur">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        Candle #{d.t + 1}
      </p>
      <p className="tnum text-sm font-semibold mt-0.5">${fmtPrice(d.price)}</p>
    </div>
  );
}

export function MainChart() {
  const [tf, setTf] = React.useState<(typeof TIMEFRAMES)[number]>("1H");
  const [starred, setStarred] = React.useState(false);

  const first = BTC_SERIES[0].price;
  const last = BTC_SERIES[BTC_SERIES.length - 1].price;
  const change = last - first;
  const changePct = (change / first) * 100;
  const up = change >= 0;

  const minP = Math.min(...BTC_SERIES.map((d) => d.price));
  const maxP = Math.max(...BTC_SERIES.map((d) => d.price));
  const pad = (maxP - minP) * 0.08;

  return (
    <Card className="overflow-hidden p-0">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-warning/30 to-warning/10 text-sm font-bold ring-1 ring-warning/30">
              ₿
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold tracking-tight">BTC / USDT</h3>
                <Badge variant="secondary" className="text-[10px] font-normal">
                  Spot
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Bitcoin · Binance</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setStarred((s) => !s)}
              aria-label="Star"
            >
              <Star
                className={cn("h-4 w-4", starred && "fill-warning text-warning")}
              />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Expand">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className="tnum text-3xl font-semibold tracking-tight">
              ${fmtPrice(last)}
            </span>
            <span
              className={cn(
                "tnum flex items-center gap-1 text-sm font-medium",
                up ? "text-success" : "text-danger"
              )}
            >
              {up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {up ? "+" : ""}
              {fmtPrice(change)} ({changePct.toFixed(2)}%)
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

      {/* Chart */}
      <div className="relative px-1 pb-3 pt-2">
        <div className="absolute inset-0 bg-dotgrid opacity-[0.35] pointer-events-none" />
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={BTC_SERIES} margin={{ top: 10, right: 16, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="btcFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.72 0.16 162)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="oklch(0.72 0.16 162)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false} />
            <XAxis
              dataKey="t"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}`}
              interval={Math.floor(BTC_SERIES.length / 8)}
            />
            <YAxis
              orientation="right"
              domain={[minP - pad, maxP + pad]}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="oklch(0.72 0.16 162)"
              strokeWidth={2}
              fill="url(#btcFill)"
              animationDuration={900}
            />
            {CHART_MARKERS.map((m) => (
              <ReferenceDot
                key={m.label}
                x={m.t}
                y={m.price}
                r={5}
                fill={m.type === "long" ? "oklch(0.7 0.16 158)" : "oklch(0.68 0.2 22)"}
                stroke="var(--background)"
                strokeWidth={2}
                ifOverflow="extendDomain"
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border px-4 sm:px-5 py-3">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full bg-success" />
          LONG entry
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full bg-danger" />
          SHORT entry
        </div>
        <div className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>
            24h Vol <span className="tnum text-foreground">$28.4B</span>
          </span>
          <span>
            24h High <span className="tnum text-foreground">${fmtPrice(maxP)}</span>
          </span>
          <span>
            24h Low <span className="tnum text-foreground">${fmtPrice(minP)}</span>
          </span>
        </div>
      </div>
    </Card>
  );
}
