import { NextResponse } from "next/server";
import { SIGNALS, type SignalStatus, type Direction } from "@/lib/signal-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as SignalStatus | null;
  const direction = searchParams.get("direction") as Direction | null;
  const klass = searchParams.get("klass");
  const q = searchParams.get("q")?.toLowerCase();
  const limit = Number(searchParams.get("limit") ?? 50);

  let data = [...SIGNALS];
  if (status) data = data.filter((s) => s.status === status);
  if (direction) data = data.filter((s) => s.direction === direction);
  if (klass) data = data.filter((s) => s.klass === klass);
  if (q) data = data.filter((s) => s.asset.toLowerCase().includes(q) || s.assetName.toLowerCase().includes(q));

  data = data.slice(0, limit);

  await new Promise((r) => setTimeout(r, 120));

  return NextResponse.json({ signals: data, total: SIGNALS.length });
}
