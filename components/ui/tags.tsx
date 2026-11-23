import { ArrowDownLeft, ArrowUpRight, Building2, MoveRight, ShoppingCart, BadgeDollarSign } from "lucide-react";
import { cn } from "@/lib/cn";
import type { FeedEvent } from "@/lib/data";

export function ChainTag({ chain, className }: { chain: "eth" | "sol"; className?: string }) {
  return (
    <span
      className={cn(
        "num inline-flex h-5 items-center rounded-[4px] border border-line-strong px-1.5 text-[11px] font-medium text-ink-2",
        className,
      )}
    >
      {chain === "eth" ? "ETH" : "SOL"}
    </span>
  );
}

export const TYPE_META: Record<
  FeedEvent["type"],
  { label: string; tone: "buy" | "sell" | "flow" | "neutral"; Icon: typeof ArrowUpRight }
> = {
  swap_buy: { label: "Buy", tone: "buy", Icon: ShoppingCart },
  swap_sell: { label: "Sell", tone: "sell", Icon: BadgeDollarSign },
  exchange_deposit: { label: "To exchange", tone: "flow", Icon: ArrowUpRight },
  exchange_withdrawal: { label: "From exchange", tone: "flow", Icon: ArrowDownLeft },
  transfer: { label: "Transfer", tone: "neutral", Icon: MoveRight },
};

const TONE: Record<string, string> = {
  buy: "text-buy",
  sell: "text-sell",
  flow: "text-flow",
  neutral: "text-ink-2",
};

export function TypeBadge({ type, className }: { type: FeedEvent["type"]; className?: string }) {
  const m = TYPE_META[type];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium", TONE[m.tone], className)}>
      <m.Icon aria-hidden className="size-3.5" strokeWidth={2} />
      {m.label}
    </span>
  );
}

export function toneClass(type: FeedEvent["type"]) {
  return TONE[TYPE_META[type].tone];
}

export function WalletTypeTag({ type }: { type: "smart_money" | "whale" | "exchange" | null }) {
  if (!type) return null;
  if (type === "exchange")
    return (
      <span className="inline-flex items-center gap-1 text-[12px] text-flow">
        <Building2 aria-hidden className="size-3" /> Exchange
      </span>
    );
  return (
    <span className={cn("text-[12px]", type === "smart_money" ? "text-amber" : "text-ink-3")}>
      {type === "smart_money" ? "Smart money" : "Whale"}
    </span>
  );
}
