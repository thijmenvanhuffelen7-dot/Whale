import { webhookCallback } from "grammy";
import { requireEnv } from "@/lib/env";
import { getBot } from "@/lib/bot/instance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Telegram wacht max ~60s; houd handlers kort.
export const maxDuration = 30;

let handler: ((req: Request) => Promise<Response>) | null = null;

/**
 * Telegram webhook. grammY checkt de header
 * `X-Telegram-Bot-Api-Secret-Token` tegen TELEGRAM_WEBHOOK_SECRET en geeft
 * 401 als hij niet klopt.
 */
export async function POST(req: Request) {
  if (!handler) {
    handler = webhookCallback(getBot(), "std/http", {
      secretToken: requireEnv("TELEGRAM_WEBHOOK_SECRET"),
      onTimeout: "return",
      timeoutMilliseconds: 25_000,
    });
  }
  return handler(req);
}
