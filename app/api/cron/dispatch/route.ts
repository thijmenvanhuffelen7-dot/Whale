import { NextResponse } from "next/server";
import { dispatchPending } from "@/lib/alerts/pipeline";
import { getBot } from "@/lib/bot/instance";
import { isCronAuthorized } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Verstuurt alerts die door de throttle zijn blijven liggen. Elke minuut
 * aanroepen (Vercel Pro cron of Supabase pg_cron, zie README).
 */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await dispatchPending(getBot().api);
  return NextResponse.json({ ok: true, ...result });
}
