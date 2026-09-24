"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Bell, Search, Sparkles, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

function NotificationBell() {
  const items = [
    { title: "TP hit on BTC/USDT", time: "2m", tone: "success" as const },
    { title: "New signal: ETH/USDT LONG", time: "6m", tone: "info" as const },
    { title: "SL hit on GBP/JPY", time: "14m", tone: "danger" as const },
    { title: "Volatility spike on SOL", time: "21m", tone: "warning" as const },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger ring-2 ring-background" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between py-3 px-4">
          <span>Notifications</span>
          <Badge variant="secondary" className="text-[10px]">
            4 new
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((it) => (
          <DropdownMenuItem key={it.title} className="py-2.5 px-4 cursor-pointer">
            <div className="flex w-full items-start gap-3">
              <span
                className={
                  "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full " +
                  (it.tone === "success"
                    ? "bg-success"
                    : it.tone === "danger"
                      ? "bg-danger"
                      : it.tone === "warning"
                        ? "bg-warning"
                        : "bg-primary")
                }
              />
              <div className="flex-1">
                <p className="text-sm leading-tight">{it.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{it.time} ago</p>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center text-xs text-muted-foreground py-2.5">
          View all activity
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CommandSearch() {
  return (
    <div className="relative flex-1 max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search signals, assets, strategies…"
        className="h-9 pl-9 pr-16 bg-muted/40 border-border/60 focus-visible:bg-background"
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

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <MarketClock />

        <Button
          variant="ghost"
          size="sm"
          className="hidden xl:inline-flex h-9 gap-1.5 text-xs"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>AI Scout</span>
        </Button>

        <ThemeToggle />
        <NotificationBell />

        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg p-0.5 pr-1 hover:bg-accent/60 transition-colors">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarFallback className="bg-gradient-to-br from-primary/80 to-chart-4 text-[11px] font-semibold text-primary-foreground">
                  AR
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start leading-none">
                <span className="text-xs font-medium">Aria Reyes</span>
                <span className="text-[10px] text-muted-foreground">Pro · ID 4821</span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuItem>API Keys</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
