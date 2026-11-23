import { NextResponse } from "next/server";
import { parseAlchemy, verifyAlchemySignature } from "@/lib/chain/alchemy";
import { dispatchPending, handleChainWebhook, logWebhookFailure } from "@/lib/alerts/pipeline";
import { getBot } from "@/lib/bot/instance";
import { runInBackground } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const key = process.env.ALCHEMY_WEBHOOK_SIGNING_KEY;
  // Signature wordt over de RAW body berekend: eerst text, dan pas JSON.parse.
  const raw = await req.text();
  if (!key || !verifyAlchemySignature(raw, req.headers.get("x-alchemy-signature"), key)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  try {
    const result = await handleChainWebhook("eth", (tracked, watched) => parseAlchemy(body, tracked, watched));
    if (result.alertable > 0) runInBackground(() => dispatchPending(getBot().api));
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[alchemy] verwerken mislukt", err);
    await logWebhookFailure("alchemy", err, body);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
