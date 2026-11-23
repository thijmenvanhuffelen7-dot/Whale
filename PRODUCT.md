# Product: Whale Alert

## Wat het is
Een informatietool die publieke on-chain activiteit van grote wallets ("whales") en
"smart money" op Ethereum en Solana volgt en meldt: grote transfers, swaps (kopen/verkopen)
en stortingen naar / opnames van exchanges. Kanalen: een Telegram-groep (gratis, vertraagd)
en een Pro-groep + webapp (realtime, eigen watchlist, DM-alerts).

## Voor wie
Nederlandstalige crypto-traders en -volgers die dagelijks willen zien wat grote spelers doen,
vaak op hun telefoon, vaak 's avonds. Ze kennen Arkham, Nansen en DexScreener.

## Belofte
"Zie wat whales doen, zodra ze het doen." Feiten, snel, zonder ruis.

## Harde regels
- Geen financieel advies. Nooit "koop nu", koersdoelen, voorspellingen of winstkansen.
- Onder elke analyse en digest: "Geen financieel advies. Alleen informatie."
- Geen wallet-koppeling, geen trades. Alleen publieke data.
- Geen nep-reviews, geen verzonnen cijfers. Stats komen uit de database of worden niet getoond.

## Taal
Nederlands. Alle bot-teksten in lib/messages.ts; site-teksten in de pagina's (later i18n).

## Prijzen (configureerbaar, lib/plans.ts)
Free: vertraagde feed (15 min), 3 analyses/dag, publiek Telegram-kanaal.
Pro: €19/maand of €149/jaar: realtime, onbeperkt volgen, DM-alerts, Pro-groep, 50 analyses/dag.
