# 🐋 Whale Alert

Telegram-bot + webapp die whale- en smart-money-activiteit op Ethereum en Solana volgt.
Next.js (App Router) op Vercel, grammY in webhook-mode, Supabase als database.

> Informatietool. Geen financieel advies, geen wallet-koppeling, geen trades.

## Status

| Fase | Onderdeel | Status |
|---|---|---|
| 1 | Project, Supabase-schema, basisbot (`/help`, `/wallets`, `/setup`) | ✅ |
| 2 | Solana / Helius | ⏳ |
| 3 | Ethereum / Alchemy | ⏳ |
| 4–12 | Zie projectplan | ⏳ |

## Lokaal opzetten

```bash
npm install
cp .env.example .env.local   # en invullen
```

### 1. Database (Supabase)

Optie A, via het dashboard: open **SQL Editor**, plak de inhoud van
`supabase/migrations/20261123000001_init.sql` en klik **Run**.

Optie B, met de Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref <jouw-project-ref>
npx supabase db push
```

### 2. Bot testen zonder tunnel (polling)

Het makkelijkst voor fase 1. Dit verwijdert een eventuele webhook en draait dezelfde bot lokaal:

```bash
npm run bot:dev
```

Zet de bot in je testgroep, maak jezelf admin, en typ `/help` en daarna `/setup` (in het topic waar alerts moeten komen).

### 3. Webhook-mode lokaal (zoals op Vercel)

Telegram (en later Helius/Alchemy/Stripe) moet je lokale server kunnen bereiken via https. Kies één:

**Cloudflare Tunnel** (gratis, geen account nodig voor een quick tunnel):

```bash
cloudflared tunnel --url http://localhost:3000
```

**ngrok:**

```bash
ngrok http 3000
```

Start daarna Next.js en registreer de webhook op de tunnel-URL:

```bash
npm run dev
```

```bash
npm run tg:webhook -- https://<jouw-tunnel>.trycloudflare.com
```

Controleren of terugzetten naar polling:

```bash
npm run tg:webhook -- --info
```

```bash
npm run tg:webhook -- --delete
```

> Quick tunnels krijgen bij elke start een nieuwe URL. Draai `tg:webhook` dan opnieuw.

## Tests

```bash
npm test
```

Fixtures (voorbeeld-payloads) staan in `fixtures/`. Tests sturen nooit echte berichten: alle Telegram API-calls worden onderschept.

## Structuur

```
app/api/telegram/route.ts   Telegram webhook (checkt secret token)
lib/bot/                    Bot-commando's (createBot is testbaar met nep-deps)
lib/messages.ts             Alle teksten (NL), klaar voor EN
lib/env.ts                  Env-validatie (zod)
lib/settings.ts             Key/value settings in Supabase
lib/supabase/admin.ts       Service-role client (alleen server)
supabase/migrations/        SQL-migraties
scripts/                    bot-dev (polling), set-telegram-webhook
fixtures/  tests/           Voorbeeld-payloads en tests
```

## Beveiliging

- Secrets alleen in `.env.local` (lokaal) en Vercel Environment Variables.
- RLS staat aan op alle tabellen zonder policies: anon/authenticated kunnen niets lezen of schrijven.
  De website leest alleen de views `public_events` en `public_wallets` (zonder `raw` en zonder exchange-wallets).
- Schrijven gebeurt alleen server-side met de service role.
