"use client";
import { useActionState } from "react";
import { addWatch, type ActionState } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/panel";

export function WatchForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(addWatch, null);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[120px_120px_1fr_1fr_140px_auto] lg:items-end">
      <Field label="Soort">
        <select name="kind" className={inputClass} defaultValue="wallet">
          <option value="wallet">Wallet</option>
          <option value="token">Token</option>
        </select>
      </Field>
      <Field label="Chain">
        <select name="chain" className={inputClass} defaultValue="sol">
          <option value="sol">Solana</option>
          <option value="eth">Ethereum</option>
        </select>
      </Field>
      <Field label="Adres">
        <input name="address" required placeholder="0x… of base58" className={inputClass + " num"} autoComplete="off" spellCheck={false} />
      </Field>
      <Field label="Naam (optioneel)">
        <input name="label" placeholder="Bijv. Mijn favoriete whale" className={inputClass} maxLength={60} />
      </Field>
      <Field label="Alert vanaf (USD)">
        <input name="min_usd" defaultValue="10000" inputMode="numeric" className={inputClass + " num"} />
      </Field>
      <Button disabled={pending} className="h-10">{pending ? "Toevoegen…" : "Toevoegen"}</Button>
      <p role="status" aria-live="polite" className={"text-sm sm:col-span-2 lg:col-span-6 " + (state?.error ? "text-sell" : "text-buy")}>
        {state?.error ?? state?.message ?? ""}
      </p>
    </form>
  );
}
