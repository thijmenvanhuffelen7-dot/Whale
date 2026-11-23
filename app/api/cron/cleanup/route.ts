import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const days = (n: number) => new Date(Date.now() - n * 86400_000).toISOString();

/** Dagelijks opschonen: raw payloads na 7 dagen weg, events na 180 dagen. */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = supabaseAdmin();

  const results = await Promise.all([
    db.from("events").update({ raw: null }).lt("created_at", days(7)).not("raw", "is", null),
    db.from("events").delete().lt("created_at", days(180)),
    // Gefilterde events (te klein, spam) hoeven we maar kort te bewaren.
    db.from("events").delete().lt("created_at", days(14)).not("filter_reason", "is", null),
    db.from("analyse_log").delete().lt("created_at", days(35)),
    db.from("webhook_failures").delete().lt("created_at", days(30)),
    db.from("alert_throttle").delete().lt("last_alert_at", days(1)),
  ]);
  const errors = results.filter((r) => r.error).map((r) => r.error!.message);
  return NextResponse.json({ ok: errors.length === 0, errors });
}
