import { z } from "zod";

/**
 * Server-side env. We valideren lazy per onderdeel, zodat je in fase 1 nog
 * geen Stripe-key nodig hebt om de bot te draaien.
 */
const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),

  TELEGRAM_BOT_TOKEN: z.string().min(20).optional(),
  TELEGRAM_WEBHOOK_SECRET: z
    .string()
    .regex(/^[A-Za-z0-9_-]{16,256}$/, "alleen A-Z a-z 0-9 _ -, 16-256 tekens")
    .optional(),
  TELEGRAM_ADMIN_IDS: z.string().optional().default(""),
  TELEGRAM_CHAT_ID: z.string().optional(),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (!cached) {
    // Lege strings uit .env behandelen als "niet gezet".
    const raw = Object.fromEntries(
      Object.entries(process.env).filter(([, v]) => v !== ""),
    );
    cached = schema.parse(raw);
  }
  return cached;
}

/** Haal een verplichte variabele op; gooit een duidelijke fout als hij mist. */
export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const value = env()[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(`Env-variabele ${String(key)} ontbreekt. Zie .env.example.`);
  }
  return value as NonNullable<Env[K]>;
}

export function adminIds(): Set<number> {
  return new Set(
    env()
      .TELEGRAM_ADMIN_IDS.split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isSafeInteger(n) && n > 0),
  );
}

/** Alleen voor tests. */
export function resetEnvCache() {
  cached = null;
}
