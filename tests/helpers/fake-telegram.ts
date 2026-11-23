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
    if (method === "getChatMember") {
      const userId = (payload as { user_id: number }).user_id;
      result = { status: members[userId] ?? "member", user: { id: userId, is_bot: false, first_name: "x" } };
    }
    return { ok: true, result } as never;
  });
  return calls;
}
