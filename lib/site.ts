export const SITE = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "Orcawatch",
  // Op Vercel automatisch het vaste productiedomein als NEXT_PUBLIC_SITE_URL ontbreekt
  url:
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"),
  description:
    "Track what whales and smart money do on Ethereum and Solana: large transfers, buys, sells and exchange flows. Live in Telegram and on the web.",
  telegramPublic: process.env.NEXT_PUBLIC_TELEGRAM_PUBLIC_URL || "",
  botUsername: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "OrcawatchAlertsBot",
};
