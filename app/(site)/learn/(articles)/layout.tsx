import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { DISCLAIMER } from "@/lib/messages";

export default function ArticleLayout({ children }: { children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-[760px] px-4 py-16 sm:px-6">
      <Link href="/learn" className="mb-10 inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" /> Alle artikelen
      </Link>
      <div className="prose-whale [&>h1]:display [&>h1]:mb-8 [&>h1]:text-[44px] [&>h1]:text-ink sm:[&>h1]:text-[56px]">{children}</div>
      <aside className="mt-16 flex flex-col items-start gap-4 border-t border-line pt-8">
        <p className="text-[15px] text-ink-2">Zie het in de praktijk, met de wallets die wij volgen.</p>
        <ButtonLink href="/feed">Open de live feed</ButtonLink>
        <p className="text-[12px] text-ink-3">{DISCLAIMER}</p>
      </aside>
    </article>
  );
}
