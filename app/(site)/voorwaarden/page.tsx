import type { Metadata } from "next";
import { LegalPage, Fill } from "@/components/site/legal";
export const metadata: Metadata = { title: "Algemene voorwaarden", alternates: { canonical: "/voorwaarden" } };
export default function Page() {
  return (
    <LegalPage title="Voorwaarden" updated="23 november 2026">
      <p>Deze voorwaarden gelden voor het gebruik van Whale Alert, aangeboden door <Fill>bedrijfsnaam</Fill>, KvK <Fill>KvK-nummer</Fill>, gevestigd te <Fill>adres</Fill>.</p>
      <h2>1. De dienst</h2>
      <p>Whale Alert levert informatie over publieke blockchain-transacties via de website en Telegram. De dienst is informatief. Zie de disclaimer.</p>
      <h2>2. Account en abonnement</h2>
      <p>Pro is een abonnement per maand of per jaar dat automatisch wordt verlengd. Opzeggen kan altijd via het klantportaal; Pro blijft actief tot het einde van de lopende periode. <Fill>herroepingsrecht en terugbetalingsbeleid</Fill></p>
      <h2>3. Telegram-groepen</h2>
      <p>Toegang tot de Pro-groep is persoonlijk en loopt zolang je abonnement actief is. Bij beëindiging word je automatisch uit de groep verwijderd. Doorsturen van Pro-meldingen naar derden is niet toegestaan.</p>
      <h2>4. Beschikbaarheid en aansprakelijkheid</h2>
      <p>We doen ons best de dienst continu beschikbaar te houden, maar geven geen garantie op volledigheid, juistheid of tijdigheid. <Fill>aansprakelijkheidsbeperking</Fill></p>
      <h2>5. Toepasselijk recht</h2>
      <p>Op deze voorwaarden is Nederlands recht van toepassing. <Fill>bevoegde rechter</Fill></p>
    </LegalPage>
  );
}
