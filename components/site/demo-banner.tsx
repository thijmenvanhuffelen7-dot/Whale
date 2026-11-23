import { demoEnabled } from "@/lib/demo";

/** Altijd zichtbaar in demo-modus: dit zijn geen echte cijfers. */
export function DemoBanner() {
  if (!demoEnabled()) return null;
  return (
    <div role="note" className="bg-amber px-4 py-1.5 text-center text-[13px] font-medium text-amber-ink">
      Demo data for design review. Not real transactions. Turn off DEMO_DATA in production.
    </div>
  );
}
