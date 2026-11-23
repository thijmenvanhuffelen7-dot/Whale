import type { Bot } from "grammy";
import { requireEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { setSetting } from "@/lib/settings";
import { createBot } from "@/lib/bot/index";

let bot: Bot | null = null;

/** De echte bot, gekoppeld aan Supabase. Eén instance per serverless-instance. */
export function getBot(): Bot {
  if (!bot) {
    bot = createBot(requireEnv("TELEGRAM_BOT_TOKEN"), {
      listWallets: async () => {
        const { data, error } = await supabaseAdmin()
          .from("wallets")
          .select("chain, address, label, type")
          .eq("active", true)
          .neq("type", "exchange")
          .order("created_at", { ascending: true });
        if (error) throw error;
        return data ?? [];
      },
      saveAlertTarget: async (chatId, topicId) => {
        await setSetting("chat_id", chatId);
        // /setup in een topic → dat topic wordt (voorlopig) voor alle alerts gebruikt.
        // In fase 2 maakt de bot zelf de topics "🐋 ETH", "🐋 SOL", "📊 Digest" aan.
        if (topicId) {
          await setSetting("topic_eth", topicId);
          await setSetting("topic_sol", topicId);
          await setSetting("topic_digest", topicId);
        }
      },
    });
  }
  return bot;
}
