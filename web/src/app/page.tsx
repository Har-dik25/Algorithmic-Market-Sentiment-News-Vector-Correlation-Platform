"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  GitCompareArrows,
  Grid3X3,
  Search,
  ListChecks,
  LineChart,
  Radio,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";
import { Sidebar } from "@/components/signal-desk/sidebar";
import { Topbar } from "@/components/signal-desk/topbar";
import { Footer } from "@/components/signal-desk/footer";
import { KpiCards } from "@/components/signal-desk/kpi-cards";
import { ControlBar } from "@/components/signal-desk/control-bar";
import { MainChart } from "@/components/signal-desk/main-chart";
import { LeadLagCorrelationSection } from "@/components/signal-desk/correlation-chart";
import { RollingCorrelationSection } from "@/components/signal-desk/rolling-correlation";
import { SideBySideComparisonView } from "@/components/signal-desk/comparison-view";
import { CrossAssetHeatmapMatrix } from "@/components/signal-desk/heatmap-matrix";
import { VectorSimilaritySearchLab } from "@/components/signal-desk/vector-search-lab";
import { Watchlist } from "@/components/signal-desk/watchlist";
import { PerformanceCard, SentimentGauge } from "@/components/signal-desk/performance";
import { StrategyDistribution } from "@/components/signal-desk/strategy-distribution";
import { AiScout } from "@/components/signal-desk/ai-scout";
import { SectionHeader } from "@/components/signal-desk/section-header";
import { getKpisForTicker, KPIS, type DateRange } from "@/lib/signal-data";
import { cn } from "@/lib/utils";

type TabId = "terminal" | "comparison" | "heatmap" | "vector-lab" | "watchlist" | "analytics";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }[] = [
  { id: "terminal", label: "Single Ticker Analysis", icon: LayoutDashboard },
  { id: "comparison", label: "Side-by-Side Comparison", icon: GitCompareArrows, badge: "FR-13" },
  { id: "heatmap", label: "Heatmap Matrix", icon: Grid3X3 },
  { id: "vector-lab", label: "Vector Search Lab", icon: Search },
  { id: "watchlist", label: "Watchlist", icon: ListChecks },
  { id: "analytics", label: "Analytics", icon: LineChart },
];

export default function Home() {
  const [activeTab, setActiveTab] = React.useState<TabId>("terminal");

  // Single Ticker View State
  const [selectedTicker, setSelectedTicker] = React.useState("NVDA");
  const [selectedSector, setSelectedSector] = React.useState<string | null>(null);
  const [lagWindow, setLagWindow] = React.useState<[number, number]>([-5, 5]);
  const [dateRange, setDateRange] = React.useState<DateRange>("1Y");
  const [isRecalculating, setIsRecalculating] = React.useState(false);

  // Dynamic KPIs for current ticker
  const currentKpis = React.useMemo(() => {
    return getKpisForTicker(selectedTicker);
  }, [selectedTicker]);

  const handleRecalculate = () => {
    setIsRecalculating(true);
    setTimeout(() => {
      setIsRecalculating(false);
    }, 600);
  };

  const handleNavigate = (id: string) => {
    const validTab = TABS.find((t) => t.id === id);
    if (validTab) {
      setActiveTab(validTab.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar activeId={activeTab} onNavigate={handleNavigate} className="sticky top-0 h-screen" />

        <div className="flex flex-1 flex-col min-w-0 min-h-screen">
          <Topbar
            activeId={activeTab}
            onNavigate={handleNavigate}
            selectedTicker={selectedTicker}
            onTickerChange={setSelectedTicker}
          />

          <main className="flex-1 scroll-thin">
            <div className="mx-auto w-full max-w-[1600px] px-3 sm:px-5 lg:px-7 py-5 space-y-6">
              {/* ── Top Header Banner ───────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="flex flex-wrap items-end justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                      Algorithmic Market Sentiment &amp; Vector Correlation Platform
                    </h1>
                    <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success font-mono">
                      <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot-live" />
                      QDRANT 384-D ENGINE
                    </span>
                  </div>
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                    Cross-asset lead-lag price discovery powered by FinBERT embeddings, Fisher z-transforms &amp; vector search.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs font-mono">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-muted-foreground">Active Ticker:</span>
                    <span className="text-primary font-bold">{selectedTicker}</span>
                  </div>
                </div>
              </motion.div>

              {/* ── Multi-View Glassmorphism Tab Bar ───────────────────────── */}
              <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-md scroll-thin">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
                        isActive
                          ? "text-foreground bg-primary/20 border border-primary/40 shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"
                      )}
                    >
                      <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                      <span>{tab.label}</span>
                      {tab.badge && (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400 border border-emerald-500/30">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ── Active Tab Content View ───────────────────────── */}
              <AnimatePresence mode="wait">
                {activeTab === "terminal" && (
                  <motion.div
                    key="tab-terminal"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    {/* 2. Interactive Control Bar */}
                    <ControlBar
                      selectedTicker={selectedTicker}
                      onTickerChange={setSelectedTicker}
                      selectedSector={selectedSector}
                      onSectorChange={setSelectedSector}
                      lagWindow={lagWindow}
                      onLagChange={setLagWindow}
                      dateRange={dateRange}
                      onDateRangeChange={setDateRange}
                      onRecalculate={handleRecalculate}
                      isRecalculating={isRecalculating}
                    />

                    {/* PRD-Aligned KPI Cards for selected asset */}
                    <KpiCards kpis={currentKpis} />

                    {/* Dual-Axis Main Chart */}
                    <MainChart
                      selectedTicker={selectedTicker}
                      onTickerChange={setSelectedTicker}
                    />

                    {/* Lead-Lag Correlation Profile Bar Chart with CI & Evidence Modal */}
                    <LeadLagCorrelationSection
                      selectedTicker={selectedTicker}
                      onTickerChange={setSelectedTicker}
                      lagWindow={lagWindow}
                    />

                    {/* 60-Day Rolling Correlation Sub-Chart */}
                    <RollingCorrelationSection
                      ticker={selectedTicker}
                      windowDays={60}
                    />

                    {/* Live Market Intelligence row */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                      <div className="lg:col-span-2">
                        <AiScout ticker={selectedTicker} />
                      </div>
                      <div className="lg:col-span-1">
                        <SentimentGauge ticker={selectedTicker} />
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === "comparison" && (
                  <motion.div
                    key="tab-comparison"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                  >
                    <SideBySideComparisonView />
                  </motion.div>
                )}

                {activeTab === "heatmap" && (
                  <motion.div
                    key="tab-heatmap"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                  >
                    <CrossAssetHeatmapMatrix />
                  </motion.div>
                )}

                {activeTab === "vector-lab" && (
                  <motion.div
                    key="tab-vector-lab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                  >
                    <VectorSimilaritySearchLab />
                  </motion.div>
                )}

                {activeTab === "watchlist" && (
                  <motion.div
                    key="tab-watchlist"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <SectionHeader
                      icon={ListChecks}
                      title="Asset Universe Watchlist"
                      description="25+ US Mega-Caps, Indian Large-Caps, Crypto, Forex & Commodities with real-time flashing prices"
                      action={
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                          <Activity className="h-3.5 w-3.5 text-success" />
                          <span>Live Vector Stream</span>
                        </div>
                      }
                    />
                    <Watchlist
                      selectedTicker={selectedTicker}
                      onSelectTicker={(sym) => {
                        setSelectedTicker(sym);
                        setActiveTab("terminal");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    />
                  </motion.div>
                )}

                {activeTab === "analytics" && (
                  <motion.div
                    key="tab-analytics"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <SectionHeader
                      icon={LineChart}
                      title="Performance Analytics & Model Accuracy"
                      description="Backtest equity curves, monthly alpha contribution & model regime distributions"
                    />
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                      <div className="lg:col-span-2">
                        <PerformanceCard />
                      </div>
                      <div className="lg:col-span-1">
                        <StrategyDistribution />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="h-4" />
            </div>
          </main>

          <Footer />
        </div>
      </div>
    </div>
  );
}
