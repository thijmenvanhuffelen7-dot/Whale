# 🐋 Whale Alert

Telegram-bot + webapp die whale- en smart-money-activiteit op Ethereum en Solana volgt.
Next.js (App Router) op Vercel, grammY in webhook-mode, Supabase als database.

> Informatietool. Geen financieel advies, geen wallet-koppeling, geen trades.

## Status

| Fase | Onderdeel | Status |
|---|---|---|
| 1 | Project, Supabase-schema, basisbot | ✅ |
| 2 | Solana via Helius-webhook → events → alerts | ✅ |
| 3 | Ethereum via Alchemy-webhook → events → alerts | ✅ |
| 4 | Exchange-labels, filters, throttling, bundelen | ✅ |
| 5 | `/analyse` (DexScreener + Tavily + Claude) | ✅ |
| 6 | Dagelijkse digest + opschonen (cron) | ✅ |
| 7 | Design system | ⏳ wacht op jouw goedkeuring |
| 8–12 | Website, app, Stripe, admin, deploy | ⏳ |

## Hoe het werkt

```
Helius (SOL) ─┐                          ┌─> Telegram-groep (topics 🐋 ETH / 🐋 SOL)
              ├─> /api/webhooks/* ─> parse ─> prijs (DexScreener, 60s cache)
Alchemy (ETH) ┘                          ├─> filters (drempel, liquiditeit, zelfde eigenaar)
                                         ├─> events-tabel (dedupe op tx + leg)
                                         └─> dispatch: max 1 bericht per wallet per 2 min, gebundeld
```

- **Swaps** herkennen we aan de netto-flows van een gevolgde wallet binnen één tx:
  geeft hij SOL/ETH/stables uit en krijgt hij een token → *koopt*; andersom → *verkoopt*.
- **Exchange-flows**: transfer naar/van een wallet met `type = 'exchange'` → storting/opname.
  Er staat een startlijst in de migratie. **Controleer en vul die aan**: een exchange heeft vaak tientallen wallets.
- **Filters** (instelbaar in de `settings`-tabel):
  | key | default | betekenis |
  |---|---|---|
  | `alert_threshold_usd` | 250000 | transfers en exchange-flows (`/threshold`) |
  | `swap_threshold_usd` | 10000 | smart-money-swaps (anders zie je bijna nooit een swap) |
  | `min_liquidity_usd` | 10000 | onder deze liquiditeit = spam/dust |
  | `throttle_seconds` | 120 | max 1 alert per wallet per … |
  | `analyse_daily_limit` | 5 | `/analyse` per gebruiker per dag (admins onbeperkt) |
- `tokens_watch.min_usd_alert` overschrijft de drempel per token.
- Waarom een event níet gemeld werd staat in `events.filter_reason`.

## Bot-commando's

Iedereen: `/analyse <ticker|adres>`, `/wallets`, `/help`

Admins (Telegram-groepsadmin, of ID in `TELEGRAM_ADMIN_IDS`):
`/setup` (maakt de topics aan), `/addwallet <eth|sol> <adres> <label> [smart_money|whale]`,
`/removewallet <adres>`, `/threshold <usd>`, `/pause`, `/resume`.

`/addwallet` en `/removewallet` werken de Helius/Alchemy-webhook meteen bij.

## Lokaal opzetten

```bash
npm install
```

```bash
cp .env.example .env.local
```

Vul `.env.local` in. Zie `.env.example` voor waar elke key vandaan komt.

### 1. Database (Supabase)

Dashboard → **SQL Editor**: plak en run de bestanden in `supabase/migrations/` **op volgorde**.

Of met de CLI:

```bash
npx supabase link --project-ref <jouw-project-ref>
```

```bash
npx supabase db push
```

### 2. Telegram-groep

1. Maak een groep, zet **Topics** aan (Groepsinstellingen → Topics).
2. Voeg de bot toe, maak hem **admin** met recht *Topics beheren*.
3. BotFather → `/setprivacy` → *Disable* (anders ziet de bot geen commando's zonder @-vermelding).
4. Start de bot (zie hieronder) en typ in de groep: `/setup`.

### 3. Bot testen zonder tunnel (polling)

```bash
npm run bot:dev
```

Prima voor commando's. **Webhooks van Helius/Alchemy** hebben wel een publieke URL nodig, zie stap 4.

### 4. Tunnel voor webhooks

Kies er één:

```bash
cloudflared tunnel --url http://localhost:3000
```

```bash
ngrok http 3000
```

Start Next.js:

```bash
npm run dev
```

Registreer Telegram op de tunnel:

```bash
npm run tg:webhook -- https://<jouw-tunnel>.trycloudflare.com
```

Registreer Helius + Alchemy (eerste keer: zet de geprinte IDs/keys in `.env.local` en herstart `npm run dev`):

```bash
npm run webhooks:register -- https://<jouw-tunnel>.trycloudflare.com
```

> Quick tunnels krijgen bij elke start een nieuwe URL. Draai beide commando's dan opnieuw.
> Bij Alchemy kun je de URL van een bestaande webhook niet aanpassen: haal `ALCHEMY_WEBHOOK_ID` weg en draai het opnieuw (verwijder de oude in het dashboard).

Snel testen zonder echte whale: Helius-dashboard → je webhook → **Test webhook**, of stuur een fixture:

```bash
curl -X POST http://localhost:3000/api/webhooks/helius -H "Authorization: $HELIUS_WEBHOOK_AUTH" -H "content-type: application/json" --data @fixtures/helius/swap-buy-bonk.json
```

(De wallet `7xKX…gAsU` moet dan wel in je `wallets`-tabel staan.)

### 5. Cron

| Route | Wanneer | Waarvoor |
|---|---|---|
| `/api/cron/digest` | 06:00 + 07:00 UTC | digest om 08:00 Amsterdam (zomer/winter), stuurt 1x per dag |
| `/api/cron/cleanup` | 03:17 UTC | raw payloads na 7 dagen weg, events na 180 dagen |
| `/api/cron/dispatch` | elke minuut | alerts die door de throttle bleven liggen |

De eerste twee staan in `vercel.json`. **Vercel Hobby staat geen cron vaker dan 1x per dag toe**,
dus `dispatch` draai je via Supabase (gratis): zie `supabase/cron.sql`. Alerts worden ook direct
verstuurd bij elke binnenkomende webhook; de cron vangt alleen de gethrottelde bundels op.

Handmatig testen (met je `CRON_SECRET`):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/digest?force=1"
```

## Tests

```bash
npm test
```

Fixtures (voorbeeld-payloads) staan in `fixtures/`. Tests sturen nooit echte berichten.

## AI (`/analyse`)

- Model: `ANTHROPIC_MODEL` (standaard `claude-sonnet-5-5`), korte output.
- Sonnet 5.5 accepteert geen `temperature`. In plaats daarvan staat thinking uit en effort op `low`.
- Server-side fallback staat aan: weigert het model onterecht, dan neemt een ander model het over.
- De prompt verbiedt advies en voorspellingen. Daarnaast checkt de code de output op koop- en
  voorspel-taal. Bij een hit tonen we alleen de feiten, zonder AI-tekst.

## Bekende beperkingen

- **Token-watch op Ethereum** werkt nog niet: Alchemy Address Activity ziet geen transfers *van* een
  token-contract. Daarvoor is een Alchemy Custom Webhook (GraphQL) nodig. Op Solana werkt het wel.
- **Exchange-lijst** is een startlijst, niet compleet.
- **USD-waarde** is de prijs op het moment van binnenkomst, niet die op het moment van de tx.

## Structuur

```
app/api/telegram/            Telegram webhook (secret token)
app/api/webhooks/helius|alchemy  On-chain webhooks (auth header / HMAC)
app/api/cron/                digest, cleanup, dispatch
lib/chain/                   parsers (Helius, Alchemy) → netto-flows → events
lib/alerts/                  evaluate (filters), format (HTML), pipeline (DB + dispatch)
lib/analyse/                 /analyse: token zoeken, nieuws, Claude
lib/prices/                  DexScreener (+ CoinGecko fallback), 60s cache
lib/bot/                     commando's (createBot is testbaar met nep-deps)
lib/messages.ts              alle teksten (NL)
supabase/migrations/         SQL
scripts/                     bot-dev, tg:webhook, webhooks:register
```

## Beveiliging

- Secrets alleen in `.env.local` en Vercel Environment Variables.
- Webhooks: Telegram secret token, Helius auth header, Alchemy HMAC-signature, cron Bearer secret. Allemaal constant-time vergeleken.
- RLS staat aan op alle tabellen zonder policies. De website leest alleen `public_events` en `public_wallets`.
  Throttle-functies zijn niet aanroepbaar door anon.
