import type { Bot } from "grammy";
import { requireEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAllSettings, setSetting } from "@/lib/settings";
import { createBot } from "@/lib/bot/index";
import { syncWalletChange } from "@/lib/providers";
import { grantProAccess } from "@/lib/pro-group";
import { runInBackground } from "@/lib/http";
import { startOfAmsterdamDay } from "@/lib/digest";
import { formatAnalysis } from "@/lib/analyse";
import { analyzeToken } from "@/lib/analyse/run";
import type { Chain } from "@/lib/chain/types";

let bot: Bot | null = null;

/** Analyse van één token voor Telegram. */
export async function runAnalysis(query: string): Promise<string | null> {
  const r = await analyzeToken(query, "telegram");
  return r ? formatAnalysis(r.token, r.stats, r.summary, r.news) : null;
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

    linkAccount: async (code, tg) => {
      const { data: prof } = await db().from("profiles").select("id, plan").eq("telegram_link_code", code).maybeSingle();
      if (!prof) return "invalid";
      const { data: other } = await db().from("profiles").select("id").eq("telegram_user_id", tg.id).maybeSingle();
      if (other && other.id !== prof.id) return "taken";
      await db()
        .from("profiles")
        // Nieuwe code, zodat de oude link niet nog eens werkt
        .update({ telegram_user_id: tg.id, telegram_username: tg.username ?? null, telegram_link_code: crypto.randomUUID().replace(/-/g, "").slice(0, 18) })
        .eq("id", prof.id);
      if (prof.plan === "pro") runInBackground(() => grantProAccess(getBot().api, prof.id));
      return prof.plan === "pro" ? "ok_pro" : "ok_free";
    },

    background: runInBackground,
  });
  return bot;
}
