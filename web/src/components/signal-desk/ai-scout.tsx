"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Activity, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

const INSIGHTS = [
  {
    tag: "Vector Correlation",
    text: "NVDA 30-day news sentiment centroid vector exhibits +3 day lead correlation with daily OHLCV return series (r = 0.47, p < 0.01).",
    tone: "success",
  },
  {
    tag: "Regulatory Ingestion",
    text: "SEC EDGAR 8-K filings ingested for AAPL & MSFT. 384-dimensional dense vectors indexed into Qdrant storage.",
    tone: "info",
  },
  {
    tag: "Indian Market Signal",
    text: "NSE Nifty 50 sentiment feed (RELIANCE, TCS) synchronized with Yahoo Finance daily log returns.",
    tone: "warning",
  },
];

const TONE: Record<string, string> = {
  success: "bg-success/15 text-success border-success/20",
  warning: "bg-warning/15 text-warning border-warning/20",
  info: "bg-primary/15 text-primary border-primary/20",
};

export function AiScout() {
  const [i, setI] = React.useState(0);
  const insight = INSIGHTS[i];

  React.useEffect(() => {
    const id = setInterval(() => setI((p) => (p + 1) % INSIGHTS.length), 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <Card className="relative overflow-hidden p-4">
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
            <Activity className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold">Vector Intelligence</h3>
        </div>
        <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-success">
          Live Feed
        </span>
      </div>

      <motion.div
        key={insight.tag}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-3 space-y-2"
      >
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${TONE[insight.tone]}`}
        >
          {insight.tag}
        </span>
        <p className="text-xs text-muted-foreground leading-relaxed font-mono">
          {insight.text}
        </p>
      </motion.div>

      <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/40">
        <div className="flex gap-1">
          {INSIGHTS.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? "w-4 bg-primary" : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => setI((p) => (p + 1) % INSIGHTS.length)}
          className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
        >
          Next signal <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </Card>
  );
}
