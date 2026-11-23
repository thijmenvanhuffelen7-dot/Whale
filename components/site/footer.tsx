import Link from "next/link";
import { Logo } from "@/components/site/logo";
import { DISCLAIMER } from "@/lib/messages";
import { SITE } from "@/lib/site";

const COLS = [
  { title: "Product", links: [["/feed", "Live feed"], ["/wallets", "Wallets"], ["/pricing", "Pricing"], ["/app", "Dashboard"]] },
  { title: "Learn", links: [["/learn/what-is-smart-money", "What is smart money"], ["/learn/reading-exchange-flows", "Reading exchange flows"], ["/learn/how-to-read-a-whale-alert", "How to read an alert"]] },
  { title: "Legal", links: [["/disclaimer", "Disclaimer"], ["/terms", "Terms"], ["/privacy", "Privacy"]] },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-[34ch] text-sm text-ink-2">
            Public on-chain data from Ethereum and Solana, read and reported. {DISCLAIMER}
          </p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <h3 className="mb-3 text-[13px] font-medium text-ink-3">{c.title}</h3>
            <ul className="flex flex-col gap-2">
              {c.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-ink-2 transition-colors hover:text-ink">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-[1240px] px-4 py-5 text-[12px] text-ink-3 sm:px-6">
          © {new Date().getFullYear()} {SITE.name}. We never trade for you and never ask for your wallet.
        </p>
      </div>
    </footer>
  );
}
