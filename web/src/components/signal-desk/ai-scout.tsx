"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const INSIGHTS = [
  {
    tag: "Momentum Shift",
    text: "BTC funding flipped positive across top 3 venues. Long bias increasing — watch for liquidation cascade above $69.2k.",
    tone: "success",
  },
  {
    tag: "Liquidity Alert",
    text: "Resting liquidity detected below ETH $3,480. High-probability sweep setup forming on the 4H timeframe.",
    tone: "warning",
  },
  {
    tag: "Correlation Break",
    text: "NVDA / NASDAQ 30-day correlation dropped to 0.62. Divergence may signal sector rotation.",
    tone: "info",
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
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold">AI Scout</h3>
        </div>
        <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-success">
          Online
        </span>
      </div>

      <motion.div
        key={insight.tag}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mt-3"
      >
        <span
          className={
            "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold " +
            TONE[insight.tone]
          }
        >
          {insight.tag}
        </span>
        <p className="mt-2 text-[13px] leading-relaxed text-foreground/90">{insight.text}</p>
      </motion.div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1.5">
          {INSIGHTS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              className={
                "h-1.5 rounded-full transition-all " +
                (idx === i ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/40")
              }
              aria-label={`Insight ${idx + 1}`}
            />
          ))}
        </div>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-muted-foreground">
          Ask Scout
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </Card>
  );
}
