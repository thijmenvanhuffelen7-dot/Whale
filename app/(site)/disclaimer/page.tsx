import type { Metadata } from "next";
import { LegalPage, Fill } from "@/components/site/legal";
export const metadata: Metadata = { title: "Disclaimer", alternates: { canonical: "/disclaimer" } };
export default function Page() {
  return (
    <LegalPage title="Disclaimer" updated="23 november 2026">
      <p><strong>Geen financieel advies. Alleen informatie.</strong></p>
      <p>Whale Alert toont publieke gegevens van de Ethereum- en Solana-blockchains. Wij geven geen beleggingsadvies, doen geen voorspellingen en raden geen aan- of verkoop aan. Alles wat je ziet, inclusief AI-samenvattingen, is informatie en geen aanbeveling.</p>
      <p>Labels van wallets zijn een beste inschatting. Bedragen in USD zijn berekend met de prijs op het moment van melden en kunnen afwijken. AI-samenvattingen kunnen fouten bevatten.</p>
      <p>Cryptovaluta zijn zeer risicovol. Je kunt je hele inleg verliezen. Neem beslissingen op basis van je eigen onderzoek en, waar nodig, het advies van een erkende adviseur.</p>
      <p>Wij vragen nooit om je wallet, private key of seed phrase. Contact: <Fill>e-mailadres</Fill>.</p>
    </LegalPage>
  );
}
