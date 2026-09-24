"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Plus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ASSETS, fmtPrice, fmtCompact, type Asset } from "@/lib/signal-data";
import { Sparkline } from "./sparkline";
import { cn } from "@/lib/utils";

const CLASS_COLORS: Record<string, string> = {
  Crypto: "bg-warning/15 text-warning",
  Forex: "bg-chart-4/15 text-chart-4",
  Stocks: "bg-chart-5/15 text-chart-5",
  Commodities: "bg-success/15 text-success",
  Indices: "bg-primary/15 text-primary",
};

function WatchRow({
  asset,
  index,
  isSelected,
  onSelect,
}: {
  asset: Asset;
  index: number;
  isSelected?: boolean;
  onSelect?: () => void;
}) {
  const [price, setPrice] = React.useState(asset.price);
  const [flash, setFlash] = React.useState<"up" | "down" | null>(null);

  React.useEffect(() => {
    const id = setInterval(() => {
      setPrice((prev) => {
        const next = prev * (1 + (Math.random() - 0.5) * 0.0016);
        setFlash(next >= prev ? "up" : "down");
        setTimeout(() => setFlash(null), 700);
        return next;
      });
    }, 1800 + index * 220);
    return () => clearInterval(id);
  }, [index]);

  const up = asset.change24h >= 0;
  const changePct = Math.abs(asset.change24h).toFixed(2);

  return (
    <tr
      onClick={onSelect}
      className={cn(
        "group border-b border-border/50 last:border-0 transition-colors cursor-pointer hover:bg-accent/40",
        isSelected && "bg-primary/15 border-l-2 border-primary"
      )}
    >
      <td className="py-2.5 pl-3 pr-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold uppercase">
            {asset.symbol.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={cn("text-sm font-semibold", isSelected && "text-primary font-bold")}>
                {asset.symbol}
              </span>
              <span
                className={cn(
                  "rounded px-1 py-px text-[8px] font-semibold uppercase tracking-wide",
                  CLASS_COLORS[asset.klass]
                )}
              >
                {asset.klass.slice(0, 3)}
              </span>
            </div>
            <p className="truncate text-[11px] text-muted-foreground">{asset.name}</p>
          </div>
        </div>
      </td>
      <td className="py-2.5 px-2 text-right">
        <div
          className={cn(
            "tnum text-sm font-medium rounded px-1 -mx-1 inline-block",
            flash === "up" && "flash-up",
            flash === "down" && "flash-down"
          )}
        >
          ${fmtPrice(price)}
        </div>
      </td>
      <td className="py-2.5 px-2 text-right hidden sm:table-cell">
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-xs font-semibold",
            up ? "text-success" : "text-danger"
          )}
        >
          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {changePct}%
        </span>
      </td>
      <td className="py-2.5 px-2 text-right hidden md:table-cell">
        <span className="tnum text-xs text-muted-foreground">${fmtCompact(asset.volume24h)}</span>
      </td>
      <td className="py-2.5 pl-2 pr-3 text-right">
        <div
          className={cn(
            "inline-block",
            up ? "text-success [&_path]:stroke-success" : "text-danger [&_path]:stroke-danger"
          )}
        >
          <Sparkline data={asset.spark} width={80} height={28} />
        </div>
      </td>
    </tr>
  );
}

export function Watchlist({
  selectedTicker,
  onSelectTicker,
}: {
  selectedTicker?: string;
  onSelectTicker?: (ticker: string) => void;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h3 className="text-sm font-semibold">Asset Universe Watchlist</h3>
          <p className="text-[11px] text-muted-foreground">
            {ASSETS.length} instruments tracked · Click any row to load into Terminal
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="py-2 pl-3 pr-2 text-left font-medium">Asset</th>
              <th className="py-2 px-2 text-right font-medium">Price</th>
              <th className="py-2 px-2 text-right font-medium hidden sm:table-cell">24h</th>
              <th className="py-2 px-2 text-right font-medium hidden md:table-cell">Vol</th>
              <th className="py-2 pl-2 pr-3 text-right font-medium">Trend</th>
            </tr>
          </thead>
          <tbody>
            {ASSETS.map((a, i) => (
              <WatchRow
                key={a.symbol}
                asset={a}
                index={i}
                isSelected={a.symbol === selectedTicker}
                onSelect={() => onSelectTicker?.(a.symbol)}
              />
            ))}
          </tbody>
        </table>
      </motion.div>
    </Card>
  );
}
