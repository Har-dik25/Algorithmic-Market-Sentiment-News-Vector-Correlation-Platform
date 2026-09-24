import { NextResponse } from "next/server";
import { KPIS, MONTHLY_PERF, EQUITY_CURVE, SENTIMENT } from "@/lib/signal-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch("http://127.0.0.1:8000/health", { cache: "no-store" });
    if (res.ok) {
      const health = await res.json();
      const liveKpis = [...KPIS];
      if (health.qdrant_vectors_count !== undefined) {
        liveKpis[0] = { ...liveKpis[0], value: health.qdrant_vectors_count.toLocaleString(), deltaLabel: "Indexed Vectors" };
      }
      if (health.price_records_count !== undefined) {
        liveKpis[1] = { ...liveKpis[1], value: health.price_records_count.toLocaleString(), deltaLabel: "OHLCV Candles" };
      }
      return NextResponse.json({
        kpis: liveKpis,
        monthly: MONTHLY_PERF,
        equity: EQUITY_CURVE,
        sentiment: SENTIMENT,
        backendHealth: health,
      });
    }
  } catch (_err) {
    // Fallback to static mock stats if FastAPI backend is starting
  }

  return NextResponse.json({
    kpis: KPIS,
    monthly: MONTHLY_PERF,
    equity: EQUITY_CURVE,
    sentiment: SENTIMENT,
  });
}
