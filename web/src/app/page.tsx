"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Radio, ListChecks, BarChart3, LineChart, Activity } from "lucide-react";
import { Sidebar } from "@/components/signal-desk/sidebar";
import { Topbar } from "@/components/signal-desk/topbar";
import { Footer } from "@/components/signal-desk/footer";
import { KpiCards } from "@/components/signal-desk/kpi-cards";
import { MainChart } from "@/components/signal-desk/main-chart";
import { SignalFeed } from "@/components/signal-desk/signal-feed";
import { Watchlist } from "@/components/signal-desk/watchlist";
import { SignalsTable } from "@/components/signal-desk/signals-table";
import { PerformanceCard, SentimentGauge } from "@/components/signal-desk/performance";
import { StrategyDistribution } from "@/components/signal-desk/strategy-distribution";
import { AiScout } from "@/components/signal-desk/ai-scout";
import { SectionHeader } from "@/components/signal-desk/section-header";
import { KPIS } from "@/lib/signal-data";

const SECTIONS = ["terminal", "live-signals", "watchlist", "signals", "analytics"];

function useScrollSpy(ids: string[]) {
  const [active, setActive] = React.useState(ids[0]);
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);
  return active;
}

export default function Home() {
  const active = useScrollSpy(SECTIONS);

  const handleNavigate = React.useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar activeId={active} onNavigate={handleNavigate} className="sticky top-0 h-screen" />

        <div className="flex flex-1 flex-col min-w-0 min-h-screen">
          <Topbar activeId={active} onNavigate={handleNavigate} />

          <main className="flex-1 scroll-thin">
            <div className="mx-auto w-full max-w-[1600px] px-3 sm:px-5 lg:px-7 py-5 space-y-8">
              {/* ── Terminal overview ───────────────────────── */}
              <section id="terminal" className="scroll-mt-20 space-y-5">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-wrap items-end justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                        Market Sentiment Vector Terminal
                      </h1>
                      <span className="inline-flex items-center gap-1 rounded-full border border-success/20 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                        <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot-live" />
                        LIVE PIPELINE
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Real-time news vector embeddings, Qdrant search &amp; lead-lag price correlation.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                      <span className="text-muted-foreground">NYSE</span>
                      <span className="text-foreground font-medium">Open</span>
                    </div>
                    <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-success" />
                      <span className="text-muted-foreground">Crypto</span>
                      <span className="text-foreground font-medium">24/7</span>
                    </div>
                  </div>
                </motion.div>

                <KpiCards kpis={KPIS} />

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  <div className="xl:col-span-2">
                    <MainChart />
                  </div>
                  <div className="xl:col-span-1">
                    <SignalFeed />
                  </div>
                </div>
              </section>

              {/* ── Live signals & alpha ────────────────────── */}
              <section id="live-signals" className="scroll-mt-20 space-y-4">
                <SectionHeader
                  icon={Radio}
                  title="Live Signals & Alpha"
                  description="Streaming opportunities & AI-generated market intelligence"
                />
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <AiScout />
                  </div>
                  <div className="lg:col-span-1">
                    <SentimentGauge />
                  </div>
                </div>
              </section>

              {/* ── Watchlist ──────────────────────────────── */}
              <section id="watchlist" className="scroll-mt-20 space-y-4">
                <SectionHeader
                  icon={ListChecks}
                  title="Watchlist"
                  description="Tracked instruments with live, flashing prices"
                  action={
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Activity className="h-3.5 w-3.5 text-success" />
                      Live feed
                    </div>
                  }
                />
                <Watchlist />
              </section>

              {/* ── Signals log ─────────────────────────────── */}
              <section id="signals" className="scroll-mt-20 space-y-4">
                <SectionHeader
                  icon={BarChart3}
                  title="Signals Log"
                  description="Full history with filters & risk metrics"
                />
                <SignalsTable />
              </section>

              {/* ── Analytics ───────────────────────────────── */}
              <section id="analytics" className="scroll-mt-20 space-y-4">
                <SectionHeader
                  icon={LineChart}
                  title="Performance Analytics"
                  description="Equity curve, monthly returns & strategy mix"
                />
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <PerformanceCard />
                  </div>
                  <div className="lg:col-span-1">
                    <StrategyDistribution />
                  </div>
                </div>
              </section>

              <div className="h-2" />
            </div>
          </main>

          <Footer />
        </div>
      </div>
    </div>
  );
}
