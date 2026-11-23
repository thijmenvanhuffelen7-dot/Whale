import { NextResponse } from "next/server";
import { dispatchPending } from "@/lib/alerts/pipeline";
import { dispatchUserAlerts, postPublicDelayed } from "@/lib/alerts/user-alerts";
import { getBot } from "@/lib/bot/instance";
import { isCronAuthorized } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Elke minuut (Supabase pg_cron of Vercel Pro cron):
 * - groepsalerts die door de throttle bleven liggen
 * - DM-alerts voor watchlists
 * - het vertraagde gratis kanaal
 */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const api = getBot().api;
  const group = await dispatchPending(api);
  const [users, pub] = await Promise.all([dispatchUserAlerts(api), postPublicDelayed(api)]);
  return NextResponse.json({ ok: true, group, users, public: pub });
}
