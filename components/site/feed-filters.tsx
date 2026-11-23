"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/cn";
import { inputClass } from "@/components/ui/panel";

const CHAINS = [
  ["", "All chains"],
  ["eth", "Ethereum"],
  ["sol", "Solana"],
];
const TYPES = [
  ["", "All types"],
  ["swap_buy", "Buys"],
  ["swap_sell", "Sells"],
  ["exchange_deposit", "To exchange"],
  ["exchange_withdrawal", "From exchange"],
  ["transfer", "Transfers"],
];
const MIN = [
  ["", "Any amount"],
  ["50000", "> $50K"],
  ["250000", "> $250K"],
  ["1000000", "> $1M"],
  ["10000000", "> $10M"],
];

export function FeedFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    start(() => router.replace(`/feed?${next.toString()}`, { scroll: false }));
  };

  const select = (key: string, opts: string[][], label: string) => (
    <label className="flex flex-col gap-1">
      <span className="sr-only">{label}</span>
      <select
        value={params.get(key) ?? ""}
        onChange={(e) => set(key, e.target.value)}
        className={cn(inputClass, "cursor-pointer pr-8 sm:w-auto")}
      >
        {opts.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );

  return (
    <form
      role="search"
      aria-busy={pending}
      onSubmit={(e) => {
        e.preventDefault();
        set("token", String(new FormData(e.currentTarget).get("token") ?? "").trim());
      }}
      className={cn("grid grid-cols-2 gap-2 transition-opacity sm:flex sm:flex-wrap", pending && "opacity-60")}
    >
      {select("chain", CHAINS, "Chain")}
      {select("type", TYPES, "Type")}
      {select("minUsd", MIN, "Minimum amount")}
      <input
        name="token"
        defaultValue={params.get("token") ?? ""}
        placeholder="Token: ticker or address"
        aria-label="Filter by token"
        className={cn(inputClass, "sm:w-60")}
      />
    </form>
  );
}
