import { NextResponse } from "next/server";
import { ASSETS } from "@/lib/signal-data";

export const dynamic = "force-dynamic";

export async function GET() {
  await new Promise((r) => setTimeout(r, 100));
  return NextResponse.json({ assets: ASSETS });
}
