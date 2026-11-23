import { ogImage, OG_SIZE } from "@/lib/og";
import { getTokenInfo } from "@/lib/prices";
import { formatPct, formatPrice, formatUsd } from "@/lib/format";
import type { Chain } from "@/lib/chain/types";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Token activity";

export default async function Image({ params }: { params: Promise<{ chain: string; address: string }> }) {
  const { chain, address } = await params;
  const c = (chain === "eth" ? "eth" : "sol") as Chain;
  const t = await getTokenInfo(c, address);
  return ogImage({
    kicker: c === "eth" ? "Token on Ethereum" : "Token on Solana",
    title: t ? `$${t.symbol}` : "Token",
    lines: t
      ? [`${formatPrice(t.priceUsd)} · ${formatPct(t.priceChange24hPct)} 24h`, `24h volume ${formatUsd(t.volume24hUsd)}`]
      : ["Whale activity and price"],
  });
}
