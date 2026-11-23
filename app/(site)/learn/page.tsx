import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ARTICLES } from "@/lib/learn";

export const metadata: Metadata = {
  title: "Learn",
  description: "Guides on smart money, whales and exchange flows: what on-chain data does and doesn't tell you.",
  alternates: { canonical: "/learn" },
};

export default function LearnIndex() {
  return (
    <div className="mx-auto max-w-[880px] px-4 py-16 sm:px-6">
      <h1 className="display text-[56px] sm:text-[76px]">Learn</h1>
      <p className="mt-4 max-w-[52ch] text-[17px] text-ink-2">What on-chain data tells you, and what it doesn’t.</p>
      <ul className="mt-12 divide-y divide-line border-y border-line">
        {ARTICLES.map((a) => (
          <li key={a.slug}>
            <Link href={`/learn/${a.slug}`} className="group grid gap-2 py-7 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-8">
              <span>
                <span className="block text-[22px] font-medium transition-colors group-hover:text-amber">{a.title}</span>
                <span className="mt-1.5 block max-w-[60ch] text-[15px] text-ink-2">{a.description}</span>
              </span>
              <span className="flex items-center gap-2 text-[13px] text-ink-3">
                {a.minutes} min <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
