import type { Chain, EventType } from "@/lib/chain/types";
import { compact, formatUsd } from "@/lib/format";
import { escapeHtml, shortAddress } from "@/lib/messages";

export type AlertEvent = {
  chain: Chain;
  txHash: string;
  type: EventType;
  tokenAddress: string;
  tokenSymbol: string | null;
  amount: number;
  usdValue: number | null;
  counterparty: string | null;
  counterpartyLabel: string | null;
  quoteSymbol: string | null;
  quoteAmount: number | null;
};

export type AlertWallet = {
  address: string;
  label: string | null;
  type: "smart_money" | "whale" | "exchange" | null;
};

const CHAIN_NAME: Record<Chain, string> = { eth: "ETH", sol: "SOL" };

export function explorerTxUrl(chain: Chain, tx: string) {
  return chain === "sol" ? `https://solscan.io/tx/${tx}` : `https://etherscan.io/tx/${tx}`;
}
export function explorerName(chain: Chain) {
  return chain === "sol" ? "Solscan" : "Etherscan";
}
export function dexscreenerUrl(chain: Chain, token: string) {
  return `https://dexscreener.com/${chain === "sol" ? "solana" : "ethereum"}/${token}`;
}

function sym(s: string | null) {
  return "$" + escapeHtml(s ?? "TOKEN");
}

function headline(wallet: AlertWallet, events: AlertEvent[]): string {
  const chain = CHAIN_NAME[events[0].chain];
  const who = wallet.type === "smart_money" ? "Smart money" : "Whale";
  const icon = wallet.type === "smart_money" ? "🧠" : "🐋";
  const types = new Set(events.map((e) => e.type));
  if (types.size === 1) {
    const e = events[0];
    switch (e.type) {
      case "swap_buy":
        return `${icon} ${who} koopt — ${chain}`;
      case "swap_sell":
        return `${icon} ${who} verkoopt — ${chain}`;
      case "exchange_deposit":
        return `🏦 Storting naar ${escapeHtml(e.counterpartyLabel ?? "exchange")} — ${chain}`;
      case "exchange_withdrawal":
        return `🏦 Opname van ${escapeHtml(e.counterpartyLabel ?? "exchange")} — ${chain}`;
      case "transfer":
        return `🐋 Whale-transfer — ${chain}`;
    }
  }
  return `${icon} ${who}: ${events.length} transacties — ${chain}`;
}

function line(e: AlertEvent): string {
  const amt = `${compact(e.amount)} ${sym(e.tokenSymbol)} (~${formatUsd(e.usdValue)})`;
  const quote =
    e.quoteSymbol && e.quoteAmount ? ` met ${compact(e.quoteAmount)} ${sym(e.quoteSymbol)}` : "";
  const cp = e.counterparty
    ? escapeHtml(e.counterpartyLabel ?? shortAddress(e.counterparty))
    : null;
  switch (e.type) {
    case "swap_buy":
      return `Kocht: ${amt}${quote}`;
    case "swap_sell":
      return `Verkocht: ${amt}${e.quoteSymbol && e.quoteAmount ? ` voor ${compact(e.quoteAmount)} ${sym(e.quoteSymbol)}` : ""}`;
    case "exchange_deposit":
      return `Stortte: ${amt}${cp ? ` naar ${cp}` : ""}`;
    case "exchange_withdrawal":
      return `Haalde op: ${amt}${cp ? ` van ${cp}` : ""}`;
    case "transfer":
      return `Verstuurd: ${amt}${cp ? ` → ${cp}` : ""}`;
  }
}

function links(e: AlertEvent): string {
  return `🔗 <a href="${explorerTxUrl(e.chain, e.txHash)}">${explorerName(e.chain)}</a> · <a href="${dexscreenerUrl(e.chain, e.tokenAddress)}">DexScreener</a>`;
}

/** Eén bericht per wallet; meerdere events worden gebundeld. */
export function formatAlert(wallet: AlertWallet, events: AlertEvent[]): string {
  const name = wallet.label ? `<b>${escapeHtml(wallet.label)}</b>` : "Onbekende wallet";
  const out = [
    `<b>${headline(wallet, events)}</b>`,
    `Wallet: ${name} (<code>${escapeHtml(shortAddress(wallet.address))}</code>)`,
  ];
  if (events.length === 1) {
    out.push(line(events[0]), links(events[0]));
  } else {
    for (const e of events.slice(0, 10)) {
      out.push("", line(e), links(e));
    }
    if (events.length > 10) out.push("", `… en nog ${events.length - 10}`);
  }
  return out.join("\n");
}
