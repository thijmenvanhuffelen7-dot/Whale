export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-[760px] px-4 py-16 sm:px-6">
      <h1 className="display text-[48px] sm:text-[60px]">{title}</h1>
      <p className="mt-3 text-sm text-ink-3">Last updated: {updated}</p>
      <div className="prose-whale mt-10">{children}</div>
    </article>
  );
}

/** Duidelijke placeholder die jij moet invullen (laat door een jurist checken). */
export function Fill({ children }: { children: React.ReactNode }) {
  return <mark className="rounded bg-amber-dim px-1 text-amber">[TO FILL IN: {children}]</mark>;
}
