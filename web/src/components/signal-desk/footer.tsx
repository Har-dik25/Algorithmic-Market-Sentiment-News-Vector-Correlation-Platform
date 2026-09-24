"use client";

import * as React from "react";
import { TickerTape } from "./ticker-tape";
import { ShieldCheck, Zap } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-background">
      <TickerTape />
      <div className="px-4 sm:px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>© 2025 Signal Desk</span>
          <span className="h-3 w-px bg-border" />
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            Encrypted feed
          </span>
          <span className="hidden sm:flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-warning" />
            Avg latency 38ms
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <a className="hover:text-foreground transition-colors" href="#">Docs</a>
          <a className="hover:text-foreground transition-colors" href="#">API</a>
          <a className="hover:text-foreground transition-colors" href="#">Status</a>
          <a className="hover:text-foreground transition-colors" href="#">Privacy</a>
        </div>
      </div>
    </footer>
  );
}
