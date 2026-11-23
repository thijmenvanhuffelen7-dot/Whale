# Design: "Bridge at night"

## Wereld
De brug van een schip 's nachts. Instrumenten in night mode: amber op diep zeeblauw-zwart,
zodat je ogen niet verblind worden. Sonar-pings, dieptelijnen, coördinaten. Rustig en precies,
nooit schreeuwerig. Data is de held; de interface valt weg.

Waarom: gebruikers kijken 's avonds op hun telefoon. Donker is hier een gebruikskeuze,
geen genre-reflex. Amber onderscheidt ons van het blauw van Arkham en het teal van Nansen.

## Kleur (tokens in app/globals.css)
| token | waarde | gebruik |
|---|---|---|
| --bg | #06090D | pagina |
| --surface | #0B1118 | panelen |
| --surface-2 | #111A24 | hover / verhoogd |
| --line | #1A2633 | lijnen, grid |
| --line-strong | #263646 | randen van controls |
| --text | #E7EDF3 | hoofdtekst |
| --text-2 | #93A6B8 | secundair (7:1 op bg) |
| --text-3 | #6B7F92 | tertiair, alleen ≥14px (4.6:1) |
| --amber | #FFB547 | DE accentkleur: CTA, live-indicator, focus, actieve tab |
| --amber-ink | #1A1206 | tekst op amber |
| --buy | #4ADE9B | koop / instroom |
| --sell | #FF6B6B | verkoop / uitstroom |
| --flow | #7CB7FF | exchange-flows |
Eén accent. Buy/sell/flow zijn semantisch, nooit decoratief.

## Type
- Display: Archivo (variabel, wdth 62–125). Koppen in **condensed** (wdth ~75), zwaar, strak.
  Zoals de lettering op een zeekaart of instrumentpaneel.
- UI/body: Geist Sans.
- Data: Geist Mono met tabular-nums. Alleen voor getallen, adressen, tijden. Nooit als sfeer.
- Schaal: 12 / 14 / 16 / 20 / 28 / 40 / 64 / 88(px). Tracking display -0.02em, nooit < -0.04em.

## Ruimte & vorm
- 4px-basis: 4 8 12 16 24 32 48 64 96.
- Radius: 6px controls, 10px panelen. Geen pillen behalve status-dots.
- Geen kaarten-grid als paginastructuur. Panelen met 1px lijnen, zoals instrumenten in een console.
- Diepte: alleen voor overlays (menu, toast): 0 8px 24px rgba(0,0,0,.45).

## Motion (één signatuur)
- **Sonar-ping**: een nieuw event schuift van boven in (y -8 → 0, opacity, 320ms expo-out) en
  zijn status-dot zendt één ring uit. Dat is het enige "moment".
- Getallen tellen op (600ms) bij eerste weergave.
- Respecteer prefers-reduced-motion: geen beweging, direct eindstaat.

## Componenten
Button (primary amber / ghost), Badge (chain, type), Panel, Stat, DataTable, AlertRow,
ChainTag, Address (kort + kopieer), Delta (+/- met kleur), Empty state, Skeleton.

## Browser-oppervlakken
Selectie amber op amber-ink, caret amber, scrollbar in --line-strong, focus-ring 2px amber
met 2px offset, underline-offset 3px.
