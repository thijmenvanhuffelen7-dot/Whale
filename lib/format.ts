/** Getallen in NL-notatie: $84.200 en 12,4M. */

const nlInt = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });

export function formatUsd(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "?";
  if (Math.abs(v) >= 10_000_000) return "$" + compact(v);
  if (Math.abs(v) >= 1) return "$" + nlInt.format(Math.round(v));
  return "$" + formatPrice(v).replace(/^\$/, "");
}

/** Prijzen kunnen heel klein zijn (memecoins): toon significante cijfers. */
export function formatPrice(v: number): string {
  if (v >= 1) return "$" + new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 2 }).format(v);
  return "$" + new Intl.NumberFormat("nl-NL", { maximumSignificantDigits: 4 }).format(v);
}

export function compact(v: number): string {
  const abs = Math.abs(v);
  const units: [number, string][] = [
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [n, s] of units) {
    if (abs >= n) {
      const x = v / n;
      const digits = Math.abs(x) >= 100 ? 0 : 1;
      return new Intl.NumberFormat("nl-NL", { maximumFractionDigits: digits }).format(x) + s;
    }
  }
  if (abs >= 1) return new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 2 }).format(v);
  return new Intl.NumberFormat("nl-NL", { maximumSignificantDigits: 4 }).format(v);
}

export function formatPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "?";
  const s = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 }).format(v);
  return (v > 0 ? "+" : "") + s + "%";
}
