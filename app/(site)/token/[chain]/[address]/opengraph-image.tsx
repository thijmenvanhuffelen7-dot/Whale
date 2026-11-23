import { ogImage, OG_SIZE } from "@/lib/og";
import { getTokenInfo } from "@/lib/prices";
import { formatPct, formatPrice, formatUsd } from "@/lib/format";
import type { Chain } from "@/lib/chain/types";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Token op Whale Alert";

export default async function Image({ params }: { params: Promise<{ chain: string; address: string }> }) {
  const { chain, address } = await params;
  const c = (chain === "eth" ? "eth" : "sol") as Chain;
  const t = await getTokenInfo(c, address);
  return ogImage({
    kicker: c === "eth" ? "Token op Ethereum" : "Token op Solana",
    title: t ? `$${t.symbol}` : "Token",
    lines: t
      ? [`${formatPrice(t.priceUsd)} · ${formatPct(t.priceChange24hPct)} 24u`, `Volume 24u ${formatUsd(t.volume24hUsd)}`]
      : ["Whale-activiteit en prijs"],
  });
}
