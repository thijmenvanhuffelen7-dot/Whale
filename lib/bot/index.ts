import { Bot, type Context } from "grammy";
import type { BotFullInfo } from "grammy/types";
import { type Chain, isEthAddress, isSolAddress, normAddr } from "@/lib/chain/types";
import { formatUsd } from "@/lib/format";
import { escapeHtml, shortAddress, t } from "@/lib/messages";
import { isAdmin } from "@/lib/bot/admin";

export type Topics = { eth: number; sol: number; digest: number };

export type BotDeps = {
  listWallets: () => Promise<{ chain: string; address: string; label: string; type: string }[]>;
  /** chat_id + topics opslaan voor /setup. Zonder topics → hoofdchat of `fallbackTopic`. */
  saveAlertTarget: (chatId: number, topics: Topics | null, fallbackTopic?: number) => Promise<void>;
  addWallet: (
    chain: Chain,
    address: string,
    label: string,
    type: "smart_money" | "whale",
  ) => Promise<{ existed: boolean; synced: boolean; reason?: string }>;
  removeWallet: (address: string) => Promise<number>;
  setThreshold: (usd: number) => Promise<void>;
  setPaused: (paused: boolean) => Promise<void>;
  analyse: {
    /** Hoeveel analyses deze gebruiker vandaag deed, en de limiet. */
    usage: (userId: number) => Promise<{ used: number; limit: number }>;
    run: (query: string) => Promise<string | null>;
    log: (userId: number, query: string) => Promise<void>;
  };
  /** /start <code>: Telegram aan een website-account koppelen. */
  linkAccount?: (
    code: string,
    tg: { id: number; username?: string },
  ) => Promise<"ok_pro" | "ok_free" | "invalid" | "taken">;
  /** Werk doen nadat de webhook al geantwoord heeft (Vercel `after`). */
  background: (task: () => Promise<unknown>) => void;
};

const WALLETS_LIMIT = 30;

export function createBot(token: string, deps: BotDeps, opts: { botInfo?: BotFullInfo } = {}): Bot {
  const bot = new Bot(token, { botInfo: opts.botInfo });
  const m = t();

  const threadOf = (ctx: Context) => (ctx.msg?.is_topic_message ? ctx.msg.message_thread_id : undefined);
  const reply = (ctx: Context, text: string) =>
    ctx.reply(text, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      message_thread_id: threadOf(ctx),
    });
  const args = (ctx: Context) => (typeof ctx.match === "string" ? ctx.match.trim().split(/\s+/).filter(Boolean) : []);

  /** Wrapper: alleen admins. */
  const adminOnly =
    (fn: (ctx: Context) => Promise<unknown>) =>
    async (ctx: Context) => {
      if (!(await isAdmin(ctx))) return reply(ctx, m.notAdmin);
      return fn(ctx);
    };

  bot.command("start", async (ctx) => {
    const code = (typeof ctx.match === "string" ? ctx.match : "").trim();
    // Deep link vanaf de site: t.me/<bot>?start=<code>, alleen in een privéchat
    if (code && ctx.chat?.type === "private" && ctx.from && deps.linkAccount) {
      if (!/^[a-zA-Z0-9]{8,64}$/.test(code)) return reply(ctx, m.linkInvalid);
      const res = await deps.linkAccount(code, { id: ctx.from.id, username: ctx.from.username });
      if (res === "invalid") return reply(ctx, m.linkInvalid);
      if (res === "taken") return reply(ctx, m.linkTaken);
      return reply(ctx, m.linked(res === "ok_pro"));
    }
    return reply(ctx, m.start + "\n\n" + m.help);
  });

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

  bot.command(
    "setup",
    adminOnly(async (ctx) => {
      const chat = ctx.chat!;
      const isForum = "is_forum" in chat && chat.is_forum === true;
      if (!isForum) {
        await deps.saveAlertTarget(chat.id, null);
        return reply(ctx, m.setupDone(chat.id, m.setupNoTopics));
      }
      try {
        const [eth, sol, digest] = await Promise.all([
          ctx.api.createForumTopic(chat.id, m.topicNames.eth),
          ctx.api.createForumTopic(chat.id, m.topicNames.sol),
          ctx.api.createForumTopic(chat.id, m.topicNames.digest),
        ]);
        await deps.saveAlertTarget(chat.id, {
          eth: eth.message_thread_id,
          sol: sol.message_thread_id,
          digest: digest.message_thread_id,
        });
        return reply(ctx, m.setupDone(chat.id, m.setupTopicsCreated));
      } catch {
        await deps.saveAlertTarget(chat.id, null, threadOf(ctx));
        return reply(ctx, m.setupDone(chat.id, m.setupTopicsFailed));
      }
    }),
  );

  bot.command(
    "addwallet",
    adminOnly(async (ctx) => {
      const [chainArg, address, ...rest] = args(ctx);
      if (!chainArg || !address || !rest.length) return reply(ctx, m.addWalletUsage);
      const chain = chainArg.toLowerCase();
      if (chain !== "eth" && chain !== "sol") return reply(ctx, m.invalidChain);
      const valid = chain === "eth" ? isEthAddress(address) : isSolAddress(address);
      if (!valid) return reply(ctx, m.invalidAddress(chain));

      let type: "smart_money" | "whale" = "whale";
      const last = rest[rest.length - 1].toLowerCase();
      if (rest.length > 1 && (last === "smart_money" || last === "whale")) {
        type = last;
        rest.pop();
      }
      const label = rest.join(" ").slice(0, 60);
      if (!label) return reply(ctx, m.addWalletUsage);

      const res = await deps.addWallet(chain, normAddr(chain, address), label, type);
      if (res.existed) return reply(ctx, m.walletExists);
      return reply(ctx, m.walletAdded(escapeHtml(label), chain, res.synced, res.reason && escapeHtml(res.reason)));
    }),
  );

  bot.command(
    "removewallet",
    adminOnly(async (ctx) => {
      const [address] = args(ctx);
      if (!address) return reply(ctx, m.removeWalletUsage);
      return reply(ctx, m.walletRemoved(await deps.removeWallet(address)));
    }),
  );

  bot.command(
    "threshold",
    adminOnly(async (ctx) => {
      const raw = (args(ctx)[0] ?? "").replace(/[$_.,]/g, "").replace(/k$/i, "000");
      const usd = Number(raw);
      if (!Number.isFinite(usd) || usd < 1000 || usd > 1e10) return reply(ctx, m.thresholdUsage);
      await deps.setThreshold(usd);
      return reply(ctx, m.thresholdSet(formatUsd(usd)));
    }),
  );

  bot.command(
    "pause",
    adminOnly(async (ctx) => {
      await deps.setPaused(true);
      return reply(ctx, m.paused);
    }),
  );
  bot.command(
    "resume",
    adminOnly(async (ctx) => {
      await deps.setPaused(false);
      return reply(ctx, m.resumed);
    }),
  );

  bot.command("analyse", async (ctx) => {
    const query = (typeof ctx.match === "string" ? ctx.match : "").trim().slice(0, 64);
    if (!query) return reply(ctx, m.analyseUsage);
    const userId = ctx.from?.id;
    if (!userId) return;

    if (!(await isAdmin(ctx))) {
      const { used, limit } = await deps.analyse.usage(userId);
      if (used >= limit) return reply(ctx, m.analyseLimit(limit));
    }

    const q = escapeHtml(query);
    const busy = await reply(ctx, m.analyseBusy(q));
    // Data ophalen + AI duurt 5-20s: na het webhook-antwoord afmaken.
    deps.background(async () => {
      let html: string | null = null;
      try {
        html = await deps.analyse.run(query);
      } catch (e) {
        console.error("[analyse]", e);
        await ctx.api.editMessageText(busy.chat.id, busy.message_id, m.error).catch(() => {});
        return;
      }
      if (html) await deps.analyse.log(userId, query);
      await ctx.api
        .editMessageText(busy.chat.id, busy.message_id, html ?? m.analyseNotFound(q), {
          parse_mode: "HTML",
          link_preview_options: { is_disabled: true },
        })
        .catch((e) => console.error("[analyse] edit mislukt", e));
    });
  });

  bot.catch((err) => {
    console.error("[bot] fout bij update", err.ctx.update.update_id, err.error);
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
