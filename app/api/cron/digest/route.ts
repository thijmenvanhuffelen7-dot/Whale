import { NextResponse } from "next/server";
import { amsterdamNow, buildDigest, type DigestRow } from "@/lib/digest";
import { getBot } from "@/lib/bot/instance";
import { isCronAuthorized } from "@/lib/http";
import { getAllSettings, setSetting } from "@/lib/settings";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendWithRetry } from "@/lib/telegram/send";
import { logWebhookFailure } from "@/lib/alerts/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Dagelijkse digest om 08:00 Europe/Amsterdam. Vercel Cron rekent in UTC,
 * dus de cron draait om 06:00 én 07:00 UTC en wij checken hier het lokale uur.
 * `?force=1` (met cron-secret) stuurt hem direct, voor testen.
 */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const force = new URL(req.url).searchParams.get("force") === "1";
  const now = amsterdamNow();
  const settings = await getAllSettings();

  if (!force) {
    if (now.hour !== 8) return NextResponse.json({ ok: true, skipped: `lokaal uur is ${now.hour}` });
    if (settings.last_digest_date === now.date) return NextResponse.json({ ok: true, skipped: "al verstuurd" });
  }

  const chatId = settings.chat_id ?? (process.env.TELEGRAM_CHAT_ID ? Number(process.env.TELEGRAM_CHAT_ID) : null);
  if (!chatId) return NextResponse.json({ error: "geen chat_id; gebruik /setup" }, { status: 400 });

  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data, error } = await supabaseAdmin()
    .from("public_events")
    .select("chain, tx_hash, type, token_address, token_symbol, amount, usd_value, wallet_address, wallet_label")
    .gte("created_at", since)
    .limit(5000);
  if (error) throw error;

  const html = buildDigest(
    (data ?? []) as DigestRow[],
    new Date(`${now.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
  );
  try {
    await sendWithRetry(getBot().api, chatId, html, { threadId: settings.topic_digest });
    // Pas na succesvol versturen markeren, zodat de 07:00-run het nog kan proberen.
    await setSetting("last_digest_date", now.date);
  } catch (err) {
    await logWebhookFailure("telegram", err, { kind: "digest" });
    return NextResponse.json({ error: "versturen mislukt" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, events: data?.length ?? 0 });
}
