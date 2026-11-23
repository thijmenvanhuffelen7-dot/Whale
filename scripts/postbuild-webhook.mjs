/**
 * Draait na `next build` op Vercel. Bij een productie-deploy koppelt dit
 * automatisch de Telegram-webhook aan het vaste productiedomein, met het
 * token en geheim uit de Vercel Environment Variables. Faalt nooit de build.
 */
const { VERCEL_ENV, VERCEL_PROJECT_PRODUCTION_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET } = process.env;

async function main() {
  if (VERCEL_ENV !== "production") return console.log("[webhook] geen productie-deploy, overgeslagen");
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_WEBHOOK_SECRET) {
    return console.log("[webhook] TELEGRAM_BOT_TOKEN of TELEGRAM_WEBHOOK_SECRET ontbreekt, overgeslagen");
  }
  if (!VERCEL_PROJECT_PRODUCTION_URL) return console.log("[webhook] productiedomein onbekend, overgeslagen");

  const api = (method, body) =>
    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    }).then((r) => r.json());

  const url = `https://${VERCEL_PROJECT_PRODUCTION_URL}/api/telegram`;
  const res = await api("setWebhook", {
    url,
    secret_token: TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ["message", "chat_member", "my_chat_member"],
  });
  console.log(`[webhook] setWebhook ${url}:`, res.ok ? "OK" : res.description);

  await api("setMyCommands", {
    commands: [
      { command: "analyze", description: "Facts and context on a coin" },
      { command: "wallets", description: "Tracked wallets" },
      { command: "help", description: "How it works and commands" },
    ],
  });
}

main().catch((e) => console.log("[webhook] mislukt (build gaat door):", e.message));
