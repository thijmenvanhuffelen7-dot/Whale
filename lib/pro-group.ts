import type { Api } from "grammy";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { escapeHtml } from "@/lib/messages";
import { SITE } from "@/lib/site";

/**
 * Toegang tot de privé Pro-groep. De bot moet admin zijn in die groep met het
 * recht "Gebruikers uitnodigen" en "Gebruikers verbannen".
 */
export async function grantProAccess(api: Api, userId: string): Promise<boolean> {
  const groupId = process.env.TELEGRAM_PRO_GROUP_ID;
  const db = supabaseAdmin();
  const { data: p } = await db.from("profiles").select("telegram_user_id").eq("id", userId).single();
  if (!groupId || !p?.telegram_user_id) return false;

  // Persoonlijke link: 1 gebruik, 24 uur geldig.
  const link = await api.createChatInviteLink(groupId, {
    name: `pro-${userId.slice(0, 8)}`,
    member_limit: 1,
    expire_date: Math.floor(Date.now() / 1000) + 24 * 3600,
  });
  // Eerder verwijderd? Dan eerst de ban opheffen, anders werkt de link niet.
  await api.unbanChatMember(groupId, p.telegram_user_id, { only_if_banned: true }).catch(() => {});
  await api.sendMessage(
    p.telegram_user_id,
    [
      "🐋 <b>Welkom bij Pro!</b>",
      "",
      `Je persoonlijke invite-link voor de Pro-groep (24 uur geldig, werkt één keer):`,
      escapeHtml(link.invite_link),
      "",
      "Alerts voor je watchlist komen vanaf nu ook hier in je DM.",
    ].join("\n"),
    { parse_mode: "HTML", link_preview_options: { is_disabled: true } },
  );
  await db.from("subscriptions").update({ pro_group_member: true }).eq("user_id", userId);
  return true;
}

/** Abonnement verlopen: uit de Pro-groep halen en een DM sturen met een link om te verlengen. */
export async function revokeProAccess(api: Api, userId: string): Promise<void> {
  const groupId = process.env.TELEGRAM_PRO_GROUP_ID;
  const db = supabaseAdmin();
  const { data: p } = await db.from("profiles").select("telegram_user_id").eq("id", userId).single();
  await db.from("subscriptions").update({ pro_group_member: false }).eq("user_id", userId);
  if (!p?.telegram_user_id) return;
  if (groupId) {
    // ban + unban = verwijderen zonder permanente ban, zodat hij later terug kan.
    await api.banChatMember(groupId, p.telegram_user_id).catch(() => {});
    await api.unbanChatMember(groupId, p.telegram_user_id, { only_if_banned: true }).catch(() => {});
  }
  await api
    .sendMessage(
      p.telegram_user_id,
      `Je Pro-abonnement is gestopt, dus je bent uit de Pro-groep gehaald.\n\nWil je verder? Verlengen kan hier: ${SITE.url}/pricing`,
      { link_preview_options: { is_disabled: true } },
    )
    .catch(() => {});
}
