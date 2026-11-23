"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { ImageUp, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, inputClass } from "@/components/ui/panel";
import { ChainTag } from "@/components/ui/tags";
import { formatPct, formatPrice, formatUsd } from "@/lib/format";
import { DISCLAIMER } from "@/lib/messages";
import { cn } from "@/lib/cn";
import type { AnalysisResult } from "@/lib/analyse/run";

type Result = Omit<AnalysisResult, "token"> & { token: Omit<AnalysisResult["token"], "liquidityUsd"> & { liquidityUsd: number | null } };

export function AnalyseClient({ limit }: { limit: number }) {
  const [query, setQuery] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<{ result: Result; remaining: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const pick = (f: File | null) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
    if (f) setQuery("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData();
    if (query) fd.set("query", query);
    else if (file) fd.set("image", file);
    try {
      const res = await fetch("/api/analyse", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "Er ging iets mis.");
      else setData(json);
    } catch {
      setError("Geen verbinding. Probeer het opnieuw.");
    } finally {
      setBusy(false);
    }
  };

  const r = data?.result;
  return (
    <div className="flex flex-col gap-6">
      <Panel>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value) pick(null);
              }}
              placeholder="Ticker of contractadres, bijv. BONK"
              aria-label="Ticker of contractadres"
              className={inputClass + " h-12 flex-1 text-[15px]"}
            />
            <Button size="lg" disabled={busy || (!query && !file)}>
              <Search className="size-4" /> {busy ? "Analyseren…" : "Analyseer"}
            </Button>
          </div>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pick(e.dataTransfer.files[0] ?? null);
            }}
            className="flex flex-wrap items-center gap-4 rounded-[var(--radius-ctl)] border border-dashed border-line-strong p-4"
          >
            {preview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Gekozen screenshot" className="h-16 w-auto rounded border border-line" />
                <span className="text-sm text-ink-2">{file?.name}</span>
                <button type="button" onClick={() => pick(null)} aria-label="Screenshot weghalen" className="ml-auto rounded p-1.5 text-ink-3 hover:text-ink">
                  <X className="size-4" />
                </button>
              </>
            ) : (
              <>
                <ImageUp className="size-5 text-ink-3" />
                <span className="text-sm text-ink-2">Of sleep een chart-screenshot hierheen.</span>
                <button type="button" onClick={() => input.current?.click()} className="text-sm text-amber underline">Kies bestand</button>
              </>
            )}
            <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          </div>
          <p className="text-[12px] text-ink-3">{limit} analyses per dag. {data ? `Nog ${data.remaining} over vandaag.` : ""}</p>
          {error && <p role="alert" className="text-sm text-sell">{error}</p>}
        </form>
      </Panel>

      {r && (
        <Panel
          title={<span className="flex items-center gap-2 text-ink">{r.token.name ?? r.token.symbol} <span className="text-ink-3">${r.token.symbol}</span> <ChainTag chain={r.token.chain} /></span>}
          action={<Link href={`/token/${r.token.chain}/${r.token.address}`} className="text-[13px] text-ink-2 hover:text-ink">Tokenpagina</Link>}
        >
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            {[
              ["Prijs", formatPrice(r.token.priceUsd)],
              ["24u", formatPct(r.token.priceChange24hPct)],
              ["Volume 24u", formatUsd(r.token.volume24hUsd)],
              ["Liquiditeit", r.token.liquidityUsd == null ? "—" : formatUsd(r.token.liquidityUsd)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[12px] text-ink-3">{k}</dt>
                <dd className={cn("num mt-0.5 text-[18px] font-medium", k === "24u" && (r.token.priceChange24hPct ?? 0) >= 0 ? "text-buy" : k === "24u" ? "text-sell" : "")}>{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 border-t border-line pt-5">
            <h3 className="text-[13px] font-medium text-ink-2">Gevolgde wallets, 7 dagen</h3>
            <p className="mt-2 text-[15px]">
              {r.stats.buys + r.stats.sells === 0
                ? "Geen activiteit van gevolgde wallets."
                : `${r.stats.buys}× gekocht (${formatUsd(r.stats.buyUsd)}), ${r.stats.sells}× verkocht (${formatUsd(r.stats.sellUsd)}).`}
            </p>
          </div>
          {r.summary && (
            <div className="mt-5 border-t border-line pt-5">
              <h3 className="text-[13px] font-medium text-ink-2">Samenvatting</h3>
              <p className="mt-2 max-w-[68ch] whitespace-pre-line text-[15px] leading-relaxed">{r.summary}</p>
            </div>
          )}
          {r.news.length > 0 && (
            <div className="mt-5 border-t border-line pt-5">
              <h3 className="text-[13px] font-medium text-ink-2">Nieuws</h3>
              <ul className="mt-2 flex flex-col gap-1.5">
                {r.news.slice(0, 4).map((n) => (
                  <li key={n.url}><a href={n.url} target="_blank" rel="noopener noreferrer" className="text-[15px] text-ink hover:text-amber">{n.title}</a></li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-6 text-[12px] text-ink-3">{DISCLAIMER}</p>
        </Panel>
      )}
    </div>
  );
}
