"use client";

import * as React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { SIGNALS } from "@/lib/signal-data";

const COLORS = [
  "oklch(0.72 0.16 162)",
  "oklch(0.66 0.13 230)",
  "oklch(0.8 0.16 75)",
  "oklch(0.7 0.2 305)",
  "oklch(0.68 0.2 22)",
  "oklch(0.7 0.16 200)",
];

export function StrategyDistribution() {
  const data = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of SIGNALS) counts[s.strategy] = (counts[s.strategy] || 0) + 1;
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, []);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Strategy Mix</h3>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          by signals
        </span>
      </div>

      <div className="relative mt-2 h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={66}
              paddingAngle={2}
              stroke="var(--background)"
              strokeWidth={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }: any) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border border-border bg-popover/95 px-2.5 py-1.5 shadow-xl">
                    <p className="text-[11px] font-medium">{payload[0].name}</p>
                    <p className="tnum text-[11px] text-muted-foreground">{payload[0].value} signals</p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tnum text-xl font-semibold">{data.length}</span>
          <span className="text-[10px] text-muted-foreground">strategies</span>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="text-[11px] text-muted-foreground flex-1 truncate">{d.name}</span>
            <span className="tnum text-[11px] font-medium">{d.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
