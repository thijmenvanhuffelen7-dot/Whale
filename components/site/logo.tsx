/** Merkteken: een sonar-ping. Eén punt, twee bogen. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
        <circle cx="5" cy="19" r="2.2" fill="var(--color-amber)" />
        <path d="M5 11.5a7.5 7.5 0 0 1 7.5 7.5" stroke="var(--color-amber)" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M5 4.5A14.5 14.5 0 0 1 19.5 19" stroke="var(--color-amber)" strokeOpacity=".45" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
      <span className="display text-[22px] leading-none tracking-[-0.01em]" style={{ fontStretch: "88%" }}>
        Whale Alert
      </span>
    </span>
  );
}
