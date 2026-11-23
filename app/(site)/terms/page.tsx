import type { Metadata } from "next";
import { LegalPage, Fill } from "@/components/site/legal";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of service", alternates: { canonical: "/terms" } };

export default function Page() {
  return (
    <LegalPage title="Terms" updated="November 23, 2026">
      <p>
        These terms apply to the use of {SITE.name}, provided by <Fill>company name</Fill>, registered under number{" "}
        <Fill>company registration number</Fill>, located at <Fill>address</Fill>.
      </p>
      <h2>1. The service</h2>
      <p>{SITE.name} provides information about public blockchain transactions through the website and Telegram. The service is informational. See the disclaimer.</p>
      <h2>2. Account and subscription</h2>
      <p>
        Pro is a monthly or yearly subscription that renews automatically. You can cancel anytime through the customer portal;
        Pro stays active until the end of the current period. <Fill>right of withdrawal and refund policy</Fill>
      </p>
      <h2>3. Telegram groups</h2>
      <p>
        Access to the Pro group is personal and lasts as long as your subscription is active. When it ends, you are removed from
        the group automatically. Forwarding Pro alerts to third parties is not allowed.
      </p>
      <h2>4. Availability and liability</h2>
      <p>
        We do our best to keep the service available, but give no guarantee of completeness, accuracy or timeliness.{" "}
        <Fill>limitation of liability</Fill>
      </p>
      <h2>5. Governing law</h2>
      <p>
        <Fill>governing law and competent court</Fill>
      </p>
    </LegalPage>
  );
}
