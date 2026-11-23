# 🐋 Whale Alert

Telegram-bot + webapp die whale- en smart-money-activiteit op Ethereum en Solana volgt.
Next.js (App Router) op Vercel, grammY in webhook-mode, Supabase als database.

> Informatietool. Geen financieel advies, geen wallet-koppeling, geen trades.

**Taal:** site en bot zijn Engelstalig. Bot in het Nederlands: `BOT_LANG=nl`.
**Naam:** de merknaam staat op één plek: `NEXT_PUBLIC_BRAND_NAME` (standaard nog "Whale Alert", dat is een bestaand merk: kies een eigen naam vóór livegang).

## Status

| Fase | Onderdeel | Status |
|---|---|---|
| 1 | Project, Supabase-schema, basisbot | ✅ |
| 2 | Solana via Helius-webhook → events → alerts | ✅ |
| 3 | Ethereum via Alchemy-webhook → events → alerts | ✅ |
| 4 | Exchange-labels, filters, throttling, bundelen | ✅ |
| 5 | `/analyse` (DexScreener + Tavily + Groq) | ✅ |
| 6 | Dagelijkse digest + opschonen (cron) | ✅ |
| 7 | Design system ("Bridge at night", zie DESIGN.md) | ✅ |
| 8 | Publieke site: home, feed, wallets, wallet/token-pagina's, prijzen, learn, juridisch, SEO | ✅ |
| 9 | Login (magic link + Google), dashboard, watchlist, DM-alerts, screenshot-analyse | ✅ |
| 10 | Stripe, Pro-groep (invite-links, automatisch verwijderen), gratis kanaal | ✅ |
| 11 | Admin: wallets + CSV-import, instellingen, MRR, alerts/dag, AI-kosten, testalert, fouten | ✅ |
| 12 | Deploy-handleiding (hieronder) | ✅ |

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

Iedereen: `/analyze <ticker|adres>` (ook `/analyse`), `/wallets`, `/help`

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

## Website lokaal bekijken zonder database (demo-modus)

```bash
DEMO_DATA=1 npm run dev
```

Toont nep-transacties met een gele "Demo-data"-balk erboven, zodat je het design kunt beoordelen.
Werkt alleen als er géén Supabase-keys zijn. **Zet `DEMO_DATA` nooit in Vercel.**

## Tests

```bash
npm test
```

Fixtures (voorbeeld-payloads) staan in `fixtures/`. Tests sturen nooit echte berichten.

## AI (`/analyse`)

- Provider: **Groq** (`GROQ_API_KEY`, model via `GROQ_MODEL`, standaard `llama-3.3-70b-versatile`),
  temperature 0.2, max 500 tokens. Anthropic kan als alternatief (`ANTHROPIC_API_KEY`); Groq gaat voor.
- Geen key? Dan werkt `/analyse` gewoon, alleen zonder het blok "Samenvatting".
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
lib/analyse/                 /analyse: token zoeken, nieuws, AI-samenvatting (Groq)
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

## Deploy op Vercel (fase 12), stap voor stap

### 1. Supabase
1. Draai de drie migraties in `supabase/migrations/` op volgorde (SQL Editor of `npx supabase db push`).
2. **Authentication → URL Configuration**: Site URL = `https://jouwdomein.nl`; Redirect URLs: `https://jouwdomein.nl/auth/callback` en `http://localhost:3000/auth/callback`.
3. **Authentication → Providers → Google**: aanzetten met een OAuth-client uit Google Cloud Console
   (redirect-URI: `https://<project>.supabase.co/auth/v1/callback`).
4. Optioneel: eigen SMTP (Resend) voor de magic-link-mails, anders geldt de lage limiet van Supabase.

### 2. Stripe
1. Maak een product **Pro** met twee prijzen: €19/maand en €149/jaar. Zet de `price_...`-IDs in env.
2. **Developers → Webhooks**: endpoint `https://jouwdomein.nl/api/webhooks/stripe` met events
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
   De signing secret → `STRIPE_WEBHOOK_SECRET`.
3. **Settings → Billing → Customer portal**: aanzetten (opzeggen, betaalmethode, facturen).
4. Lokaal testen:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### 3. Telegram
- **Hoofdgroep** (alerts): bot admin, typ `/setup`.
- **Pro-groep** (privé): bot admin met *Gebruikers uitnodigen* en *Gebruikers verbannen*. ID in `TELEGRAM_PRO_GROUP_ID`.
- **Publiek kanaal** (gratis, 15 min vertraagd): bot admin met *Berichten plaatsen*. ID in `TELEGRAM_PUBLIC_CHANNEL_ID`, link in `NEXT_PUBLIC_TELEGRAM_PUBLIC_URL`.
- Een chat-ID vind je door de bot een bericht te laten ontvangen en `/setup` te typen, of via @RawDataBot.

### 4. Vercel
1. Importeer de repo in Vercel. Framework: Next.js (automatisch).
2. Zet alle variabelen uit `.env.example` in **Settings → Environment Variables** (behalve `DEMO_DATA`).
   `NEXT_PUBLIC_SITE_URL` = je echte domein.
3. Deploy. Daarna:

```bash
npm run tg:webhook -- https://jouwdomein.nl
```

```bash
npm run webhooks:register -- https://jouwdomein.nl
```

4. Zet in Supabase de minuut-cron aan voor dispatch (`supabase/cron.sql`), want Vercel Hobby doet maar 1x per dag.
   Op Vercel Pro kun je in plaats daarvan `{ "path": "/api/cron/dispatch", "schedule": "* * * * *" }` toevoegen aan `vercel.json`.

> **Let op:** Vercel Hobby mag je niet commercieel gebruiken. Met betalende klanten heb je Vercel Pro nodig.

### 5. Controleren
- `/admin` → **Testalert sturen** komt in je groep.
- Stripe testkaart `4242 4242 4242 4242` → je account wordt Pro, je krijgt een invite-link in Telegram.
- Abonnement opzeggen in het portal (direct beëindigen) → je wordt uit de Pro-groep gehaald en krijgt een DM.

## Hoe abonnementen en toegang werken

```
Stripe Checkout → webhook → subscriptions-tabel → profiles.plan = pro
   → (Telegram gekoppeld?) bot stuurt persoonlijke invite-link (1 gebruik, 24 uur)
Abonnement stopt → webhook → plan = free → bot haalt je uit de Pro-groep + DM met verleng-link
Dagelijkse cron /api/cron/subscriptions = vangnet als een webhook gemist is
```

Telegram koppelen: in **Account** klik je *Open in Telegram*; de bot krijgt `/start <code>` en koppelt je account.

## Free vs Pro: hoe de vertraging werkt
De 15 minuten vertraging zit **in de database-view** `public_events`, niet alleen in de site.
De anon key is publiek (staat in de browser), dus anders kon iedereen hem met curl omzeilen.
Pro-gebruikers krijgen realtime data via de server (`/api/feed`, ververst elke 5 seconden).
