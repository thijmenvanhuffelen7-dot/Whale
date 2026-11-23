/** Prijzen en limieten op één plek. Stripe-price-IDs komen uit env. */
export const PLANS = {
  free: {
    name: "Free",
    feedDelayMinutes: 15,
    analysesPerDay: 3,
    maxWatchlist: 5,
    dmAlerts: false,
    features: [
      "Live feed met 15 minuten vertraging",
      "3 analyses per dag",
      "Tot 5 wallets of tokens in je watchlist",
      "Het publieke Telegram-kanaal",
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
      "Realtime feed, geen vertraging",
      "50 analyses per dag, ook van screenshots",
      "Onbeperkt wallets en tokens volgen",
      "Eigen alerts via Telegram-DM, met je eigen drempel",
      "Toegang tot de privé Pro-groep",
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;
