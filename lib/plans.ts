/** Prijzen en limieten op één plek. Stripe-price-IDs komen uit env. */
export const PLANS = {
  free: {
    name: "Free",
    feedDelayMinutes: 15,
    analysesPerDay: 3,
    maxWatchlist: 5,
    dmAlerts: false,
    features: [
      "Live feed with a 15-minute delay",
      "3 analyses per day",
      "Up to 5 wallets or tokens in your watchlist",
      "The public Telegram channel",
    ],
  },
  pro: {
    name: "Pro",
    feedDelayMinutes: 0,
    analysesPerDay: 50,
    maxWatchlist: 500,
    dmAlerts: true,
    priceMonthly: Number(process.env.NEXT_PUBLIC_PRICE_MONTHLY_EUR || 19),
    priceYearly: Number(process.env.NEXT_PUBLIC_PRICE_YEARLY_EUR || 149),
    features: [
      "Real-time feed, no delay",
      "50 analyses per day, including screenshots",
      "Follow unlimited wallets and tokens",
      "Your own alerts via Telegram DM, with your own threshold",
      "Access to the private Pro group",
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;
