export const SITE = {
  name: "Whale Alert",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  description:
    "Volg wat whales en smart money doen op Ethereum en Solana: grote transfers, kopen, verkopen en exchange-flows. Live in Telegram en op het web.",
  telegramPublic: process.env.NEXT_PUBLIC_TELEGRAM_PUBLIC_URL || "",
  botUsername: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "",
};
