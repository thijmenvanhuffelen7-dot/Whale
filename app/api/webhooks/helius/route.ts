import { NextResponse } from "next/server";
import { parseHelius } from "@/lib/chain/helius";
import { dispatchPending, handleChainWebhook, logWebhookFailure } from "@/lib/alerts/pipeline";
import { getBot } from "@/lib/bot/instance";
import { dispatchUserAlerts } from "@/lib/alerts/user-alerts";
import { runInBackground, safeEqual } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const expected = process.env.HELIUS_WEBHOOK_AUTH;
  if (!expected || !safeEqual(req.headers.get("authorization"), expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  try {
    const result = await handleChainWebhook("sol", (tracked, watched) => parseHelius(body, tracked, watched));
    if (result.inserted > 0) {
      runInBackground(async () => {
        const api = getBot().api;
        if (result.alertable > 0) await dispatchPending(api);
        await dispatchUserAlerts(api);
      });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[helius] verwerken mislukt", err);
    await logWebhookFailure("helius", err, body);
    // 500 → Helius probeert het later opnieuw; dedupe voorkomt dubbele events.
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
