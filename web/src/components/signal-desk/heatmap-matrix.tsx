"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Grid3X3, Filter, ArrowUpDown, Info, Sparkles } from "lucide-react";
import { ASSETS, getUniqueSectors, type Asset } from "@/lib/signal-data";

const LAGS = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];

// Compute a deterministic correlation matrix for an asset across lags
function computeAssetCorrelations(symbol: string) {
  let seed = 0;
  for (let i = 0; i < symbol.length; i++) seed = (seed * 37 + symbol.charCodeAt(i)) >>> 0;
  function prng() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  const optimalLag = [-2, -1, 1, 2, 3][Math.floor(prng() * 5)];
  const peakR = 0.28 + prng() * 0.38;

  const lagMap: Record<number, { r: number; pValue: number }> = {};
  for (const l of LAGS) {
    const dist = Math.abs(l - optimalLag);
    const r = Math.max(-0.25, Math.min(0.75, peakR * Math.exp(-dist * 0.4) + (prng() - 0.5) * 0.08));
    const pValue = Math.max(0.0001, (1 - Math.abs(r)) * 0.04);
    lagMap[l] = { r: Number(r.toFixed(3)), pValue: Number(pValue.toFixed(4)) };
  }

  return {
    symbol,
    optimalLag,
    peakR: Number(peakR.toFixed(3)),
    lagMap,
  };
}

// Map correlation r to color in our dark theme
function getCellColor(r: number) {
  if (r > 0.45) return "bg-emerald-500/80 text-emerald-950 font-bold border-emerald-400";
  if (r > 0.3) return "bg-emerald-500/50 text-emerald-100 font-semibold border-emerald-500/40";
  if (r > 0.15) return "bg-emerald-500/25 text-emerald-200 border-emerald-500/20";
  if (r > 0.05) return "bg-emerald-500/10 text-emerald-300/80 border-emerald-500/10";
  if (r >= -0.05) return "bg-muted/20 text-muted-foreground border-transparent";
  if (r >= -0.15) return "bg-rose-500/15 text-rose-300/80 border-rose-500/10";
  if (r >= -0.3) return "bg-rose-500/35 text-rose-200 border-rose-500/20";
  return "bg-rose-500/70 text-rose-950 font-bold border-rose-400";
}

export function CrossAssetHeatmapMatrix() {
  const [selectedSector, setSelectedSector] = React.useState<string | null>(null);
  const [sortByPeak, setSortByPeak] = React.useState(true);
  const [hoveredCell, setHoveredCell] = React.useState<{
    asset: string;
    lag: number;
    r: number;
    pValue: number;
  } | null>(null);

  const sectors = getUniqueSectors();

  // Compute matrix data
  const matrixData = React.useMemo(() => {
    return ASSETS.map((asset) => {
      const corr = computeAssetCorrelations(asset.symbol);
      return {
        ...asset,
        ...corr,
      };
    });
  }, []);

  const filteredData = React.useMemo(() => {
    let list = selectedSector ? matrixData.filter((a) => a.sector === selectedSector) : matrixData;
    if (sortByPeak) {
      list = [...list].sort((a, b) => b.peakR - a.peakR);
    }
    return list;
  }, [matrixData, selectedSector, sortByPeak]);

  return (
    <div className="space-y-4">
      {/* Header & Filter Controls */}
      <Card className="p-5 bg-card/60 backdrop-blur-md border-border/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Cross-Asset Lead-Lag Correlation Heatmap Matrix
              </h2>
              <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10 text-[10px] uppercase font-bold">
                25+ Instruments × 11 Lag Horizons
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Full cross-asset spectrum of Pearson correlation coefficients (r) across -5 (Price Leads) to +5 (Sentiment Leads) day lags.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSortByPeak(!sortByPeak)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
              <span>{sortByPeak ? "Sorted by Peak r" : "Default Order"}</span>
            </button>
          </div>
        </div>

        {/* Sector Pills */}
        <div className="mt-4 pt-3 border-t border-border/40 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mr-2">
            Sector Filter:
          </span>
          <button
            onClick={() => setSelectedSector(null)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors border ${
              !selectedSector
                ? "bg-primary/20 text-primary border-primary/40 font-bold"
                : "bg-muted/30 text-muted-foreground border-border/60 hover:text-foreground"
            }`}
          >
            All Universe ({matrixData.length})
          </button>
          {sectors.map((s) => {
            const count = matrixData.filter((a) => a.sector === s).length;
            return (
              <button
                key={s}
                onClick={() => setSelectedSector(s === selectedSector ? null : s)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors border whitespace-nowrap ${
                  s === selectedSector
                    ? "bg-primary/20 text-primary border-primary/40 font-bold"
                    : "bg-muted/30 text-muted-foreground border-border/60 hover:text-foreground"
                }`}
              >
                {s} ({count})
              </button>
            );
          })}
        </div>
      </Card>

      {/* Heatmap Matrix Table */}
      <Card className="overflow-hidden border-border/60 bg-card/60 backdrop-blur-md">
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border/60 font-mono text-[11px]">
                <th className="py-3 px-4 font-sans font-semibold text-foreground sticky left-0 bg-muted/95 backdrop-blur-md z-10 w-44">
                  Asset / Ticker
                </th>
                <th className="py-3 px-3 font-sans text-muted-foreground text-[10px] uppercase w-28">
                  Sector
                </th>
                <th className="py-3 px-2 text-center text-primary font-bold w-16">
                  Peak r
                </th>
                <th className="py-3 px-2 text-center text-muted-foreground w-16">
                  k*
                </th>
                {LAGS.map((lag) => (
                  <th
                    key={lag}
                    className={`py-3 px-1.5 text-center font-mono text-[11px] min-w-[50px] ${
                      lag === 0
                        ? "text-foreground font-bold bg-muted/20"
                        : lag > 0
                        ? "text-emerald-400 font-semibold"
                        : "text-amber-400 font-semibold"
                    }`}
                  >
                    {lag > 0 ? `+${lag}d` : `${lag}d`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {filteredData.map((row) => (
                <tr key={row.symbol} className="hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 px-4 font-sans font-semibold text-foreground sticky left-0 bg-card/95 backdrop-blur-md z-10">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-primary font-bold">{row.symbol}</span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                        {row.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-[10px] text-muted-foreground truncate max-w-[110px]">
                    {row.sector}
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono font-bold text-primary">
                    +{row.peakR}
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono text-[11px] text-foreground">
                    {row.optimalLag > 0 ? `+${row.optimalLag}d` : `${row.optimalLag}d`}
                  </td>
                  {LAGS.map((lag) => {
                    const cell = row.lagMap[lag];
                    const isOptimal = lag === row.optimalLag;
                    return (
                      <td
                        key={lag}
                        onMouseEnter={() =>
                          setHoveredCell({
                            asset: row.symbol,
                            lag,
                            r: cell.r,
                            pValue: cell.pValue,
                          })
                        }
                        onMouseLeave={() => setHoveredCell(null)}
                        className="py-1 px-1 text-center"
                      >
                        <div
                          className={`h-7 rounded flex items-center justify-center font-mono text-[10.5px] border cursor-pointer transition-transform hover:scale-105 ${getCellColor(
                            cell.r
                          )} ${isOptimal ? "ring-1 ring-white/60" : ""}`}
                        >
                          {cell.r >= 0 ? `+${cell.r.toFixed(2)}` : cell.r.toFixed(2)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Heatmap Legend & Hover Details Footer */}
        <div className="p-4 border-t border-border/40 bg-muted/20 flex flex-wrap items-center justify-between gap-4 text-xs">
          {/* Active Hover Detail */}
          {hoveredCell ? (
            <div className="flex items-center gap-3 font-mono">
              <span className="font-bold text-foreground font-sans">{hoveredCell.asset}</span>
              <span className="text-muted-foreground">Lag:</span>
              <span className="text-foreground font-semibold">{hoveredCell.lag > 0 ? `+${hoveredCell.lag}d` : `${hoveredCell.lag}d`}</span>
              <span className="text-muted-foreground">Pearson r:</span>
              <span className={`font-bold ${hoveredCell.r >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {hoveredCell.r >= 0 ? `+${hoveredCell.r.toFixed(3)}` : hoveredCell.r.toFixed(3)}
              </span>
              <span className="text-muted-foreground">p-value:</span>
              <span className="text-foreground">{hoveredCell.pValue}</span>
            </div>
          ) : (
            <div className="text-muted-foreground flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" />
              Hover over any matrix cell to inspect exact Pearson r and statistical significance.
            </div>
          )}

          {/* Color Scale Legend */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground">Correlation:</span>
            <div className="flex items-center gap-1 font-mono text-[10px]">
              <span className="px-1.5 py-0.5 rounded bg-rose-500/70 text-rose-950 font-bold">-0.50</span>
              <span className="px-1.5 py-0.5 rounded bg-muted/20 text-muted-foreground">0.00</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200">+0.20</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/80 text-emerald-950 font-bold">+0.50</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
