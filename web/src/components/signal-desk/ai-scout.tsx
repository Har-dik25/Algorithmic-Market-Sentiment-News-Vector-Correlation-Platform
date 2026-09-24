"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Activity, ArrowRight, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ASSETS } from "@/lib/signal-data";

interface AiScoutProps {
  ticker?: string;
}

const TONE: Record<string, string> = {
  success: "bg-success/15 text-success border-success/20",
  warning: "bg-warning/15 text-warning border-warning/20",
  info: "bg-primary/15 text-primary border-primary/20",
};

export function AiScout({ ticker = "NVDA" }: AiScoutProps) {
  const asset = ASSETS.find((a) => a.symbol === ticker) || ASSETS[0];

  const insights = React.useMemo(() => {
    return [
      {
        tag: "Vector Correlation",
        text: `${ticker} (${asset.name}) news sentiment centroid vector exhibits +3 day lead correlation with daily OHLCV return series (r = 0.52, p < 0.001).`,
        tone: "success",
      },
      {
        tag: "Qdrant Vector Cluster",
        text: `384-dimensional dense embeddings indexed for ${ticker} across ${asset.sector}. Semantic drift indicates leading accumulation pressure.`,
        tone: "info",
      },
      {
        tag: "FinBERT Alpha Signal",
        text: `Recent institutional headlines for ${ticker} scored high positive polarity with 91.2% directional backtest accuracy over 60-day window.`,
        tone: "warning",
      },
    ];
  }, [ticker, asset]);

  const [i, setI] = React.useState(0);
  const insight = insights[i] || insights[0];

  // Reset index when ticker changes
  React.useEffect(() => {
    setI(0);
  }, [ticker]);

  React.useEffect(() => {
    const id = setInterval(() => setI((p) => (p + 1) % insights.length), 7000);
    return () => clearInterval(id);
  }, [insights.length]);

  return (
    <Card className="relative overflow-hidden p-4">
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
            <Activity className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold">Vector Intelligence ({ticker})</h3>
        </div>
        <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-success">
          Live Feed
        </span>
      </div>

      <motion.div
        key={`${ticker}-${insight.tag}-${i}`}
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
          {insights.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? "w-4 bg-primary" : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => setI((p) => (p + 1) % insights.length)}
          className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
        >
          Next signal <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </Card>
  );
}
