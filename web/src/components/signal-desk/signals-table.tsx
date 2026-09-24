"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fmtPrice,
  fmtAgo,
  statusLabel,
  statusTone,
  type Signal,
  type SignalStatus,
  type Direction,
} from "@/lib/signal-data";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: { value: SignalStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "PENDING", label: "Pending" },
  { value: "TP_HIT", label: "TP Hit" },
  { value: "SL_HIT", label: "SL Hit" },
  { value: "CLOSED", label: "Closed" },
];

const TONE_BADGE: Record<string, string> = {
  positive: "bg-success/15 text-success border-success/20",
  negative: "bg-danger/15 text-danger border-danger/20",
  warning: "bg-warning/15 text-warning border-warning/20",
  neutral: "bg-muted text-muted-foreground border-border",
};

function DirPill({ d }: { d: Direction }) {
  const long = d === "LONG";
  const Icon = long ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold",
        long ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
      )}
    >
      <Icon className="h-3 w-3" />
      {d}
    </span>
  );
}

export function SignalsTable() {
  const [status, setStatus] = React.useState<SignalStatus | "ALL">("ALL");
  const [direction, setDirection] = React.useState<Direction | "ALL">("ALL");
  const [q, setQ] = React.useState("");
  const [data, setData] = React.useState<Signal[] | null>(null);
  const [total, setTotal] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setData(null);
    const params = new URLSearchParams();
    if (status !== "ALL") params.set("status", status);
    if (direction !== "ALL") params.set("direction", direction);
    if (q) params.set("q", q);
    params.set("limit", "30");
    fetch(`/api/signals?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        setData(res.signals);
        setTotal(res.total);
      })
      .catch(() => !cancelled && setData([]));
    return () => {
      cancelled = true;
    };
  }, [status, direction, q]);

  return (
    <Card className="overflow-hidden p-0">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Signals Log</h3>
            <p className="text-[11px] text-muted-foreground">
              {data ? `${data.length} of ${total} signals` : "Loading…"}
            </p>
          </div>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Columns
          </Button>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by symbol or name…"
              className="h-9 pl-9 bg-muted/40"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5 overflow-x-auto scroll-thin">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatus(f.value)}
                className={cn(
                  "shrink-0 px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                  status === f.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              onClick={() => setDirection("ALL")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                direction === "ALL"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Both
            </button>
            <button
              onClick={() => setDirection("LONG")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                direction === "LONG" ? "bg-success/15 text-success" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Long
            </button>
            <button
              onClick={() => setDirection("SHORT")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                direction === "SHORT" ? "bg-danger/15 text-danger" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Short
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="py-2.5 pl-4 pr-2 text-left font-medium">Signal</th>
              <th className="py-2.5 px-2 text-left font-medium">Asset</th>
              <th className="py-2.5 px-2 text-left font-medium">Side</th>
              <th className="py-2.5 px-2 text-left font-medium hidden lg:table-cell">Strategy</th>
              <th className="py-2.5 px-2 text-right font-medium">Entry</th>
              <th className="py-2.5 px-2 text-right font-medium">TP</th>
              <th className="py-2.5 px-2 text-right font-medium">SL</th>
              <th className="py-2.5 px-2 text-center font-medium">R:R</th>
              <th className="py-2.5 px-2 text-center font-medium hidden md:table-cell">Conf.</th>
              <th className="py-2.5 px-2 text-right font-medium">Status</th>
              <th className="py-2.5 pl-2 pr-4 text-right font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {!data &&
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-3 pl-4" colSpan={11}>
                    <Skeleton className="h-6 w-full" />
                  </td>
                </tr>
              ))}
            {data &&
              data.map((s, i) => (
                <motion.tr
                  key={s.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
                  className="border-b border-border/50 last:border-0 transition-colors hover:bg-accent/30"
                >
                  <td className="py-3 pl-4 pr-2">
                    <span className="tnum text-[11px] text-muted-foreground">{s.id}</span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{s.asset}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <DirPill d={s.direction} />
                  </td>
                  <td className="py-3 px-2 hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">{s.strategy}</span>
                  </td>
                  <td className="py-3 px-2 text-right tnum text-xs">${fmtPrice(s.entry)}</td>
                  <td className="py-3 px-2 text-right tnum text-xs text-success">${fmtPrice(s.takeProfit)}</td>
                  <td className="py-3 px-2 text-right tnum text-xs text-danger">${fmtPrice(s.stopLoss)}</td>
                  <td className="py-3 px-2 text-center tnum text-xs font-medium">{s.rr.toFixed(2)}</td>
                  <td className="py-3 px-2 hidden md:table-cell">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="h-1 w-10 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            s.confidence >= 80 ? "bg-success" : s.confidence >= 70 ? "bg-warning" : "bg-muted-foreground"
                          )}
                          style={{ width: `${s.confidence}%` }}
                        />
                      </div>
                      <span className="tnum text-[10px] text-muted-foreground w-6">{s.confidence}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] font-medium", TONE_BADGE[statusTone(s.status)])}
                    >
                      {statusLabel(s.status)}
                    </Badge>
                  </td>
                  <td className="py-3 pl-2 pr-4 text-right text-[11px] text-muted-foreground">
                    {fmtAgo(s.ageMinutes)}
                  </td>
                </motion.tr>
              ))}
            {data && data.length === 0 && (
              <tr>
                <td colSpan={11} className="py-12 text-center text-sm text-muted-foreground">
                  No signals match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
