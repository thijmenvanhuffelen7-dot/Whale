import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { ARTICLES } from "@/lib/learn";
import { getFeed, getLeaderboard } from "@/lib/data";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const fixed = ["", "/feed", "/wallets", "/pricing", "/learn", "/disclaimer", "/terms", "/privacy"].map((p) => ({
    url: `${SITE.url}${p}`,
    lastModified: now,
    changeFrequency: p === "/feed" ? ("always" as const) : ("weekly" as const),
    priority: p === "" ? 1 : 0.7,
  }));
  const learn = ARTICLES.map((a) => ({ url: `${SITE.url}/learn/${a.slug}`, lastModified: now, priority: 0.6 }));
  const [wallets, events] = await Promise.all([getLeaderboard("volume", 500), getFeed({ limit: 200 })]);
  const walletUrls = wallets.map((w) => ({
    url: `${SITE.url}/wallet/${w.chain}/${w.address}`,
    lastModified: w.last_activity ? new Date(w.last_activity) : now,
    priority: 0.5,
  }));
  const tokens = new Map<string, string>();
  for (const e of events) if (e.token_address) tokens.set(`${e.chain}/${e.token_address}`, e.created_at);
  const tokenUrls = [...tokens].map(([k, d]) => ({ url: `${SITE.url}/token/${k}`, lastModified: new Date(d), priority: 0.5 }));
  return [...fixed, ...learn, ...walletUrls, ...tokenUrls];
}
