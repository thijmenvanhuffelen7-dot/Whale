import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { legsToEvents, type Leg } from "@/lib/chain/flows";
import { NATIVE, type NormalizedEvent } from "@/lib/chain/types";

/** Alchemy Address Activity webhook payload. */
const activity = z
  .object({
    fromAddress: z.string().nullable().optional(),
    toAddress: z.string().nullable().optional(),
    hash: z.string(),
    value: z.number().nullable().optional(),
    asset: z.string().nullable().optional(),
    category: z.string(),
    rawContract: z
      .object({
        rawValue: z.string().nullable().optional(),
        address: z.string().nullable().optional(),
        decimals: z.number().nullable().optional(),
      })
      .optional(),
  })
  .passthrough();

export const alchemyPayload = z.object({
  webhookId: z.string(),
  id: z.string(),
  createdAt: z.string(),
  type: z.string(),
  event: z.object({
    network: z.string(),
    activity: z.array(activity),
  }),
});
export type AlchemyPayload = z.infer<typeof alchemyPayload>;
type Activity = z.infer<typeof activity>;

/** Controleer `X-Alchemy-Signature` = HMAC-SHA256(rawBody, signingKey) in hex. */
export function verifyAlchemySignature(rawBody: string, signature: string | null, signingKey: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", signingKey).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function activityAmount(a: Activity): number {
  if (typeof a.value === "number") return a.value;
  const raw = a.rawContract?.rawValue;
  const dec = a.rawContract?.decimals;
  if (!raw || dec == null) return 0;
  try {
    // BigInt → number met behoud van precisie in het integer-deel
    const big = BigInt(raw);
    const div = 10n ** BigInt(dec);
    return Number(big / div) + Number(big % div) / Number(div);
  } catch {
    return 0;
  }
}

function activityToLeg(a: Activity): Leg | null {
  const native = a.category === "external" || a.category === "internal";
  if (!native && a.category !== "token" && a.category !== "erc20") return null; // NFT's negeren
  const token = native ? NATIVE.eth.address : a.rawContract?.address;
  if (!token) return null;
  return {
    from: a.fromAddress ?? null,
    to: a.toAddress ?? null,
    token,
    symbol: native ? "ETH" : (a.asset ?? null),
    amount: activityAmount(a),
  };
}

export function parseAlchemy(
  body: unknown,
  tracked: Set<string>,
  watchedTokens?: Set<string>,
): NormalizedEvent[] {
  const payload = alchemyPayload.parse(body);
  if (payload.event.network !== "ETH_MAINNET") return [];

  const byHash = new Map<string, Activity[]>();
  for (const a of payload.event.activity) {
    const key = a.hash.toLowerCase();
    const list = byHash.get(key) ?? [];
    list.push(a);
    byHash.set(key, list);
  }

  return [...byHash.entries()].flatMap(([hash, acts]) =>
    legsToEvents({
      chain: "eth",
      txHash: hash,
      legs: acts.map(activityToLeg).filter((l): l is Leg => l !== null),
      tracked,
      watchedTokens,
      blockTime: new Date(payload.createdAt),
      raw: acts,
    }),
  );
}
