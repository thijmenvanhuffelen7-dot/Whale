import { supabaseAdmin } from "@/lib/supabase/admin";
import { deleteWallet, toggleWallet } from "@/lib/admin-actions";
import { Panel } from "@/components/ui/panel";
import { ImportForm } from "@/components/admin/forms";
import { ChainTag, WalletTypeTag } from "@/components/ui/tags";
import { Address } from "@/components/ui/address";
import { cn } from "@/lib/cn";

export default async function AdminWallets({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  let q = supabaseAdmin().from("wallets").select("id, chain, address, label, type, entity, active, created_at").order("created_at", { ascending: false }).limit(1000);
  if (type === "smart_money" || type === "whale" || type === "exchange") q = q.eq("type", type);
  const { data: wallets } = await q;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="display text-[40px] sm:text-[48px]">Wallets &amp; labels</h1>
      <Panel title="Toevoegen of bulk importeren">
        <ImportForm />
      </Panel>
      <Panel
        title={`${wallets?.length ?? 0} wallets`}
        action={
          <nav className="flex gap-1 text-[13px]">
            {[["", "Alle"], ["smart_money", "Smart money"], ["whale", "Whales"], ["exchange", "Exchanges"]].map(([v, l]) => (
              <a key={v} href={v ? `?type=${v}` : "?"} className={cn("rounded px-2 py-1", (type ?? "") === v ? "bg-surface-2 text-ink" : "text-ink-2 hover:text-ink")}>{l}</a>
            ))}
          </nav>
        }
        bodyClassName="p-0 sm:p-0"
      >
        <ul>
          {(wallets ?? []).map((w) => (
            <li key={w.id} className={cn("grid grid-cols-[1fr_auto] items-center gap-3 border-b border-line px-5 py-3 last:border-b-0 md:grid-cols-[50px_1fr_260px_120px_auto]", !w.active && "opacity-50")}>
              <span className="hidden md:block"><ChainTag chain={w.chain} /></span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{w.label}</span>
                <span className="flex gap-2"><WalletTypeTag type={w.type} />{w.entity && <span className="text-[12px] text-ink-3">{w.entity}</span>}</span>
              </span>
              <Address value={w.address} className="hidden text-[13px] md:inline-flex" />
              <form action={toggleWallet} className="hidden md:block">
                <input type="hidden" name="id" value={w.id} />
                <input type="hidden" name="active" value={String(!w.active)} />
                <button className="text-[13px] text-ink-2 hover:text-ink">{w.active ? "Pauzeren" : "Activeren"}</button>
              </form>
              <form action={deleteWallet}>
                <input type="hidden" name="id" value={w.id} />
                <button className="text-[13px] text-ink-3 hover:text-sell" aria-label={`${w.label} verwijderen`}>Verwijderen</button>
              </form>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
