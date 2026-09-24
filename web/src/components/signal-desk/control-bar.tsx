"use client";

import * as React from "react";
import { Zap, Calendar, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ASSETS, getUniqueSectors, DATE_RANGES, type DateRange } from "@/lib/signal-data";
import { cn } from "@/lib/utils";

interface ControlBarProps {
  selectedTicker: string;
  onTickerChange: (ticker: string) => void;
  selectedSector: string | null;
  onSectorChange: (sector: string | null) => void;
  lagWindow: [number, number];
  onLagChange: (lag: [number, number]) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onRecalculate: () => void;
  isRecalculating?: boolean;
}

export function ControlBar({
  selectedTicker,
  onTickerChange,
  selectedSector,
  onSectorChange,
  lagWindow,
  onLagChange,
  dateRange,
  onDateRangeChange,
  onRecalculate,
  isRecalculating = false,
}: ControlBarProps) {
  const sectors = getUniqueSectors();
  const filteredAssets = selectedSector
    ? ASSETS.filter((a) => a.sector === selectedSector)
    : ASSETS;

  const lagValue = lagWindow[1]; // symmetric: [-lagValue, +lagValue]

  return (
    <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4 space-y-3">
      {/* Row 1: Asset Selector + Sector Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Controls</span>
        </div>

        <select
          value={selectedTicker}
          onChange={(e) => onTickerChange(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-w-[200px]"
        >
          {filteredAssets.map((a) => (
            <option key={a.symbol} value={a.symbol} className="bg-popover text-foreground">
              {a.symbol} — {a.name}
            </option>
          ))}
        </select>

        <div className="h-6 w-px bg-border hidden sm:block" />

        {/* Sector Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => onSectorChange(null)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors border",
              !selectedSector
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground"
            )}
          >
            All Sectors
          </button>
          {sectors.map((s) => (
            <button
              key={s}
              onClick={() => {
                const nextSector = s === selectedSector ? null : s;
                onSectorChange(nextSector);
                if (nextSector) {
                  const assetsInSector = ASSETS.filter((a) => a.sector === nextSector);
                  if (assetsInSector.length > 0 && !assetsInSector.some((a) => a.symbol === selectedTicker)) {
                    onTickerChange(assetsInSector[0].symbol);
                  }
                }
              }}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors border whitespace-nowrap",
                s === selectedSector
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: Lag Slider + Date Range + Recalculate */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Lead-Lag Window Slider */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap">
            Lag Window
          </span>
          <div className="flex items-center gap-2">
            <span className="tnum text-[11px] font-mono text-muted-foreground w-6 text-right">-{lagValue}d</span>
            <input
              type="range"
              min={1}
              max={10}
              value={lagValue}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                onLagChange([-v, v]);
              }}
              className="w-24 h-1.5 accent-primary cursor-pointer"
            />
            <span className="tnum text-[11px] font-mono text-muted-foreground w-6">+{lagValue}d</span>
          </div>
        </div>

        <div className="h-6 w-px bg-border hidden sm:block" />

        {/* Date Range Presets */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
          {DATE_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => onDateRangeChange(r)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                dateRange === r
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-border hidden sm:block" />

        {/* Recalculate Button */}
        <Button
          size="sm"
          onClick={onRecalculate}
          disabled={isRecalculating}
          className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs"
        >
          {isRecalculating ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Recalculating…
            </>
          ) : (
            <>
              <Zap className="h-3.5 w-3.5" />
              Recalculate
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
