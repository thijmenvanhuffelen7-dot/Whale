"use client";
import { useActionState } from "react";
import { saveNotifications, type ActionState } from "@/lib/actions";
import { Button } from "@/components/ui/button";

export function NotifyForm({ telegram, email, pro, linked }: { telegram: boolean; email: boolean; pro: boolean; linked: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveNotifications, null);
  const row = (name: string, label: string, hint: string, checked: boolean, disabled = false) => (
    <label className={"flex items-start gap-3 " + (disabled ? "opacity-50" : "cursor-pointer")}>
      <input type="checkbox" name={name} defaultChecked={checked} disabled={disabled} className="mt-1 size-4 accent-[var(--color-amber)]" />
      <span>
        <span className="block text-[15px] font-medium">{label}</span>
        <span className="block text-[13px] text-ink-2">{hint}</span>
      </span>
    </label>
  );
  return (
    <form action={action} className="flex flex-col gap-5">
      {row("notify_telegram", "Telegram-DM", pro ? (linked ? "Alerts voor je watchlist in je DM." : "Koppel eerst Telegram hierboven.") : "Onderdeel van Pro.", telegram, !pro || !linked)}
      {row("notify_email", "E-mail", pro ? "Alerts voor je watchlist per e-mail (max. 1 per item per 10 minuten)." : "Onderdeel van Pro.", email, !pro)}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" disabled={pending}>{pending ? "Opslaan…" : "Opslaan"}</Button>
        <span role="status" className={state?.error ? "text-sm text-sell" : "text-sm text-buy"}>{state?.error ?? state?.message ?? ""}</span>
      </div>
    </form>
  );
}
