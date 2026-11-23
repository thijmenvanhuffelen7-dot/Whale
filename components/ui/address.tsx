"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { shortAddress } from "@/lib/messages";
import { cn } from "@/lib/cn";

export function Address({ value, full = false, className }: { value: string; full?: boolean; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className={cn("num inline-flex min-w-0 items-center gap-1.5 text-ink-2", className)}>
      <span className={cn(full ? "break-all" : "truncate")} title={value}>
        {full ? value : shortAddress(value)}
      </span>
      <button
        type="button"
        aria-label={copied ? "Copied" : "Copy address"}
        onClick={() => {
          navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          });
        }}
        className="shrink-0 rounded p-0.5 text-ink-3 transition-colors hover:text-ink"
      >
        {copied ? <Check className="size-3.5 text-buy" /> : <Copy className="size-3.5" />}
      </button>
    </span>
  );
}
