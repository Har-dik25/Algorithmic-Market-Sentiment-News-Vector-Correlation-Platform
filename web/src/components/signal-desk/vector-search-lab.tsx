"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Sparkles,
  Database,
  ExternalLink,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  Layers,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { ASSETS } from "@/lib/signal-data";

interface VectorResult {
  id: string;
  headline: string;
  publisher: string;
  timestamp: string;
  asset: string;
  similarity: number;
  sentiment: "Bullish" | "Bearish" | "Neutral";
  sentimentScore: number;
  priceReaction: {
    direction: "UP" | "DOWN" | "FLAT";
    changePct: number;
    windowDays: number;
  };
  summary: string;
  vectorPreview: number[];
}

const PRESET_QUERIES = [
  "AI chip export restrictions to China",
  "Federal Reserve interest rate cuts expectation",
  "Bitcoin spot ETF institutional inflows",
  "Reliance Jio 5G expansion and Capex",
  "NVIDIA Blackwell ultra-scale GPU roadmap",
  "Crude oil OPEC supply disruption",
];

const MOCK_VECTOR_DOCS: VectorResult[] = [
  {
    id: "vec-101",
    headline: "NVIDIA reveals next-generation Blackwell architecture with 30x inference speedup",
    publisher: "Reuters Tech",
    timestamp: "2024-03-18 14:30 UTC",
    asset: "NVDA",
    similarity: 0.942,
    sentiment: "Bullish",
    sentimentScore: 0.89,
    priceReaction: { direction: "UP", changePct: 7.2, windowDays: 3 },
    summary: "Massive institutional demand and order backlog for accelerated computing datacenter clusters.",
    vectorPreview: [0.048, -0.112, 0.089, 0.231, -0.015, 0.174, 0.092, -0.043],
  },
  {
    id: "vec-102",
    headline: "Department of Commerce tightens advanced AI semiconductor shipment rules",
    publisher: "Bloomberg News",
    timestamp: "2024-04-04 11:15 UTC",
    asset: "NVDA",
    similarity: 0.887,
    sentiment: "Bearish",
    sentimentScore: -0.64,
    priceReaction: { direction: "DOWN", changePct: -3.8, windowDays: 2 },
    summary: "Export license curbs on specialized accelerator accelerators impacting Asian datacenter revenues.",
    vectorPreview: [-0.076, 0.142, -0.035, 0.198, -0.088, 0.042, -0.124, 0.061],
  },
  {
    id: "vec-103",
    headline: "AMD announces MI350 accelerator series to rival hyperscale cloud deployments",
    publisher: "Financial Times",
    timestamp: "2024-06-02 09:45 UTC",
    asset: "AMD",
    similarity: 0.854,
    sentiment: "Bullish",
    sentimentScore: 0.72,
    priceReaction: { direction: "UP", changePct: 4.6, windowDays: 3 },
    summary: "Open-source ROCm software stack improvements driving customer adoption across enterprise AI.",
    vectorPreview: [0.032, -0.091, 0.064, 0.176, -0.024, 0.145, 0.071, -0.038],
  },
  {
    id: "vec-104",
    headline: "Federal Open Market Committee signals potential 50 bps policy rate reduction",
    publisher: "Wall Street Journal",
    timestamp: "2024-09-18 18:00 UTC",
    asset: "^GSPC",
    similarity: 0.831,
    sentiment: "Bullish",
    sentimentScore: 0.68,
    priceReaction: { direction: "UP", changePct: 2.1, windowDays: 1 },
    summary: "Dovish inflation trajectory cements soft landing expectations across equities.",
    vectorPreview: [0.112, 0.045, -0.089, -0.022, 0.143, -0.055, 0.084, 0.103],
  },
  {
    id: "vec-105",
    headline: "SEC approves first round of spot Ethereum exchange-traded funds",
    publisher: "CoinDesk",
    timestamp: "2024-05-23 21:10 UTC",
    asset: "ETH-USD",
    similarity: 0.819,
    sentiment: "Bullish",
    sentimentScore: 0.84,
    priceReaction: { direction: "UP", changePct: 19.4, windowDays: 5 },
    summary: "Regulatory milestone opens door to institutional spot staking and portfolio allocation.",
    vectorPreview: [-0.021, -0.145, 0.187, 0.042, 0.091, -0.078, 0.165, 0.031],
  },
  {
    id: "vec-106",
    headline: "Reliance Industries announces massive green hydrogen and 5G AI cloud capex",
    publisher: "Economic Times",
    timestamp: "2024-08-29 10:30 UTC",
    asset: "RELIANCE.NS",
    similarity: 0.806,
    sentiment: "Bullish",
    sentimentScore: 0.77,
    priceReaction: { direction: "UP", changePct: 3.2, windowDays: 2 },
    summary: "Strategic partnerships with global cloud providers for sovereign AI infrastructure in India.",
    vectorPreview: [0.088, -0.062, 0.041, 0.134, -0.051, 0.098, 0.063, -0.019],
  },
];

export function VectorSimilaritySearchLab() {
  const [query, setQuery] = React.useState("AI chip export restrictions to China");
  const [selectedAsset, setSelectedAsset] = React.useState<string>("ALL");
  const [minSimilarity, setMinSimilarity] = React.useState(0.75);
  const [isSearching, setIsSearching] = React.useState(false);
  const [results, setResults] = React.useState<VectorResult[]>(MOCK_VECTOR_DOCS);

  const handleSearch = (searchQuery: string) => {
    setIsSearching(true);
    setTimeout(() => {
      let filtered = MOCK_VECTOR_DOCS.filter((doc) => {
        const matchesAsset = selectedAsset === "ALL" || doc.asset === selectedAsset;
        return matchesAsset;
      });
      // Simulate similarity variation based on query terms
      filtered = filtered
        .map((item) => {
          const words = searchQuery.toLowerCase().split(" ");
          const matchCount = words.filter((w) =>
            item.headline.toLowerCase().includes(w) || item.summary.toLowerCase().includes(w)
          ).length;
          const boost = Math.min(0.18, matchCount * 0.06);
          const sim = Math.min(0.98, Math.max(0.65, item.similarity + boost - 0.04));
          return { ...item, similarity: Number(sim.toFixed(3)) };
        })
        .filter((item) => item.similarity >= minSimilarity)
        .sort((a, b) => b.similarity - a.similarity);

      setResults(filtered);
      setIsSearching(false);
    }, 300);
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <Card className="p-5 bg-card/60 backdrop-blur-md border-border/60 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                384-d Vector Similarity Search Lab
              </h2>
              <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10 text-[10px] uppercase font-bold">
                Qdrant · all-MiniLM-L6-v2
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Execute natural language semantic vector queries against historical financial news embeddings to uncover price reaction patterns.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <Database className="h-4 w-4 text-emerald-400" />
            <span>Qdrant Collection: <strong className="text-foreground">market_news_vectors</strong></span>
          </div>
        </div>

        {/* Query Input Bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch(query)}
              placeholder="Search news events, catalysts, policy shifts..."
              className="pl-9 h-10 bg-background text-sm font-medium"
            />
          </div>

          <Button
            onClick={() => handleSearch(query)}
            disabled={isSearching}
            className="h-10 px-5 bg-primary text-primary-foreground font-semibold gap-2"
          >
            {isSearching ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Querying Qdrant…
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Vector Query
              </>
            )}
          </Button>
        </div>

        {/* Preset Query Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider mr-1">
            Try Query:
          </span>
          {PRESET_QUERIES.map((preset) => (
            <button
              key={preset}
              onClick={() => {
                setQuery(preset);
                handleSearch(preset);
              }}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border/40"
            >
              &quot;{preset}&quot;
            </button>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-border/40 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground font-semibold">Filter Asset:</span>
            <select
              value={selectedAsset}
              onChange={(e) => {
                setSelectedAsset(e.target.value);
                handleSearch(query);
              }}
              className="h-8 rounded-md border border-border bg-background px-2.5 text-xs font-semibold text-foreground"
            >
              <option value="ALL">All Tickers</option>
              {ASSETS.map((a) => (
                <option key={a.symbol} value={a.symbol}>
                  {a.symbol} ({a.name.slice(0, 16)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-semibold">Min Cosine Similarity:</span>
            <span className="font-mono text-primary font-bold">{minSimilarity.toFixed(2)}</span>
            <input
              type="range"
              min={0.6}
              max={0.95}
              step={0.05}
              value={minSimilarity}
              onChange={(e) => {
                setMinSimilarity(parseFloat(e.target.value));
                handleSearch(query);
              }}
              className="w-24 h-1.5 accent-primary cursor-pointer"
            />
          </div>

          <span className="text-muted-foreground font-mono text-[11px]">
            Returned: <strong className="text-foreground">{results.length}</strong> vector hits
          </span>
        </div>
      </Card>

      {/* Vector Search Results List */}
      <div className="space-y-3">
        {results.map((result, idx) => (
          <Card
            key={result.id}
            className="p-4 bg-card/60 backdrop-blur-md border-border/60 hover:border-primary/40 transition-colors"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <Badge className="bg-primary/20 text-primary border-primary/30 font-mono text-xs font-bold">
                    #{idx + 1} Cosine: {(result.similarity * 100).toFixed(1)}%
                  </Badge>
                  <span className="font-bold text-foreground font-mono text-sm bg-muted/50 px-2 py-0.5 rounded">
                    {result.asset}
                  </span>
                  <span className="text-[11px] text-muted-foreground">·</span>
                  <span className="text-[11px] font-medium text-muted-foreground">{result.publisher}</span>
                  <span className="text-[11px] text-muted-foreground">·</span>
                  <span className="text-[11px] text-muted-foreground font-mono">{result.timestamp}</span>
                </div>

                <h3 className="text-sm font-semibold text-foreground leading-snug">
                  {result.headline}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {result.summary}
                </p>

                {/* 384-d Vector Representation Snippet */}
                <div className="mt-2.5 flex items-center gap-2 text-[10px] font-mono text-muted-foreground/80 bg-background/50 px-2.5 py-1.5 rounded border border-border/40 overflow-x-auto">
                  <Layers className="h-3 w-3 text-primary shrink-0" />
                  <span className="shrink-0 text-foreground font-semibold">Embedding preview:</span>
                  <span className="truncate">
                    [{result.vectorPreview.map((v) => (v >= 0 ? `+${v.toFixed(3)}` : v.toFixed(3))).join(", ")}, ...]
                  </span>
                </div>
              </div>

              {/* Price Reaction & Sentiment Metrics Box */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold ${
                      result.sentiment === "Bullish"
                        ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                        : "text-rose-400 border-rose-500/30 bg-rose-500/10"
                    }`}
                  >
                    FinBERT: {result.sentiment} ({result.sentimentScore > 0 ? `+${result.sentimentScore}` : result.sentimentScore})
                  </Badge>
                </div>

                <div className="rounded-lg border border-border/50 bg-background/80 p-2.5 text-right font-mono min-w-[140px]">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-sans">
                    {result.priceReaction.windowDays}d Price Reaction
                  </span>
                  <div
                    className={`mt-0.5 text-sm font-bold flex items-center justify-end gap-1 ${
                      result.priceReaction.direction === "UP" ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {result.priceReaction.direction === "UP" ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {result.priceReaction.direction === "UP" ? `+${result.priceReaction.changePct}%` : `${result.priceReaction.changePct}%`}
                  </div>
                  <span className="text-[9px] text-muted-foreground block">
                    Post-news window
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
