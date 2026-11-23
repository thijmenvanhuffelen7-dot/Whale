import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isActiveStatus, stripe } from "@/lib/stripe";
import { syncSubscription } from "@/lib/subscriptions";
import { getBot } from "@/lib/bot/instance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Dagelijks vangnet naast de Stripe-webhooks: is een webhook gemist, dan
 * zetten we het plan hier alsnog goed (en halen we verlopen leden uit de groep).
 */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ ok: true, skipped: "geen Stripe" });
  const db = supabaseAdmin();
  const api = getBot().api;
  const { data: rows } = await db.from("subscriptions").select("id, status").limit(1000);
  let fixed = 0;
  for (const r of rows ?? []) {
    try {
      const sub = await stripe().subscriptions.retrieve(r.id);
      if (sub.status !== r.status || !isActiveStatus(sub.status)) {
        await syncSubscription(sub, api);
        fixed++;
      }
    } catch (e) {
      console.error("[cron/subscriptions]", r.id, e);
    }
  }
  return NextResponse.json({ ok: true, checked: rows?.length ?? 0, fixed });
}
