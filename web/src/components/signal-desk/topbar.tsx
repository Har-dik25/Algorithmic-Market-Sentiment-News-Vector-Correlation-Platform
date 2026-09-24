"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Bell, Search, Command, Database, Activity, Server, Cpu, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "./theme-toggle";
import { MobileSidebar } from "./sidebar";
import { useClock } from "./use-clock";
import { Logo } from "./logo";
import { ASSETS, fmtPrice } from "@/lib/signal-data";

interface HealthData {
  status: string;
  total_tickers: number;
  total_articles: number;
  total_price_records: number;
  database: string;
}

function OperationalHealthBar() {
  const [health, setHealth] = React.useState<HealthData | null>(null);

  React.useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch("http://127.0.0.1:8000/health");
        if (res.ok) {
          const data = await res.json();
          setHealth(data);
        }
      } catch {
        setHealth(null);
      }
    }
    fetchHealth();
    const id = setInterval(fetchHealth, 30000);
    return () => clearInterval(id);
  }, []);

  const connected = health?.status === "HEALTHY";

  return (
    <div className="hidden 2xl:flex items-center gap-3 rounded-lg border border-border/70 bg-muted/40 px-3 py-1.5">
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-success pulse-dot-live" : "bg-danger"}`} />
        <span className="text-[10px] font-semibold text-muted-foreground">API</span>
        <span className={`text-[10px] font-medium ${connected ? "text-success" : "text-danger"}`}>
          {connected ? "Connected" : "Offline"}
        </span>
      </div>
      <span className="h-3 w-px bg-border" />
      <div className="flex items-center gap-1">
        <Database className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground">SQLite</span>
        <span className={`text-[10px] font-medium ${connected ? "text-success" : "text-muted-foreground"}`}>
          {connected ? "✓" : "—"}
        </span>
      </div>
      <span className="h-3 w-px bg-border" />
      <div className="flex items-center gap-1">
        <Cpu className="h-3 w-3 text-primary" />
        <span className="text-[10px] font-medium text-primary">384-d Qdrant</span>
        <span className={`text-[10px] font-medium ${connected ? "text-success" : "text-muted-foreground"}`}>
          {connected ? "✓" : "—"}
        </span>
      </div>
      {health && (
        <>
          <span className="h-3 w-px bg-border" />
          <span className="text-[10px] font-mono text-muted-foreground">
            {health.total_tickers} tickers · {health.total_price_records.toLocaleString()} prices · {health.total_articles.toLocaleString()} articles
          </span>
        </>
      )}
    </div>
  );
}

function MarketClock() {
  const now = useClock();
  const utc = now
    ? now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "UTC",
        hour12: false,
      })
    : "--:--:--";
  return (
    <div className="hidden lg:flex items-center gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 py-1.5">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot-live" />
        <span className="text-[11px] font-medium text-muted-foreground">Markets</span>
      </div>
      <span className="h-3 w-px bg-border" />
      <span className="tnum text-xs text-foreground font-mono">{utc} UTC</span>
    </div>
  );
}

function QuickCompanySwitcher({
  selectedTicker = "NVDA",
  onTickerChange,
}: {
  selectedTicker?: string;
  onTickerChange?: (ticker: string) => void;
}) {
  const asset = ASSETS.find((a) => a.symbol === selectedTicker) || ASSETS[0];
  const isUp = asset.change24h >= 0;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Active:</span>
        <select
          value={selectedTicker}
          onChange={(e) => onTickerChange?.(e.target.value)}
          className="bg-transparent text-xs font-bold text-primary font-mono focus:outline-none cursor-pointer"
        >
          {ASSETS.map((a) => (
            <option key={a.symbol} value={a.symbol} className="bg-popover text-foreground">
              {a.symbol} ({a.name.slice(0, 16)})
            </option>
          ))}
        </select>
        <span className="font-mono text-[11px] text-foreground font-semibold ml-1">
          ${fmtPrice(asset.price)}
        </span>
        <span className={`text-[10px] font-mono font-semibold flex items-center ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
          {isUp ? "+" : ""}{asset.change24h}%
        </span>
      </div>
    </div>
  );
}

export function Topbar({
  activeId,
  onNavigate,
  selectedTicker = "NVDA",
  onTickerChange,
}: {
  activeId: string;
  onNavigate: (id: string) => void;
  selectedTicker?: string;
  onTickerChange?: (ticker: string) => void;
}) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-3 backdrop-blur-xl sm:px-5">
      <div className="flex items-center gap-2 lg:hidden">
        <MobileSidebar activeId={activeId} onNavigate={onNavigate} />
        <Logo className="h-7 w-7" />
      </div>

      <QuickCompanySwitcher
        selectedTicker={selectedTicker}
        onTickerChange={onTickerChange}
      />

      <div className="ml-auto flex items-center gap-2">
        <OperationalHealthBar />
        <MarketClock />
        <ThemeToggle />

        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-accent/40 px-2.5 py-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold border border-border">
            ML
          </div>
          <div className="hidden md:flex flex-col items-start leading-none">
            <span className="text-xs font-semibold text-foreground">Quant Engine</span>
            <span className="text-[10px] text-success font-mono">v1.0 · Active</span>
          </div>
        </div>
      </div>
    </header>
  );
}
