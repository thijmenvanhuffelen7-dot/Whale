import { ChevronDown } from "lucide-react";

export const FAQ = [
  {
    q: "Is dit financieel advies?",
    a: "Nee. We laten zien wat er publiek on-chain gebeurt: wie wat verstuurt, koopt of verkoopt. We zeggen nooit wat jij moet doen en voorspellen geen koersen.",
  },
  {
    q: "Moet ik mijn wallet koppelen?",
    a: "Nee, nooit. We lezen alleen publieke blockchain-data. Vraagt iemand namens ons om je wallet of seed phrase: dat zijn wij niet.",
  },
  {
    q: "Waar komen de labels vandaan?",
    a: "We volgen een lijst wallets die we zelf samenstellen en labelen: bekende whales, fondsen, actieve traders en de wallets van exchanges. Een label is een beste inschatting, geen garantie.",
  },
  {
    q: "Wat is het verschil tussen Free en Pro?",
    a: "Free ziet alles met 15 minuten vertraging. Pro ziet het direct, kan onbeperkt wallets volgen, krijgt eigen alerts via een Telegram-DM en komt in de privé Pro-groep.",
  },
  {
    q: "Welke chains?",
    a: "Ethereum en Solana. Meer chains komen als we ze net zo betrouwbaar kunnen lezen.",
  },
  {
    q: "Hoe zeg ik op?",
    a: "In je account, met één klik via het Stripe-klantportaal. Je houdt Pro tot het einde van je periode.",
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
