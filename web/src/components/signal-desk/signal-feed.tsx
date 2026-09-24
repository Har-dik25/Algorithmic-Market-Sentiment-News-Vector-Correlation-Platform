"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Radio, ArrowUpRight, ArrowDownRight, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ASSETS,
  SIGNALS,
  fmtPrice,
  fmtAgo,
  statusLabel,
  type Signal,
  type Direction,
} from "@/lib/signal-data";
import { cn } from "@/lib/utils";

function dirMeta(d: Direction) {
  return d === "LONG"
    ? { label: "LONG", icon: ArrowUpRight, color: "text-success", bg: "bg-success/10", ring: "ring-success/20" }
    : { label: "SHORT", icon: ArrowDownRight, color: "text-danger", bg: "bg-danger/10", ring: "ring-danger/20" };
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 80 ? "bg-success" : value >= 70 ? "bg-warning" : "bg-muted-foreground";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-12 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }} />
      </div>
      <span className="tnum text-[10px] text-muted-foreground w-7">{value}%</span>
    </div>
  );
}

function FeedCard({ signal, fresh }: { signal: Signal; fresh?: boolean }) {
  const m = dirMeta(signal.direction);
  const Icon = m.icon;
  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/40",
        fresh ? "border-primary/40 bg-primary/[0.03]" : "border-border/60 bg-card/40"
      )}
    >
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1", m.bg, m.ring)}>
        <Icon className={cn("h-4 w-4", m.color)} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{signal.asset}</span>
          <span className={cn("rounded px-1 py-px text-[9px] font-bold", m.bg, m.color)}>
            {m.label}
          </span>
          {fresh && (
            <span className="ml-auto flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-primary">
              <span className="h-1 w-1 rounded-full bg-primary pulse-dot-live" />
              New
            </span>
          )}
        </div>
        <p className="truncate text-[11px] text-muted-foreground">{signal.strategy}</p>

        <div className="mt-1.5 flex items-center gap-3 text-[10px]">
          <span className="text-muted-foreground">
            E <span className="tnum text-foreground">${fmtPrice(signal.entry)}</span>
          </span>
          <span className="text-muted-foreground">
            TP <span className="tnum text-success">${fmtPrice(signal.takeProfit)}</span>
          </span>
          <span className="text-muted-foreground">
            SL <span className="tnum text-danger">${fmtPrice(signal.stopLoss)}</span>
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        <ConfidenceBar value={signal.confidence} />
        <span className="text-[10px] text-muted-foreground">{fmtAgo(signal.ageMinutes)}</span>
      </div>
    </div>
  );
}

function makeLiveSignal(): Signal {
  const asset = ASSETS[Math.floor(Math.random() * ASSETS.length)];
  const direction: Direction = Math.random() > 0.5 ? "LONG" : "SHORT";
  const entry = asset.price;
  const risk = entry * (0.008 + Math.random() * 0.02);
  const reward = risk * (1.5 + Math.random() * 2.5);
  const takeProfit = direction === "LONG" ? entry + reward : entry - reward;
  const stopLoss = direction === "LONG" ? entry - risk : entry + risk;
  const strategies = ["Breakout Momentum", "Order Block Retest", "Liquidity Sweep", "Fibonacci Confluence"];
  return {
    id: `SD-${Math.floor(1104 + Math.random() * 900)}`,
    asset: asset.symbol,
    assetName: asset.name,
    klass: asset.klass,
    direction,
    status: "ACTIVE",
    entry,
    takeProfit,
    stopLoss,
    rr: Number((reward / risk).toFixed(2)),
    confidence: Math.floor(62 + Math.random() * 36),
    ageMinutes: 0,
    strategy: strategies[Math.floor(Math.random() * strategies.length)],
  };
}

export function SignalFeed() {
  const [items, setItems] = React.useState<Signal[]>(() =>
    SIGNALS.filter((s) => s.status === "ACTIVE" || s.status === "PENDING").slice(0, 6)
  );
  const [newIds, setNewIds] = React.useState<Set<string>>(new Set());
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const sig = makeLiveSignal();
      setItems((prev) => [sig, ...prev].slice(0, 8));
      setNewIds((prev) => new Set(prev).add(sig.id));
      setTimeout(() => {
        setNewIds((prev) => {
          const n = new Set(prev);
          n.delete(sig.id);
          return n;
        });
      }, 5000);
    }, 5200);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <Card className="flex flex-col overflow-hidden p-0 h-full">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <h3 className="text-sm font-semibold">Live Signal Feed</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-[11px] text-muted-foreground"
          onClick={() => setPaused((p) => !p)}
        >
          <Radio className="h-3.5 w-3.5" />
          {paused ? "Resume" : "Pause"}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin p-3 space-y-2 max-h-[420px] lg:max-h-none">
        <AnimatePresence initial={false}>
          {items.map((s) => (
            <motion.div
              key={s.id}
              layout
              initial={{ opacity: 0, height: 0, x: -8 }}
              animate={{ opacity: 1, height: "auto", x: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <FeedCard signal={s} fresh={newIds.has(s.id)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="border-t border-border p-2.5">
        <Button variant="ghost" size="sm" className="w-full justify-between text-xs">
          View all signals
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
