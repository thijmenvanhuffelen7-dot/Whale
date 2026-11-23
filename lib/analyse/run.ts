import { supabaseAdmin } from "@/lib/supabase/admin";
import { dbConfigured } from "@/lib/data";
import {
  aggregateStats,
  aiCost,
  buildFactsPrompt,
  emptyStats,
  fetchNews,
  resolveToken,
  summarizeDetailed,
  type AiUsage,
  type NewsItem,
  type WhaleStats,
} from "@/lib/analyse";
import type { TokenInfo } from "@/lib/prices";

export type AnalysisResult = { token: TokenInfo; stats: WhaleStats; summary: string | null; news: NewsItem[] };
export type AiSource = "telegram" | "web" | "token_page" | "screenshot";

export async function logAiUsage(u: AiUsage | null, source: AiSource) {
  if (!u || !dbConfigured()) return;
  await supabaseAdmin()
    .from("ai_usage")
    .insert({
      provider: u.provider,
      model: u.model,
      source,
      input_tokens: u.inputTokens,
      output_tokens: u.outputTokens,
      cost_usd: aiCost(u),
    })
    .then(({ error }) => error && console.error("[ai_usage]", error.message));
}

async function whaleStats(token: TokenInfo): Promise<WhaleStats> {
  if (!dbConfigured()) return emptyStats();
  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  // Bewust de tabel (realtime) via de service role: dit zijn geaggregeerde cijfers.
  const { data } = await supabaseAdmin()
    .from("events")
    .select("type, usd_value, wallets(label)")
    .eq("chain", token.chain)
    .eq("token_address", token.address)
    .is("filter_reason", null)
    .gte("created_at", since)
    .limit(1000);
  return aggregateStats(
    (data ?? []).map((r) => ({
      type: r.type as string,
      usd_value: r.usd_value as number | null,
      wallet_label: (r.wallets as unknown as { label: string } | null)?.label ?? null,
    })),
  );
}

/** Volledige analyse van één token. null = token niet gevonden. */
export async function analyzeToken(query: string, source: AiSource): Promise<AnalysisResult | null> {
  const token = await resolveToken(query);
  if (!token) return null;
  const [stats, news] = await Promise.all([whaleStats(token), fetchNews(token.symbol, token.name)]);
  const s = await summarizeDetailed(buildFactsPrompt(token, stats, news));
  await logAiUsage(s.usage, source);
  return { token, stats, summary: s.text, news };
}

/** Tokenpagina: AI-samenvatting max 1x per uur verversen (ai_cache). */
export async function cachedTokenAnalysis(chain: string, address: string): Promise<AnalysisResult | null> {
  const key = `token:${chain}:${address}`;
  if (dbConfigured()) {
    const { data } = await supabaseAdmin().from("ai_cache").select("content, created_at").eq("key", key).maybeSingle();
    if (data && Date.now() - new Date(data.created_at).getTime() < 3600_000) return data.content as AnalysisResult;
  }
  const fresh = await analyzeToken(address, "token_page");
  if (fresh && dbConfigured()) {
    await supabaseAdmin()
      .from("ai_cache")
      .upsert({ key, content: { ...fresh, token: { ...fresh.token, liquidityUsd: Number.isFinite(fresh.token.liquidityUsd) ? fresh.token.liquidityUsd : null } }, created_at: new Date().toISOString() });
  }
  return fresh;
}
