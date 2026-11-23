import { logAiUsage } from "@/lib/analyse/run";

/**
 * Herken coin en chain op een chart-screenshot (Groq vision-model).
 * Geeft een zoekterm terug (contractadres of ticker) of null.
 */
export async function identifyFromScreenshot(base64: string, mime: string, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  const model = process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";
  const res = await fetchImpl("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 200,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'You identify which cryptocurrency is shown on a screenshot. Answer ONLY with JSON: {"ticker": string|null, "contract": string|null, "chain": "ethereum"|"solana"|null}. Only copy a contract address if it is fully visible. Give no opinion or advice.',
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Which coin is this?" },
            { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) {
    console.error("[vision]", res.status, await res.text().catch(() => ""));
    return null;
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  await logAiUsage(
    { provider: "groq", model, inputTokens: data.usage?.prompt_tokens ?? 0, outputTokens: data.usage?.completion_tokens ?? 0 },
    "screenshot",
  );
  return parseVisionAnswer(data.choices?.[0]?.message?.content ?? "");
}

export function parseVisionAnswer(content: string): string | null {
  try {
    const j = JSON.parse(content) as { ticker?: string | null; contract?: string | null };
    const contract = j.contract?.trim();
    if (contract && /^(0x[0-9a-fA-F]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})$/.test(contract)) return contract;
    const ticker = j.ticker?.replace(/^\$/, "").trim();
    return ticker && /^[A-Za-z0-9]{1,15}$/.test(ticker) ? ticker : null;
  } catch {
    return null;
  }
}
