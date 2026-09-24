"use client";

import * as React from "react";
import { TICKER, fmtPrice } from "@/lib/signal-data";
import { cn } from "@/lib/utils";

export function TickerTape() {
  const items = [...TICKER, ...TICKER];
  return (
    <div className="relative overflow-hidden border-y border-border bg-muted/30">
      <div className="flex w-max animate-ticker">
        {items.map((t, i) => {
          const up = t.change >= 0;
          return (
            <div
              key={i}
              className="flex items-center gap-2 px-4 py-2 border-r border-border/40 whitespace-nowrap"
            >
              <span className="text-xs font-semibold text-foreground">{t.symbol}</span>
              <span className="tnum text-xs text-muted-foreground">{fmtPrice(t.price)}</span>
              <span
                className={cn(
                  "tnum text-[11px] font-medium",
                  up ? "text-success" : "text-danger"
                )}
              >
                {up ? "▲" : "▼"} {Math.abs(t.change).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}
