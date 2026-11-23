/**
 * Lokaal testen zonder tunnel: draait dezelfde bot in long-polling mode.
 * Let op: polling werkt alleen als er GEEN webhook staat (script verwijdert hem).
 *
 *   npm run bot:dev
 */
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  // Dynamisch importeren zodat .env.local eerst geladen is.
  const { getBot } = await import("../lib/bot/instance");
  const { BOT_COMMANDS } = await import("../lib/bot/index");
  const bot = getBot();
  await bot.api.deleteWebhook();
  await bot.api.setMyCommands(BOT_COMMANDS);
  console.log("🤖 Bot draait in polling-mode. Ctrl+C om te stoppen.");
  await bot.start({
    allowed_updates: ["message", "chat_member", "my_chat_member"],
    onStart: (me) => console.log(`Ingelogd als @${me.username}`),
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
