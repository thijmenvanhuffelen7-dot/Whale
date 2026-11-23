"use client";
import { useActionState } from "react";
import { importWallets, saveSettings, sendTestAlert, type AdminState } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/panel";

function Status({ state }: { state: AdminState }) {
  return (
    <p role="status" aria-live="polite" className={"text-sm " + (state?.error ? "text-sell" : "text-buy")}>
      {state?.error ?? state?.message ?? ""}
    </p>
  );
}

export function TestAlertButton() {
  const [state, action, pending] = useActionState<AdminState>(async () => sendTestAlert(), null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <Button variant="ghost" size="sm" disabled={pending}>{pending ? "Versturen…" : "Testalert sturen"}</Button>
      <Status state={state} />
    </form>
  );
}

export function ImportForm() {
  const [state, action, pending] = useActionState<AdminState, FormData>(importWallets, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Plak CSV" hint="chain,address,label[,type][,entity] — type: smart_money, whale of exchange. Eén wallet per regel.">
        <textarea
          name="csv"
          rows={5}
          spellCheck={false}
          placeholder={"sol,7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU,Fund A,smart_money\neth,0x28c6c06298d514db089934071355e5743bf21d60,Binance 14,exchange,Binance"}
          className={inputClass + " num h-auto py-2 text-[13px]"}
        />
      </Field>
      <Field label="Of upload een .csv">
        <input type="file" name="file" accept=".csv,text/csv" className="text-sm text-ink-2 file:mr-3 file:rounded file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-ink" />
      </Field>
      <div className="flex items-center gap-4">
        <Button disabled={pending}>{pending ? "Importeren…" : "Opslaan"}</Button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function SettingsForm({ s }: { s: Record<string, number | boolean> }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(saveSettings, null);
  const num = (key: string, label: string, hint: string) => (
    <Field label={label} hint={hint}>
      <input name={key} defaultValue={String(s[key])} inputMode="numeric" className={inputClass + " num"} />
    </Field>
  );
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      {num("alert_threshold_usd", "Drempel transfers en exchange-flows (USD)", "Ook via /threshold in de bot.")}
      {num("swap_threshold_usd", "Drempel smart-money-swaps (USD)", "Swaps zijn meestal kleiner dan transfers.")}
      {num("min_liquidity_usd", "Minimale liquiditeit (USD)", "Daaronder = spam/dust, niet melden.")}
      {num("throttle_seconds", "Throttle per wallet (seconden)", "Max. 1 bericht per wallet per …; de rest wordt gebundeld.")}
      {num("analyse_daily_limit", "/analyse per gebruiker per dag (Telegram)", "Admins hebben geen limiet.")}
      <label className="flex items-center gap-3 self-end pb-2">
        <input type="checkbox" name="alerts_paused" defaultChecked={Boolean(s.alerts_paused)} className="size-4 accent-[var(--color-amber)]" />
        <span className="text-sm">Alerts gepauzeerd</span>
      </label>
      <div className="flex items-center gap-4 sm:col-span-2">
        <Button disabled={pending}>{pending ? "Opslaan…" : "Opslaan"}</Button>
        <Status state={state} />
      </div>
    </form>
  );
}
