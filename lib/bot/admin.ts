import type { Context } from "grammy";
import { adminIds } from "@/lib/env";

/**
 * Admin = Telegram-ID staat in TELEGRAM_ADMIN_IDS, óf de gebruiker is
 * creator/administrator van de groep waarin het commando wordt getypt.
 */
export async function isAdmin(ctx: Context): Promise<boolean> {
  const userId = ctx.from?.id;
  if (!userId) return false;
  if (adminIds().has(userId)) return true;

  const chat = ctx.chat;
  if (!chat || chat.type === "private" || chat.type === "channel") return false;

  try {
    const member = await ctx.api.getChatMember(chat.id, userId);
    return member.status === "creator" || member.status === "administrator";
  } catch {
    return false;
  }
}
