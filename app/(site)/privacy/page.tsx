import type { Metadata } from "next";
import { LegalPage, Fill } from "@/components/site/legal";

export const metadata: Metadata = { title: "Privacy policy", alternates: { canonical: "/privacy" } };

export default function Page() {
  return (
    <LegalPage title="Privacy" updated="November 23, 2026">
      <p>
        Data controller: <Fill>company name and contact details</Fill>.
      </p>
      <h2>What we process</h2>
      <ul>
        <li>Your email address, for logging in and (if you turn it on) email alerts.</li>
        <li>Your Telegram user ID and username, if you link your account, for DM alerts and access to the Pro group.</li>
        <li>Your watchlist and thresholds.</li>
        <li>Payment details are processed by Stripe. We never see card numbers.</li>
        <li>Use of analyses (time and search term), for the daily limit.</li>
      </ul>
      <h2>Processors</h2>
      <p>
        Supabase (database and login), Vercel (hosting), Stripe (payments), Telegram (messages), Groq and Tavily (AI summaries and
        news; we only send token data there, no personal data). <Fill>transfers outside the EU and safeguards</Fill>
      </p>
      <h2>Retention</h2>
      <p>
        Account and subscription data for as long as your account exists, plus the statutory tax retention period. Analysis logs
        for 35 days. <Fill>other retention periods</Fill>
      </p>
      <h2>Your rights</h2>
      <p>
        You can access, correct or delete your data via <Fill>email address</Fill>. You can also file a complaint with your data
        protection authority.
      </p>
    </LegalPage>
  );
}
