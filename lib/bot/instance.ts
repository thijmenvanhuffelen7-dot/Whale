import type { Bot } from "grammy";
import { requireEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAllSettings, setSetting } from "@/lib/settings";
import { createBot } from "@/lib/bot/index";
import { syncWalletChange } from "@/lib/providers";
import { runInBackground } from "@/lib/http";
import { startOfAmsterdamDay } from "@/lib/digest";
import {
  aggregateStats,
  buildFactsPrompt,
  fetchNews,
  formatAnalysis,
  resolveToken,
  summarize,
} from "@/lib/analyse";
import type { Chain } from "@/lib/chain/types";

let bot: Bot | null = null;

/** Analyse van één token: marktdata + onze events + nieuws + AI-samenvatting. */
export async function runAnalysis(query: string): Promise<string | null> {
  const token = await resolveToken(query);
  if (!token) return null;

  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  const [{ data: rows }, news] = await Promise.all([
    supabaseAdmin()
      .from("public_events")
      .select("type, usd_value, wallet_label")
      .eq("chain", token.chain)
      .eq("token_address", token.address)
      .gte("created_at", since)
      .limit(500),
    fetchNews(token.symbol, token.name),
  ]);
  const stats = aggregateStats(rows ?? []);
  const summary = await summarize(buildFactsPrompt(token, stats, news));
  return formatAnalysis(token, stats, summary, news);
}

/** De echte bot, gekoppeld aan Supabase. Eén instance per serverless-instance. */
export function getBot(): Bot {
  if (bot) return bot;
  const db = () => supabaseAdmin();

  bot = createBot(requireEnv("TELEGRAM_BOT_TOKEN"), {
    listWallets: async () => {
      const { data, error } = await db()
        .from("wallets")
        .select("chain, address, label, type")
        .eq("active", true)
        .neq("type", "exchange")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },

    saveAlertTarget: async (chatId, topics, fallbackTopic) => {
      await setSetting("chat_id", chatId);
      await setSetting("topic_eth", topics?.eth ?? fallbackTopic ?? null);
      await setSetting("topic_sol", topics?.sol ?? fallbackTopic ?? null);
      await setSetting("topic_digest", topics?.digest ?? fallbackTopic ?? null);
    },

    addWallet: async (chain: Chain, address, label, type) => {
      const { data: existing } = await db()
        .from("wallets")
        .select("id, active")
        .eq("chain", chain)
        .eq("address", address)
        .maybeSingle();
      if (existing?.active) {
        await db().from("wallets").update({ label, type }).eq("id", existing.id);
        return { existed: true, synced: true };
      }
      const { error } = existing
        ? await db().from("wallets").update({ label, type, active: true }).eq("id", existing.id)
        : await db().from("wallets").insert({ chain, address, label, type });
      if (error) throw error;
      const sync = await syncWalletChange(chain, { add: address });
      return { existed: false, synced: sync.ok, reason: sync.ok ? undefined : sync.reason };
    },

    removeWallet: async (address) => {
      const candidates = [...new Set([address, address.toLowerCase()])];
      const { data, error } = await db()
        .from("wallets")
        .update({ active: false })
        .in("address", candidates)
        .eq("active", true)
        .neq("type", "exchange")
        .select("chain, address");
      if (error) throw error;
      for (const w of data ?? []) await syncWalletChange(w.chain, { remove: w.address });
      return data?.length ?? 0;
    },

    setThreshold: (usd) => setSetting("alert_threshold_usd", usd),
    setPaused: (paused) => setSetting("alerts_paused", paused),

    analyse: {
      usage: async (userId) => {
        const [settings, { count }] = await Promise.all([
          getAllSettings(),
          db()
            .from("analyse_log")
            .select("id", { count: "exact", head: true })
            .eq("telegram_user_id", userId)
            .gte("created_at", startOfAmsterdamDay().toISOString()),
        ]);
        return { used: count ?? 0, limit: Number(settings.analyse_daily_limit) };
      },
      run: runAnalysis,
      log: async (userId, query) => {
        await db().from("analyse_log").insert({ telegram_user_id: userId, query });
      },
    },

    background: runInBackground,
  });
  return bot;
}
