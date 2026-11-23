import type { Metadata } from "next";
import { LegalPage, Fill } from "@/components/site/legal";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Disclaimer", alternates: { canonical: "/disclaimer" } };

export default function Page() {
  return (
    <LegalPage title="Disclaimer" updated="November 23, 2026">
      <p>
        <strong>Not financial advice. Information only.</strong>
      </p>
      <p>
        {SITE.name} shows public data from the Ethereum and Solana blockchains. We do not give investment advice, make no
        predictions and do not recommend buying or selling anything. Everything you see, including AI summaries, is information
        and not a recommendation.
      </p>
      <p>
        Wallet labels are a best estimate. USD amounts are calculated with the price at the time of the alert and may differ. AI
        summaries can contain mistakes.
      </p>
      <p>
        Cryptocurrencies are highly risky. You can lose your entire investment. Make decisions based on your own research and,
        where needed, the advice of a licensed advisor.
      </p>
      <p>
        We will never ask for your wallet, private key or seed phrase. Contact: <Fill>email address</Fill>.
      </p>
    </LegalPage>
  );
}
