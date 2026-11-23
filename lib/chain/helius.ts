import { z } from "zod";
import { legsToEvents, type Leg } from "@/lib/chain/flows";
import { NATIVE, STABLES, type NormalizedEvent } from "@/lib/chain/types";

/**
 * Helius "enhanced" webhook: de body is een array van transacties.
 * We valideren alleen de velden die we gebruiken; de rest laten we door.
 */
const tokenTransfer = z.object({
  fromUserAccount: z.string().nullable().optional(),
  toUserAccount: z.string().nullable().optional(),
  fromTokenAccount: z.string().nullable().optional(),
  toTokenAccount: z.string().nullable().optional(),
  mint: z.string(),
  tokenAmount: z.union([z.number(), z.string()]).transform(Number),
});
const nativeTransfer = z.object({
  fromUserAccount: z.string().nullable().optional(),
  toUserAccount: z.string().nullable().optional(),
  amount: z.union([z.number(), z.string()]).transform(Number), // lamports
});
export const heliusTx = z
  .object({
    signature: z.string(),
    type: z.string().optional(),
    source: z.string().optional(),
    timestamp: z.number().optional(),
    transactionError: z.unknown().optional(),
    tokenTransfers: z.array(tokenTransfer).optional().default([]),
    nativeTransfers: z.array(nativeTransfer).optional().default([]),
  })
  .passthrough();
export const heliusPayload = z.array(heliusTx);
export type HeliusTx = z.infer<typeof heliusTx>;

const LAMPORTS = 1_000_000_000;

export function heliusTxToLegs(tx: HeliusTx): Leg[] {
  const legs: Leg[] = [];
  // Native SOL van/naar token-accounts tellen we niet mee:
  // - bij een SOL-swap gaat SOL eerst naar een tijdelijk WSOL-account en
  //   verschijnt daarna nóg eens als WSOL-transfer (dubbel tellen);
  // - het aanmaken van een token-account kost rent (~0,002 SOL).
  const tokenAccounts = new Set<string>();
  for (const t of tx.tokenTransfers) {
    if (t.fromTokenAccount) tokenAccounts.add(t.fromTokenAccount);
    if (t.toTokenAccount) tokenAccounts.add(t.toTokenAccount);
  }
  for (const t of tx.tokenTransfers) {
    // WSOL behandelen we als SOL, zodat SOL-swaps één flow zijn.
    const isWsol = t.mint === NATIVE.sol.address;
    legs.push({
      from: t.fromUserAccount ?? null,
      to: t.toUserAccount ?? null,
      token: t.mint,
      symbol: isWsol ? "SOL" : (STABLES.sol[t.mint] ?? null),
      amount: t.tokenAmount,
    });
  }
  for (const t of tx.nativeTransfers) {
    if (tokenAccounts.has(t.fromUserAccount ?? "") || tokenAccounts.has(t.toUserAccount ?? "")) continue;
    legs.push({
      from: t.fromUserAccount ?? null,
      to: t.toUserAccount ?? null,
      token: NATIVE.sol.address,
      symbol: "SOL",
      amount: t.amount / LAMPORTS,
    });
  }
  return legs;
}

export function parseHelius(
  body: unknown,
  tracked: Set<string>,
  watchedTokens?: Set<string>,
): NormalizedEvent[] {
  const txs = heliusPayload.parse(body);
  return txs.flatMap((tx) => {
    if (tx.transactionError) return [];
    return legsToEvents({
      chain: "sol",
      txHash: tx.signature,
      legs: heliusTxToLegs(tx),
      tracked,
      watchedTokens,
      blockTime: tx.timestamp ? new Date(tx.timestamp * 1000) : null,
      raw: tx,
    });
  });
}
