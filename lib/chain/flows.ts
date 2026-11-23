import { type Chain, type NormalizedEvent, NATIVE, isBase, isStable, normAddr } from "@/lib/chain/types";

/** Eén token-beweging binnen een transactie. */
export type Leg = {
  from: string | null;
  to: string | null;
  token: string;
  symbol: string | null;
  amount: number;
};

/** Native-bewegingen kleiner dan dit zijn fees/rent/tips, geen echte flow. */
const NATIVE_DUST: Record<Chain, number> = { sol: 0.05, eth: 0.001 };

type Flow = { token: string; symbol: string | null; net: number; counterparty: string | null };

/**
 * Zet de legs van één tx om in events voor de gevolgde wallets:
 * - wallet geeft X uit én ontvangt Y  → swap (buy/sell)
 * - alleen uit of alleen in           → transfer(s)
 * Daarnaast: transfers van gevolgde tokens tussen niet-gevolgde wallets.
 */
export function legsToEvents(args: {
  chain: Chain;
  txHash: string;
  legs: Leg[];
  tracked: Set<string>;
  watchedTokens?: Set<string>;
  blockTime: Date | null;
  raw: unknown;
}): NormalizedEvent[] {
  const { chain, txHash, tracked, blockTime, raw } = args;
  const n = (a: string) => normAddr(chain, a);
  const legs = args.legs
    .filter((l) => l.amount > 0 && Number.isFinite(l.amount))
    .map((l) => ({
      ...l,
      from: l.from ? n(l.from) : null,
      to: l.to ? n(l.to) : null,
      token: n(l.token),
    }));

  const events: NormalizedEvent[] = [];
  const involved = new Set<string>();
  for (const l of legs) {
    if (l.from && tracked.has(l.from)) involved.add(l.from);
    if (l.to && tracked.has(l.to)) involved.add(l.to);
  }

  [...involved].sort().forEach((wallet, walletIdx) => {
    const flows = new Map<string, Flow>();
    for (const l of legs) {
      let sign = 0;
      if (l.from === wallet && l.to !== wallet) sign = -1;
      else if (l.to === wallet && l.from !== wallet) sign = 1;
      if (!sign) continue;
      const f = flows.get(l.token) ?? { token: l.token, symbol: l.symbol, net: 0, counterparty: null };
      f.net += sign * l.amount;
      f.symbol ??= l.symbol;
      // Grootste tegenpartij onthouden (voor exchange-herkenning)
      if (!f.counterparty) f.counterparty = sign < 0 ? l.to : l.from;
      flows.set(l.token, f);
    }

    const isNative = (t: string) => t === NATIVE[chain].address;
    const real = [...flows.values()]
      .filter((f) => !(isNative(f.token) && Math.abs(f.net) < NATIVE_DUST[chain]))
      .filter((f) => Math.abs(f.net) > 1e-12)
      .sort((a, b) => a.token.localeCompare(b.token));

    const ins = real.filter((f) => f.net > 0);
    const outs = real.filter((f) => f.net < 0);
    const base = walletIdx * 100;

    if (ins.length && outs.length) {
      const swap = classifySwap(chain, ins, outs);
      events.push({
        chain,
        txHash,
        logIndex: base,
        walletAddress: wallet,
        type: swap.type,
        tokenAddress: swap.token.token,
        tokenSymbol: swap.token.symbol,
        amount: Math.abs(swap.token.net),
        counterparty: null,
        quote: {
          tokenAddress: swap.quote.token,
          tokenSymbol: swap.quote.symbol,
          amount: Math.abs(swap.quote.net),
        },
        blockTime,
        raw,
      });
      return;
    }

    real.forEach((f, i) => {
      events.push({
        chain,
        txHash,
        logIndex: base + i,
        walletAddress: wallet,
        type: "transfer",
        tokenAddress: f.token,
        tokenSymbol: f.symbol,
        amount: Math.abs(f.net),
        counterparty: f.counterparty,
        direction: f.net < 0 ? "out" : "in",
        blockTime,
        raw,
      });
    });
  });

  // Token-watch: grote transfers van gevolgde tokens tussen onbekende wallets.
  if (args.watchedTokens?.size) {
    legs.forEach((l, i) => {
      if (!args.watchedTokens!.has(l.token)) return;
      if ((l.from && tracked.has(l.from)) || (l.to && tracked.has(l.to))) return;
      if (!l.from || !l.to) return;
      events.push({
        chain,
        txHash,
        logIndex: 10_000 + i,
        walletAddress: l.from,
        type: "transfer",
        tokenAddress: l.token,
        tokenSymbol: l.symbol,
        amount: l.amount,
        counterparty: l.to,
        direction: "out",
        blockTime,
        raw,
      });
    });
  }

  return events;
}

function classifySwap(chain: Chain, ins: Flow[], outs: Flow[]) {
  const pick = (list: Flow[], wantBase: boolean) =>
    list.find((f) => isBase(chain, f.token) === wantBase) ?? list[0];

  const recvNonBase = ins.find((f) => !isBase(chain, f.token));
  const sentNonBase = outs.find((f) => !isBase(chain, f.token));

  if (recvNonBase) {
    // Token gekocht (met base óf met een ander token)
    return { type: "swap_buy" as const, token: recvNonBase, quote: pick(outs, true) };
  }
  if (sentNonBase) {
    return { type: "swap_sell" as const, token: sentNonBase, quote: pick(ins, true) };
  }
  // Base ↔ base (bv. SOL → USDC): stable uitgeven = native kopen, anders = verkopen.
  const sent = outs[0];
  const recv = ins[0];
  return isStable(chain, sent.token)
    ? { type: "swap_buy" as const, token: recv, quote: sent }
    : { type: "swap_sell" as const, token: sent, quote: recv };
}
