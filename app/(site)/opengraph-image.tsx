import { ogImage, OG_SIZE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Whale Alert: zie wat whales doen, zodra ze het doen";

export default function Image() {
  return ogImage({
    kicker: "Ethereum & Solana",
    title: "Zie wat whales doen.",
    lines: ["Transfers, smart-money-swaps en exchange-flows.", "Live in Telegram en op het web."],
  });
}
