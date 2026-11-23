import { vi } from "vitest";
import type { BotDeps } from "@/lib/bot/index";
import type { Bot } from "grammy";
import type { BotFullInfo } from "grammy/types";

export const BOT_INFO: BotFullInfo = {
  id: 999999999,
  is_bot: true,
  first_name: "Whale Test",
  username: "WhaleTestBot",
  can_join_groups: true,
  can_read_all_group_messages: false,
  supports_inline_queries: false,
  can_connect_to_business: false,
  has_main_web_app: false,
  has_topics_enabled: false,
  allows_users_to_create_topics: false,
  can_manage_bots: false,
} as unknown as BotFullInfo;

export type ApiCall = { method: string; payload: Record<string, unknown> };

/**
 * Onderschept alle uitgaande Telegram API-calls, zodat tests geen netwerk
 * gebruiken. `members` bepaalt wat getChatMember teruggeeft.
 */
export function interceptApi(
  bot: Bot,
  members: Record<number, "creator" | "administrator" | "member"> = {},
): ApiCall[] {
  const calls: ApiCall[] = [];
  bot.api.config.use(async (_prev, method, payload) => {
    calls.push({ method, payload: payload as Record<string, unknown> });
    let result: unknown = true;
    if (method === "sendMessage") {
      result = { message_id: calls.length, date: 0, chat: { id: 0, type: "private" } };
    }
    if (method === "createForumTopic") {
      result = { message_thread_id: 100 + calls.length, name: (payload as { name: string }).name, icon_color: 0 };
    }
    if (method === "editMessageText") {
      result = { message_id: 1, date: 0, chat: { id: 0, type: "private" } };
    }
    if (method === "getChatMember") {
      const userId = (payload as { user_id: number }).user_id;
      result = { status: members[userId] ?? "member", user: { id: userId, is_bot: false, first_name: "x" } };
    }
    return { ok: true, result } as never;
  });
  return calls;
}


/** Nep-deps voor createBot; overschrijf wat je per test nodig hebt. */
export function makeDeps(overrides: Partial<BotDeps> = {}): BotDeps {
  return {
    listWallets: vi.fn(async () => []),
    saveAlertTarget: vi.fn(async () => {}),
    addWallet: vi.fn(async () => ({ existed: false, synced: true })),
    removeWallet: vi.fn(async () => 1),
    setThreshold: vi.fn(async () => {}),
    setPaused: vi.fn(async () => {}),
    analyse: {
      usage: vi.fn(async () => ({ used: 0, limit: 5 })),
      run: vi.fn(async () => "<b>analyse</b>"),
      log: vi.fn(async () => {}),
    },
    background: (task) => {
      void task();
    },
    ...overrides,
  };
}

/** Bouw een Telegram-update met een commando. */
export function commandUpdate(
  text: string,
  opts: { userId?: number; chatId?: number; forum?: boolean; updateId?: number } = {},
) {
  const cmd = text.split(" ")[0];
  return {
    update_id: opts.updateId ?? Math.floor(Math.random() * 1e9),
    message: {
      message_id: 50,
      from: { id: opts.userId ?? 222222222, is_bot: false, first_name: "Lid" },
      chat: {
        id: opts.chatId ?? -1001234567890,
        title: "Whale Test",
        type: "supergroup",
        ...(opts.forum ? { is_forum: true } : {}),
      },
      date: 1763884800,
      text,
      entities: [{ offset: 0, length: cmd.length, type: "bot_command" }],
    },
  };
}
