import Stripe from "stripe";

let client: Stripe | null = null;

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY ontbreekt");
  client ??= new Stripe(key);
  return client;
}

export function priceFor(interval: "month" | "year"): string | undefined {
  return interval === "year" ? process.env.STRIPE_PRICE_PRO_YEARLY : process.env.STRIPE_PRICE_PRO_MONTHLY;
}

/** Een abonnement geeft Pro zolang het actief is (of in de proefperiode, of net mislukt maar nog in de grace-periode). */
export function isActiveStatus(status: string): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}
