"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Sparkline } from "./sparkline";
import { cn } from "@/lib/utils";
import type { KpiStat } from "@/lib/signal-data";

function toneColors(tone: KpiStat["tone"]) {
  if (tone === "positive")
    return { stroke: "oklch(0.7 0.16 158)", text: "text-success", bg: "bg-success/10" };
  if (tone === "negative")
    return { stroke: "oklch(0.68 0.2 22)", text: "text-danger", bg: "bg-danger/10" };
  return { stroke: "oklch(0.66 0.13 230)", text: "text-chart-4", bg: "bg-chart-4/10" };
}

function KpiCard({ stat, index }: { stat: KpiStat; index: number }) {
  const c = toneColors(stat.tone);
  const positive = stat.delta >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
    >
      <Card className="relative overflow-hidden p-4 sm:p-5 group hover:border-primary/40 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-2 tnum text-2xl font-semibold tracking-tight">{stat.value}</p>
          </div>
          <div
            className={cn(
              "flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
              positive ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
            )}
          >
            {positive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(stat.delta)}%
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <span className="text-[11px] text-muted-foreground">{stat.deltaLabel}</span>
          <div className={c.text}>
            <Sparkline
              data={stat.spark}
              width={110}
              height={34}
              stroke={c.stroke}
              fill={c.stroke}
              className="opacity-90"
            />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export function KpiCards({ kpis }: { kpis: KpiStat[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {kpis.map((k, i) => (
        <KpiCard key={k.label} stat={k} index={i} />
      ))}
    </div>
  );
}
