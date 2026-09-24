"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Bell, Search, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "./theme-toggle";
import { MobileSidebar } from "./sidebar";
import { useClock } from "./use-clock";
import { Logo } from "./logo";

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
    <div className="hidden md:flex items-center gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 py-1.5">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot-live" />
        <span className="text-[11px] font-medium text-muted-foreground">Markets</span>
      </div>
      <span className="h-3 w-px bg-border" />
      <span className="tnum text-xs text-foreground">{utc} UTC</span>
    </div>
  );
}

function CommandSearch() {
  return (
    <div className="relative flex-1 max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search news vectors, tickers, correlations…"
        className="h-9 pl-9 pr-16 bg-muted/40 border-border/60 focus-visible:bg-background text-xs"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
        <Command className="h-2.5 w-2.5" />K
      </kbd>
    </div>
  );
}

export function Topbar({
  activeId,
  onNavigate,
}: {
  activeId: string;
  onNavigate: (id: string) => void;
}) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur-xl sm:px-5">
      <div className="flex items-center gap-2 lg:hidden">
        <MobileSidebar activeId={activeId} onNavigate={onNavigate} />
        <Logo className="h-7 w-7" />
      </div>

      <CommandSearch />

      <div className="ml-auto flex items-center gap-2">
        <MarketClock />

        <ThemeToggle />

        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-accent/40 px-2.5 py-1">
          <Avatar className="h-7 w-7 border border-border">
            <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">
              ML
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start leading-none">
            <span className="text-xs font-semibold text-foreground">Quant Engine</span>
            <span className="text-[10px] text-success font-mono">v1.0 · Active</span>
          </div>
        </div>
      </div>
    </header>
  );
}
