import type { Chain } from "@/lib/chain/types";
import { getTokenInfo } from "@/lib/prices";

export type Holding = { address: string; symbol: string; amount: number; usd: number | null };

/**
 * Huidige holdings van een wallet. Solana via Helius DAS, Ethereum via Alchemy.
 * Zonder key of bij een fout: null (sectie wordt dan niet getoond).
 */
export async function getHoldings(chain: Chain, owner: string): Promise<Holding[] | null> {
  try {
    return chain === "sol" ? await solHoldings(owner) : await ethHoldings(owner);
  } catch (e) {
    console.error("[holdings]", e);
    return null;
  }
}

async function rpc<T>(url: string, method: string, params: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`${method}: ${res.status}`);
  const json = (await res.json()) as { result?: T; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  return json.result as T;
}

async function solHoldings(owner: string): Promise<Holding[] | null> {
  const key = process.env.HELIUS_API_KEY;
  if (!key) return null;
  type Item = {
    id: string;
    interface: string;
    content?: { metadata?: { symbol?: string } };
    token_info?: { symbol?: string; balance?: number; decimals?: number; price_info?: { total_price?: number } };
  };
  const r = await rpc<{ items: Item[]; nativeBalance?: { lamports: number; total_price?: number } }>(
    `https://mainnet.helius-rpc.com/?api-key=${key}`,
    "getAssetsByOwner",
    { ownerAddress: owner, page: 1, limit: 100, displayOptions: { showFungible: true, showNativeBalance: true } },
  );
  const out: Holding[] = [];
  if (r.nativeBalance?.lamports) {
    out.push({
      address: "So11111111111111111111111111111111111111112",
      symbol: "SOL",
      amount: r.nativeBalance.lamports / 1e9,
      usd: r.nativeBalance.total_price ?? null,
    });
  }
  for (const it of r.items ?? []) {
    const ti = it.token_info;
    if (!ti?.balance || ti.decimals == null) continue;
    out.push({
      address: it.id,
      symbol: ti.symbol ?? it.content?.metadata?.symbol ?? "?",
      amount: ti.balance / 10 ** ti.decimals,
      usd: ti.price_info?.total_price ?? null,
    });
  }
  return out.sort((a, b) => (b.usd ?? 0) - (a.usd ?? 0)).slice(0, 15);
}

async function ethHoldings(owner: string): Promise<Holding[] | null> {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) return null;
  const url = `https://eth-mainnet.g.alchemy.com/v2/${key}`;
  const [eth, tokens] = await Promise.all([
    rpc<string>(url, "eth_getBalance", [owner, "latest"]),
    rpc<{ tokenBalances: { contractAddress: string; tokenBalance: string }[] }>(url, "alchemy_getTokenBalances", [owner, "erc20"]),
  ]);
  const nonZero = tokens.tokenBalances.filter((t) => t.tokenBalance && BigInt(t.tokenBalance) > 0n).slice(0, 25);
  const metas = await Promise.all(
    nonZero.map((t) =>
      rpc<{ symbol: string | null; decimals: number | null }>(url, "alchemy_getTokenMetadata", [t.contractAddress]).catch(() => null),
    ),
  );
  const ethAmount = Number(BigInt(eth)) / 1e18;
  const wethPrice = await getTokenInfo("eth", "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2");
  const out: Holding[] = [
    { address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", symbol: "ETH", amount: ethAmount, usd: wethPrice ? ethAmount * wethPrice.priceUsd : null },
  ];
  await Promise.all(
    nonZero.map(async (t, i) => {
      const m = metas[i];
      if (!m?.decimals) return;
      const amount = Number(BigInt(t.tokenBalance)) / 10 ** m.decimals;
      const p = await getTokenInfo("eth", t.contractAddress);
      // Spam-airdrops zonder liquiditeit niet tonen
      if (!p || p.liquidityUsd < 10_000) return;
      out.push({ address: t.contractAddress.toLowerCase(), symbol: p.symbol ?? m.symbol ?? "?", amount, usd: amount * p.priceUsd });
    }),
  );
  return out.sort((a, b) => (b.usd ?? 0) - (a.usd ?? 0)).slice(0, 15);
}
