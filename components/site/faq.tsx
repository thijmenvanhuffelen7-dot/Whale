import { ChevronDown } from "lucide-react";

export const FAQ = [
  {
    q: "Is this financial advice?",
    a: "No. We show what happens publicly on-chain: who sends, buys or sells what. We never tell you what to do and we never predict prices.",
  },
  {
    q: "Do I need to connect my wallet?",
    a: "No, never. We only read public blockchain data. If anyone asks for your wallet or seed phrase on our behalf, it is not us.",
  },
  {
    q: "Where do the labels come from?",
    a: "We track a list of wallets that we curate and label ourselves: known whales, funds, active traders and exchange wallets. A label is a best estimate, not a guarantee.",
  },
  {
    q: "What's the difference between Free and Pro?",
    a: "Free sees everything with a 15-minute delay. Pro sees it instantly, can follow unlimited wallets, gets personal alerts by Telegram DM and joins the private Pro group.",
  },
  {
    q: "Which chains?",
    a: "Ethereum and Solana. More chains will follow once we can read them just as reliably.",
  },
  {
    q: "How do I cancel?",
    a: "In your account, with one click through the Stripe customer portal. You keep Pro until the end of your billing period.",
  },
];

export function Faq() {
  return (
    <div className="divide-y divide-line border-y border-line">
      {FAQ.map((f) => (
        <details key={f.q} className="group py-1">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-4 text-[16px] font-medium text-ink [&::-webkit-details-marker]:hidden">
            {f.q}
            <ChevronDown className="size-4 shrink-0 text-ink-3 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <p className="max-w-[68ch] pb-5 text-[15px] leading-relaxed text-ink-2">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
