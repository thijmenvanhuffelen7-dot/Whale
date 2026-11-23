import { ogImage, OG_SIZE } from "@/lib/og";
import { getWallet } from "@/lib/data";
import { shortAddress } from "@/lib/messages";
import { formatUsd } from "@/lib/format";
import type { Chain } from "@/lib/chain/types";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Wallet op Whale Alert";

export default async function Image({ params }: { params: Promise<{ chain: string; address: string }> }) {
  const { chain, address } = await params;
  const c = (chain === "eth" ? "eth" : "sol") as Chain;
  const w = await getWallet(c, address);
  return ogImage({
    kicker: c === "eth" ? "Ethereum-wallet" : "Solana-wallet",
    title: w?.label ?? shortAddress(address),
    lines: w ? [`${formatUsd(w.volume_30d)} volume in 30 dagen`, `${w.trades_30d} gemelde transacties`] : [shortAddress(address, 8, 8)],
  });
}
