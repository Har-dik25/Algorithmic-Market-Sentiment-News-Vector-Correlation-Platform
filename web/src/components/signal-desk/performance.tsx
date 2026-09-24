"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, Target, Percent } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EQUITY_CURVE, MONTHLY_PERF, SENTIMENT } from "@/lib/signal-data";
import { cn } from "@/lib/utils";

function EquityTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover/95 px-3 py-2 shadow-xl">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Day {d.t + 1}</p>
      <p className="tnum text-sm font-semibold mt-0.5">${d.equity.toLocaleString()}</p>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, tone }: any) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className={cn("tnum mt-1.5 text-lg font-semibold", tone)}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

export function PerformanceCard() {
  const [range, setRange] = React.useState("3M");
  const eqFirst = EQUITY_CURVE[0].equity;
  const eqLast = EQUITY_CURVE[EQUITY_CURVE.length - 1].equity;
  const ret = ((eqLast - eqFirst) / eqFirst) * 100;

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h3 className="text-sm font-semibold">Performance</h3>
          <p className="text-[11px] text-muted-foreground">Equity curve & monthly P&amp;L</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
          {["1M", "3M", "6M", "1Y"].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-2 py-1 text-xs font-medium rounded-md transition-colors",
                range === r ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
        <Stat icon={TrendingUp} label="Equity" value={`$${eqLast.toLocaleString()}`} sub={`+${ret.toFixed(1)}% all-time`} tone="text-success" />
        <Stat icon={Target} label="Profit Factor" value="2.18" sub="gross win / loss" tone="text-foreground" />
        <Stat icon={Percent} label="Expectancy" value="+0.42R" sub="per trade avg" tone="text-success" />
      </div>

      <div className="px-4 pb-2">
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={EQUITY_CURVE} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.66 0.13 230)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="oklch(0.66 0.13 230)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false} />
            <XAxis dataKey="t" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval={Math.floor(EQUITY_CURVE.length / 6)} />
            <YAxis
              orientation="right"
              tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              domain={["dataMin", "dataMax"]}
            />
            <Tooltip content={<EquityTooltip />} cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 4" }} />
            <Area type="monotone" dataKey="equity" stroke="oklch(0.66 0.13 230)" strokeWidth={2} fill="url(#eqFill)" animationDuration={900} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="border-t border-border p-4">
        <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          Monthly realized P&amp;L
        </p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={MONTHLY_PERF} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={36} tickFormatter={(v) => `${v / 1000}k`} />
            <Tooltip
              cursor={{ fill: "var(--accent)", opacity: 0.3 }}
              content={({ active, payload }: any) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="rounded-lg border border-border bg-popover/95 px-3 py-2 shadow-xl">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.month}</p>
                    <p className={cn("tnum text-sm font-semibold mt-0.5", d.pnl >= 0 ? "text-success" : "text-danger")}>
                      {d.pnl >= 0 ? "+" : ""}${d.pnl.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {d.win}W / {d.loss}L
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="pnl" radius={[3, 3, 0, 0]} maxBarSize={26}>
              {MONTHLY_PERF.map((m, i) => (
                <Cell key={i} fill={m.pnl >= 0 ? "oklch(0.7 0.16 158)" : "oklch(0.68 0.2 22)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function SentimentGauge() {
  const { fear, neutral, greed } = SENTIMENT;
  // Greed index 0-100 from sentiment weights
  const greedIndex = Math.round((greed * 100) / (fear + neutral + greed));
  const total = fear + neutral + greed;

  // gauge arc: 180deg semicircle
  const angle = (greedIndex / 100) * 180;
  const needleX = 50 + 42 * Math.cos((180 - angle) * (Math.PI / 180));
  const needleY = 50 - 42 * Math.sin((180 - angle) * (Math.PI / 180));

  const label =
    greedIndex > 74 ? "Extreme Greed" : greedIndex > 54 ? "Greed" : greedIndex > 44 ? "Neutral" : greedIndex > 24 ? "Fear" : "Extreme Fear";

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Market Sentiment</h3>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">FG Index</span>
      </div>

      <div className="mt-3 flex justify-center">
        <svg viewBox="0 0 100 60" className="w-full max-w-[220px]">
          <defs>
            <linearGradient id="gauge" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="oklch(0.68 0.2 22)" />
              <stop offset="50%" stopColor="oklch(0.8 0.16 75)" />
              <stop offset="100%" stopColor="oklch(0.7 0.16 158)" />
            </linearGradient>
          </defs>
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="url(#gauge)" strokeWidth="7" strokeLinecap="round" />
          <line x1={needleX} y1={needleY} x2="50" y2="50" stroke="var(--foreground)" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="50" cy="50" r="2.5" fill="var(--foreground)" />
          <text x="10" y="58" fontSize="5" fill="var(--muted-foreground)">Fear</text>
          <text x="78" y="58" fontSize="5" fill="var(--muted-foreground)">Greed</text>
        </svg>
      </div>

      <div className="-mt-2 text-center">
        <p className="tnum text-2xl font-semibold">{greedIndex}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>

      <div className="mt-3 space-y-1.5">
        {[
          { label: "Greed", value: greed, color: "bg-success" },
          { label: "Neutral", value: neutral, color: "bg-warning" },
          { label: "Fear", value: fear, color: "bg-danger" },
        ].map((r) => (
          <div key={r.label} className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", r.color)} />
            <span className="text-[11px] text-muted-foreground flex-1">{r.label}</span>
            <span className="tnum text-[11px] font-medium">{Math.round((r.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
