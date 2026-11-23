import type { Metadata } from "next";
import { LegalPage, Fill } from "@/components/site/legal";
export const metadata: Metadata = { title: "Privacy", alternates: { canonical: "/privacy" } };
export default function Page() {
  return (
    <LegalPage title="Privacy" updated="23 november 2026">
      <p>Verwerkingsverantwoordelijke: <Fill>bedrijfsnaam en contactgegevens</Fill>.</p>
      <h2>Wat we verwerken</h2>
      <ul>
        <li>E-mailadres, voor inloggen en (als je dat aanzet) alerts per e-mail.</li>
        <li>Telegram-gebruikers-ID en -naam, als je je account koppelt, voor DM-alerts en toegang tot de Pro-groep.</li>
        <li>Je watchlist en drempels.</li>
        <li>Betaalgegevens worden verwerkt door Stripe. Wij zien geen kaartnummers.</li>
        <li>Gebruik van analyses (tijdstip en zoekterm), voor de daglimiet.</li>
      </ul>
      <h2>Verwerkers</h2>
      <p>Supabase (database en login), Vercel (hosting), Stripe (betalingen), Telegram (berichten), Groq en Tavily (AI-samenvattingen en nieuws; we sturen daar alleen tokendata heen, geen persoonsgegevens). <Fill>doorgifte buiten de EU en waarborgen</Fill></p>
      <h2>Bewaartermijnen</h2>
      <p>Account- en abonnementsgegevens zolang je account bestaat, plus de wettelijke fiscale bewaartermijn. Analyse-logs 35 dagen. <Fill>overige termijnen</Fill></p>
      <h2>Je rechten</h2>
      <p>Je kunt je gegevens inzien, laten corrigeren of verwijderen via <Fill>e-mailadres</Fill>. Je kunt een klacht indienen bij de Autoriteit Persoonsgegevens.</p>
    </LegalPage>
  );
}
