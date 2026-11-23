import { NextResponse } from "next/server";
import { Api } from "grammy";
import { safeEqual } from "@/lib/http";
import { BOT_COMMANDS } from "@/lib/bot/index";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Eenmalige setup zonder terminal: open in je browser
 *   https://<jouw-domein>/api/setup?key=<TELEGRAM_WEBHOOK_SECRET>
 * Dan koppelt de site zelf de Telegram-webhook (met het token uit Vercel)
 * en zet het commandomenu. Het token komt nooit in een URL.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token || !secret) {
    return NextResponse.json(
      { ok: false, problem: "TELEGRAM_BOT_TOKEN of TELEGRAM_WEBHOOK_SECRET ontbreekt in Vercel (Settings → Environment Variables). Voeg toe en redeploy." },
      { status: 500 },
    );
  }
  if (!safeEqual(url.searchParams.get("key"), secret)) {
    return NextResponse.json({ ok: false, problem: "Verkeerde of ontbrekende ?key=. Gebruik je TELEGRAM_WEBHOOK_SECRET." }, { status: 401 });
  }

  // Gebruik het adres waarmee je deze pagina opende (je vaste Vercel-domein).
  const host = req.headers.get("x-forwarded-host") ?? url.host;
  const webhookUrl = `https://${host}/api/telegram`;

  const api = new Api(token);
  try {
    const me = await api.getMe();
    await api.setWebhook(webhookUrl, {
      secret_token: secret,
      allowed_updates: ["message", "chat_member", "my_chat_member"],
      drop_pending_updates: true,
    });
    await api.setMyCommands(BOT_COMMANDS);
    const info = await api.getWebhookInfo();
    return NextResponse.json({
      ok: true,
      message: `Gelukt! Stuur nu /help naar @${me.username} in Telegram.`,
      bot: `@${me.username}`,
      webhook: info.url,
      pending_updates: info.pending_update_count,
      last_error: info.last_error_message ?? null,
      note: host.includes("-git-") || /-[a-z0-9]{9}-/.test(host)
        ? "Let op: dit lijkt een tijdelijk deploy-adres. Open deze pagina liever via je vaste domein (Vercel → Settings → Domains)."
        : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, problem: err instanceof Error ? err.message : String(err), hint: "401 Unauthorized = het token klopt niet. Kopieer het opnieuw van @BotFather." },
      { status: 502 },
    );
  }
}
