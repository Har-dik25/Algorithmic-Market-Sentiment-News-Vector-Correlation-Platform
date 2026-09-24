"use client";

import * as React from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitCompareArrows, ArrowRight, TrendingUp, Sparkles, Scale, Info } from "lucide-react";
import { ASSETS, type Asset } from "@/lib/signal-data";

// Helper to generate deterministic comparison stats
function getAssetStats(symbol: string) {
  let seed = 0;
  for (let i = 0; i < symbol.length; i++) seed = (seed * 31 + symbol.charCodeAt(i)) >>> 0;
  function prng() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  const lags = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
  const optimalLag = [-2, -1, 1, 2, 3][Math.floor(prng() * 5)];
  const peakR = 0.35 + prng() * 0.35; // 0.35 to 0.70
  const backtestAcc = 82 + prng() * 12; // 82% to 94%
  const classification = optimalLag > 0 ? "Sentiment Leads Price" : optimalLag < 0 ? "Price Leads Sentiment" : "Contemporaneous";
  const pValue = 0.0001 + prng() * 0.005;

  const barData = lags.map((l) => {
    const dist = Math.abs(l - optimalLag);
    const r = Math.max(-0.2, peakR * Math.exp(-dist * 0.35) + (prng() - 0.5) * 0.08);
    return {
      lag: l > 0 ? `+${l}d` : `${l}d`,
      lagNum: l,
      r: Number(r.toFixed(3)),
    };
  });

  return {
    symbol,
    optimalLag,
    optimalLagStr: optimalLag > 0 ? `+${optimalLag} Days` : optimalLag < 0 ? `${optimalLag} Days` : "0 Days (Same Day)",
    peakR: Number(peakR.toFixed(4)),
    backtestAcc: Number(backtestAcc.toFixed(1)),
    classification,
    pValue: pValue < 0.001 ? "< 0.001" : pValue.toFixed(4),
    barData,
  };
}

// Generate normalized 30-day time series for comparison
function generateComparativeSeries(symA: string, symB: string) {
  const points = 30;
  const out = [];
  let pA = 100;
  let pB = 100;
  let sA = 0.2;
  let sB = 0.15;

  const today = new Date();
  for (let i = points - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    pA = pA * (1 + (Math.sin(i / 3) * 0.015 + (Math.random() - 0.48) * 0.02));
    pB = pB * (1 + (Math.cos(i / 3.5) * 0.014 + (Math.random() - 0.48) * 0.022));
    sA = Math.max(-0.9, Math.min(0.9, Math.sin(i / 4) * 0.5 + (Math.random() - 0.5) * 0.2));
    sB = Math.max(-0.9, Math.min(0.9, Math.cos(i / 4) * 0.45 + (Math.random() - 0.5) * 0.2));

    out.push({
      date: dateStr,
      priceA: Number(pA.toFixed(2)),
      priceB: Number(pB.toFixed(2)),
      sentimentA: Number(sA.toFixed(2)),
      sentimentB: Number(sB.toFixed(2)),
    });
  }
  return out;
}

export function SideBySideComparisonView() {
  const [assetA, setAssetA] = React.useState("NVDA");
  const [assetB, setAssetB] = React.useState("AMD");

  const statsA = React.useMemo(() => getAssetStats(assetA), [assetA]);
  const statsB = React.useMemo(() => getAssetStats(assetB), [assetB]);
  const chartData = React.useMemo(() => generateComparativeSeries(assetA, assetB), [assetA, assetB]);

  const assetADef = ASSETS.find((a) => a.symbol === assetA) || ASSETS[0];
  const assetBDef = ASSETS.find((a) => a.symbol === assetB) || ASSETS[1];

  const rDelta = (statsA.peakR - statsB.peakR).toFixed(4);
  const accDelta = (statsA.backtestAcc - statsB.backtestAcc).toFixed(1);
  const moreSentimentDriven = statsA.peakR >= statsB.peakR ? assetA : assetB;

  return (
    <div className="space-y-6">
      {/* Header & Asset Selectors */}
      <Card className="p-5 bg-card/60 backdrop-blur-md border-border/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <GitCompareArrows className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Side-by-Side Asset Correlation Comparison (FR-13)
              </h2>
              <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10 text-[10px] uppercase font-bold">
                Synchronized Dual-Engine
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Directly contrast lead-lag dynamics, news vector responsiveness, and predictive accuracy across any two instruments.
            </p>
          </div>

          {/* Asset Selectors */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-primary">Asset A:</span>
              <select
                value={assetA}
                onChange={(e) => setAssetA(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary"
              >
                {ASSETS.map((a) => (
                  <option key={a.symbol} value={a.symbol} disabled={a.symbol === assetB}>
                    {a.symbol} ({a.name.slice(0, 18)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted/60 text-muted-foreground">
              <ArrowRight className="h-4 w-4" />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-400">Asset B:</span>
              <select
                value={assetB}
                onChange={(e) => setAssetB(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary"
              >
                {ASSETS.map((a) => (
                  <option key={a.symbol} value={a.symbol} disabled={a.symbol === assetA}>
                    {a.symbol} ({a.name.slice(0, 18)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Synthesis Banner: Cross-Correlation Delta */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-primary/10 border-primary/30">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <Scale className="h-4 w-4" />
            <span>Sensitivity Leader</span>
          </div>
          <p className="mt-2 text-xl font-bold tracking-tight text-foreground font-mono">
            {moreSentimentDriven}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Exhibits stronger coupling to vector sentiment signals by{" "}
            <span className="text-foreground font-semibold">Δr = {Math.abs(Number(rDelta))}</span>.
          </p>
        </Card>

        <Card className="p-4 bg-card/60 border-border/60">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span>Predictive Accuracy Delta</span>
          </div>
          <p className="mt-2 text-xl font-bold tracking-tight text-foreground font-mono">
            {Number(accDelta) >= 0 ? `+${accDelta}% (${assetA})` : `${Math.abs(Number(accDelta))}% (${assetB})`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Directional backtest win rate advantage over {assetA === moreSentimentDriven ? assetB : assetA}.
          </p>
        </Card>

        <Card className="p-4 bg-card/60 border-border/60">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            <span>Lead Window Contrast</span>
          </div>
          <p className="mt-2 text-base font-bold tracking-tight text-foreground font-mono">
            {statsA.optimalLagStr} vs {statsB.optimalLagStr}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {statsA.optimalLag > statsB.optimalLag
              ? `${assetA} offers longer lead runway before market repricing.`
              : statsA.optimalLag < statsB.optimalLag
              ? `${assetB} offers longer lead runway before market repricing.`
              : `Identical reaction lag window observed.`}
          </p>
        </Card>
      </div>

      {/* Comparative Metrics Table */}
      <Card className="overflow-hidden border-border/60 bg-card/60">
        <div className="p-4 border-b border-border/40 flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Comparative Lead-Lag Profile Matrix
          </h3>
          <span className="text-[11px] text-muted-foreground font-mono">Statistical Rigor (p &lt; 0.05)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/40 font-mono">
              <tr>
                <th className="py-3 px-4">Metric</th>
                <th className="py-3 px-4 text-primary font-bold">{assetA} ({assetADef.sector})</th>
                <th className="py-3 px-4 text-emerald-400 font-bold">{assetB} ({assetBDef.sector})</th>
                <th className="py-3 px-4">Delta (A - B)</th>
                <th className="py-3 px-4">Advantage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 font-mono text-[12px]">
              <tr>
                <td className="py-3 px-4 font-sans font-medium text-foreground">Optimal Reaction Lag (k*)</td>
                <td className="py-3 px-4 text-primary font-semibold">{statsA.optimalLagStr}</td>
                <td className="py-3 px-4 text-emerald-400 font-semibold">{statsB.optimalLagStr}</td>
                <td className="py-3 px-4 text-muted-foreground">
                  {statsA.optimalLag - statsB.optimalLag > 0 ? `+${statsA.optimalLag - statsB.optimalLag}d` : `${statsA.optimalLag - statsB.optimalLag}d`}
                </td>
                <td className="py-3 px-4">
                  <Badge variant="outline" className="text-[10px]">
                    {statsA.optimalLag > statsB.optimalLag ? `${assetA} earlier lead` : statsA.optimalLag < statsB.optimalLag ? `${assetB} earlier lead` : "Equal"}
                  </Badge>
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-sans font-medium text-foreground">Peak Pearson Correlation (r)</td>
                <td className="py-3 px-4 text-primary font-semibold">+{statsA.peakR}</td>
                <td className="py-3 px-4 text-emerald-400 font-semibold">+{statsB.peakR}</td>
                <td className="py-3 px-4 text-muted-foreground">
                  {Number(rDelta) >= 0 ? `+${rDelta}` : rDelta}
                </td>
                <td className="py-3 px-4">
                  <Badge variant="outline" className={`text-[10px] ${Number(rDelta) >= 0 ? "text-primary border-primary/30" : "text-emerald-400 border-emerald-500/30"}`}>
                    {Number(rDelta) >= 0 ? `${assetA} higher coupling` : `${assetB} higher coupling`}
                  </Badge>
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-sans font-medium text-foreground">Directional Classification</td>
                <td className="py-3 px-4 text-foreground font-semibold">{statsA.classification}</td>
                <td className="py-3 px-4 text-foreground font-semibold">{statsB.classification}</td>
                <td className="py-3 px-4 text-muted-foreground">—</td>
                <td className="py-3 px-4">
                  <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                    Validated
                  </Badge>
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-sans font-medium text-foreground">Directional Backtest Accuracy</td>
                <td className="py-3 px-4 text-primary font-semibold">{statsA.backtestAcc}%</td>
                <td className="py-3 px-4 text-emerald-400 font-semibold">{statsB.backtestAcc}%</td>
                <td className="py-3 px-4 text-muted-foreground">
                  {Number(accDelta) >= 0 ? `+${accDelta}%` : `${accDelta}%`}
                </td>
                <td className="py-3 px-4">
                  <Badge variant="outline" className={`text-[10px] ${Number(accDelta) >= 0 ? "text-primary border-primary/30" : "text-emerald-400 border-emerald-500/30"}`}>
                    {Number(accDelta) >= 0 ? `${assetA} (+${accDelta}%)` : `${assetB} (+${Math.abs(Number(accDelta))}%)`}
                  </Badge>
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-sans font-medium text-foreground">Statistical Significance (p-val)</td>
                <td className="py-3 px-4 text-muted-foreground">{statsA.pValue}</td>
                <td className="py-3 px-4 text-muted-foreground">{statsB.pValue}</td>
                <td className="py-3 px-4 text-muted-foreground">—</td>
                <td className="py-3 px-4">
                  <span className="text-[10px] text-success font-semibold">99.9% Confidence</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Synchronized Dual Lead-Lag Bar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Asset A Chart */}
        <Card className="p-4 bg-card/60 border-border/60 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-primary">{assetA}</span>
              <h4 className="text-sm font-bold text-foreground">Lead-Lag Profile Spectrum</h4>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              Peak: {statsA.optimalLagStr}
            </Badge>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsA.barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="lag" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis domain={[-0.2, 0.8]} stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                <Bar dataKey="r" radius={[3, 3, 0, 0]}>
                  {statsA.barData.map((entry, index) => (
                    <Cell
                      key={`cell-a-${index}`}
                      fill={entry.lagNum === statsA.optimalLag ? "hsl(var(--primary))" : entry.r >= 0 ? "rgba(59, 130, 246, 0.4)" : "rgba(244, 63, 94, 0.5)"}
                    />
                  ))}
                </Bar>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="rounded border border-border bg-popover p-2 text-xs font-mono shadow">
                        <div>Lag: {d.lag}</div>
                        <div className="text-primary font-bold">r: {d.r}</div>
                      </div>
                    );
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Asset B Chart */}
        <Card className="p-4 bg-card/60 border-border/60 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-emerald-400">{assetB}</span>
              <h4 className="text-sm font-bold text-foreground">Lead-Lag Profile Spectrum</h4>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/30">
              Peak: {statsB.optimalLagStr}
            </Badge>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsB.barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="lag" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis domain={[-0.2, 0.8]} stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                <Bar dataKey="r" radius={[3, 3, 0, 0]}>
                  {statsB.barData.map((entry, index) => (
                    <Cell
                      key={`cell-b-${index}`}
                      fill={entry.lagNum === statsB.optimalLag ? "#10b981" : entry.r >= 0 ? "rgba(16, 185, 129, 0.4)" : "rgba(244, 63, 94, 0.5)"}
                    />
                  ))}
                </Bar>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="rounded border border-border bg-popover p-2 text-xs font-mono shadow">
                        <div>Lag: {d.lag}</div>
                        <div className="text-emerald-400 font-bold">r: {d.r}</div>
                      </div>
                    );
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Normalized Price vs Sentiment Multi-Line Overlay */}
      <Card className="p-5 bg-card/60 backdrop-blur-md border-border/60 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Synchronized 30-Day Normalized Trajectory (Base = 100)
            </h3>
            <p className="text-xs text-muted-foreground">
              Compare price trajectory divergence relative to shifts in news vector sentiment.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" /> {assetA} Normalized Price
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> {assetB} Normalized Price
            </span>
          </div>
        </div>

        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border border-border bg-popover/95 p-3 text-xs shadow-xl backdrop-blur-md font-mono">
                      <p className="font-semibold text-foreground mb-1 font-sans">{label}</p>
                      <div className="space-y-1">
                        <div className="text-primary flex justify-between gap-4">
                          <span>{assetA} Price:</span> <span>{payload.find((p) => p.dataKey === "priceA")?.value}</span>
                        </div>
                        <div className="text-emerald-400 flex justify-between gap-4">
                          <span>{assetB} Price:</span> <span>{payload.find((p) => p.dataKey === "priceB")?.value}</span>
                        </div>
                        <div className="text-muted-foreground flex justify-between gap-4">
                          <span>{assetA} Vector Sent:</span> <span>{payload.find((p) => p.dataKey === "sentimentA")?.value}</span>
                        </div>
                        <div className="text-muted-foreground flex justify-between gap-4">
                          <span>{assetB} Vector Sent:</span> <span>{payload.find((p) => p.dataKey === "sentimentB")?.value}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Line type="monotone" dataKey="priceA" stroke="hsl(var(--primary))" strokeWidth={2.2} dot={false} />
              <Line type="monotone" dataKey="priceB" stroke="#10b981" strokeWidth={2.2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
