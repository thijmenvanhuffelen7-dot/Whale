/**
 * Registreer de Telegram-webhook en het commandomenu.
 *
 *   npm run tg:webhook -- https://jouw-tunnel.trycloudflare.com
 *   npm run tg:webhook -- --delete      (terug naar polling)
 *   npm run tg:webhook -- --info
 */
import { config } from "dotenv";
import { Api } from "grammy";
import { BOT_COMMANDS } from "../lib/bot/index";

config({ path: ".env.local", override: true });

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN ontbreekt in .env.local");
  const api = new Api(token);
  const arg = process.argv[2];

  if (arg === "--info") {
    console.log(await api.getWebhookInfo());
    return;
  }
  if (arg === "--delete") {
    await api.deleteWebhook();
    console.log("Webhook verwijderd. Je kunt nu `npm run bot:dev` (polling) gebruiken.");
    return;
  }

  const base = (arg ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  if (!base.startsWith("https://")) {
    throw new Error("Geef een https-URL mee, bv. je ngrok/Cloudflare-tunnel of Vercel-domein.");
  }
  if (!secret) throw new Error("TELEGRAM_WEBHOOK_SECRET ontbreekt in .env.local");

  const url = `${base}/api/telegram`;
  await api.setWebhook(url, {
    secret_token: secret,
    allowed_updates: ["message", "chat_member", "my_chat_member"],
    drop_pending_updates: true,
  });
  await api.setMyCommands(BOT_COMMANDS);
  console.log(`✅ Webhook gezet op ${url}`);
  console.log(await api.getWebhookInfo());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
