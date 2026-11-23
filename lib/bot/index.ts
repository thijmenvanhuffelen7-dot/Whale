import { Bot, type Context } from "grammy";
import type { BotFullInfo } from "grammy/types";
import { escapeHtml, shortAddress, t } from "@/lib/messages";
import { isAdmin } from "@/lib/bot/admin";

export type BotDeps = {
  /** Wallets ophalen voor /wallets. Injecteerbaar voor tests. */
  listWallets: () => Promise<
    { chain: string; address: string; label: string; type: string }[]
  >;
  /** chat_id + topic opslaan voor /setup. */
  saveAlertTarget: (chatId: number, topicId: number | undefined) => Promise<void>;
};

const WALLETS_LIMIT = 30;

export function createBot(
  token: string,
  deps: BotDeps,
  opts: { botInfo?: BotFullInfo } = {},
): Bot {
  const bot = new Bot(token, { botInfo: opts.botInfo });
  const m = t();

  const reply = (ctx: Context, text: string) =>
    ctx.reply(text, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      // In forum-groepen antwoorden in hetzelfde topic.
      message_thread_id: ctx.msg?.is_topic_message ? ctx.msg.message_thread_id : undefined,
    });

  bot.command("start", (ctx) => reply(ctx, m.start + "\n\n" + m.help));

  bot.command("help", async (ctx) => {
    const admin = await isAdmin(ctx);
    return reply(ctx, admin ? m.help + "\n" + m.helpAdmin : m.help);
  });

  bot.command("wallets", async (ctx) => {
    const wallets = await deps.listWallets();
    if (wallets.length === 0) return reply(ctx, m.walletsEmpty);
    const lines = wallets.slice(0, WALLETS_LIMIT).map((w) => {
      const tag = w.type === "smart_money" ? "🧠" : "🐋";
      return `${tag} <b>${escapeHtml(w.label)}</b> · ${w.chain.toUpperCase()} · <code>${escapeHtml(shortAddress(w.address))}</code>`;
    });
    if (wallets.length > WALLETS_LIMIT) lines.push(m.walletsMore(wallets.length - WALLETS_LIMIT));
    return reply(ctx, [m.walletsHeader(wallets.length), "", ...lines].join("\n"));
  });

  // Admin: koppel deze groep (en dit topic) als alert-bestemming.
  bot.command("setup", async (ctx) => {
    if (!(await isAdmin(ctx))) return reply(ctx, m.notAdmin);
    const topicId = ctx.msg.is_topic_message ? ctx.msg.message_thread_id : undefined;
    await deps.saveAlertTarget(ctx.chat.id, topicId);
    return reply(ctx, m.setupDone(ctx.chat.id, topicId));
  });

  // Placeholders voor latere fases, zodat ze niet stil falen.
  for (const cmd of ["addwallet", "removewallet", "threshold", "pause", "resume"]) {
    bot.command(cmd, async (ctx) => {
      if (!(await isAdmin(ctx))) return reply(ctx, m.notAdmin);
      return reply(ctx, m.comingSoon);
    });
  }
  bot.command("analyse", (ctx) => reply(ctx, m.comingSoon));

  bot.catch((err) => {
    console.error("[bot] fout bij update", err.ctx.update.update_id, err.error);
    // Probeer de gebruiker iets terug te geven; negeer als ook dat faalt.
    err.ctx.reply(m.error).catch(() => {});
  });

  return bot;
}

/** Commando's zoals ze in het Telegram-menu verschijnen. */
export const BOT_COMMANDS = [
  { command: "analyse", description: "Feiten en context over een coin" },
  { command: "wallets", description: "Gevolgde wallets" },
  { command: "help", description: "Uitleg en commando's" },
];
