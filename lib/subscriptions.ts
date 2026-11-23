import type Stripe from "stripe";
import type { Api } from "grammy";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isActiveStatus } from "@/lib/stripe";
import { grantProAccess, revokeProAccess } from "@/lib/pro-group";

/** Zet een Stripe-subscription om naar onze rij en het plan van de gebruiker. */
export function subscriptionRow(sub: Stripe.Subscription, userId: string) {
  const item = sub.items.data[0];
  const price = item?.price;
  return {
    id: sub.id,
    user_id: userId,
    status: sub.status,
    price_id: price?.id ?? null,
    interval: price?.recurring?.interval ?? null,
    amount_cents: price?.unit_amount ?? null,
    currency: price?.currency ?? null,
    current_period_end: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };
}

async function userIdFor(sub: Stripe.Subscription): Promise<string | null> {
  if (sub.metadata?.user_id) return sub.metadata.user_id;
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const { data } = await supabaseAdmin().from("profiles").select("id").eq("stripe_customer_id", customer).maybeSingle();
  return data?.id ?? null;
}

/**
 * Verwerk een subscription-wijziging: opslaan, plan bijwerken, en bij een
 * overgang free→pro de invite sturen, pro→free uit de groep halen.
 */
export async function syncSubscription(sub: Stripe.Subscription, api: Api | null) {
  const userId = await userIdFor(sub);
  if (!userId) throw new Error(`Geen gebruiker voor subscription ${sub.id}`);
  const db = supabaseAdmin();

  const { data: before } = await db.from("profiles").select("plan").eq("id", userId).single();
  await db.from("subscriptions").upsert(subscriptionRow(sub, userId));

  // Plan = pro als minstens één abonnement actief is.
  const { data: subs } = await db.from("subscriptions").select("status").eq("user_id", userId);
  const active = (subs ?? []).some((s) => isActiveStatus(s.status));
  const plan = active ? "pro" : "free";
  await db.from("profiles").update({ plan }).eq("id", userId);

  if (api && before?.plan !== plan) {
    if (plan === "pro") await grantProAccess(api, userId).catch((e) => console.error("[pro-group] grant", e));
    else await revokeProAccess(api, userId).catch((e) => console.error("[pro-group] revoke", e));
  }
  return { userId, plan };
}
