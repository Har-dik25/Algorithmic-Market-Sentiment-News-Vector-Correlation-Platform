"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, X } from "lucide-react";
import { NAV_ITEMS } from "./nav-config";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeId: string;
  onNavigate: (id: string) => void;
  className?: string;
}

function SidebarBody({ activeId, onNavigate }: SidebarProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 h-16 shrink-0 border-b border-border/40">
        <Logo className="h-8 w-8" />
        <div className="flex flex-col leading-none">
          <span className="font-semibold tracking-tight text-[15px]">Signal Desk</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Vector Engine
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 scroll-thin overflow-y-auto">
        <p className="px-3 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
          Navigation
        </p>
        {NAV_ITEMS.map((item) => {
          const active = activeId === item.id;
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-accent"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <Icon
                className={cn(
                  "relative z-10 h-[18px] w-[18px] shrink-0",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              <span className="relative z-10 flex-1">{item.label}</span>
              {item.badge && (
                <span className="relative z-10 inline-flex items-center gap-1 rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot-live" />
                  {item.badge}
                </span>
              )}
              {active && <ChevronRight className="relative z-10 h-4 w-4 text-muted-foreground" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/40">
        <div className="flex items-center gap-2.5 px-2 py-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-success" />
          <span>Qdrant DB: Active</span>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ activeId, onNavigate, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "hidden lg:flex w-[260px] shrink-0 flex-col border-r border-border bg-sidebar",
        className
      )}
    >
      <SidebarBody activeId={activeId} onNavigate={onNavigate} />
    </aside>
  );
}

export function MobileSidebar({
  activeId,
  onNavigate,
}: {
  activeId: string;
  onNavigate: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" aria-label="Open menu">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="7" x2="20" y2="7" strokeLinecap="round" />
            <line x1="4" y1="12" x2="20" y2="12" strokeLinecap="round" />
            <line x1="4" y1="17" x2="20" y2="17" strokeLinecap="round" />
          </svg>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="h-16 flex-row items-center justify-between px-4 space-y-0 border-b border-border">
          <SheetTitle className="text-left">Menu</SheetTitle>
        </SheetHeader>
        <div className="h-[calc(100%-4rem)]">
          <SidebarBody
            activeId={activeId}
            onNavigate={(id) => {
              onNavigate(id);
              setOpen(false);
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { X };
