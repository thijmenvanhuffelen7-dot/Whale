import { ogImage, OG_SIZE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "See what whales do, the moment they do it";

export default function Image() {
  return ogImage({
    kicker: "Ethereum & Solana",
    title: "See what whales do.",
    lines: ["Transfers, smart-money swaps and exchange flows.", "Live in Telegram and on the web."],
  });
}
