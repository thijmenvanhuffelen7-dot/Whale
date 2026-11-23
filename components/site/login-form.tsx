"use client";
import { useState } from "react";
import { Mail } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/panel";

export function LoginForm({ next, configured }: { next: string; configured: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  if (!configured) {
    return <p className="text-sm text-ink-2">Login works once Supabase is configured (NEXT_PUBLIC_SUPABASE_URL and ANON_KEY).</p>;
  }

  const redirectTo = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  if (state === "sent") {
    return (
      <div role="status" className="flex flex-col gap-2">
        <p className="text-[17px] font-medium">Check your email.</p>
        <p className="text-sm text-ink-2">We sent a login link to <span className="text-ink">{email}</span>. It works once and expires after an hour.</p>
        <button onClick={() => setState("idle")} className="mt-2 self-start text-sm text-amber underline">Use a different email</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Button
        variant="ghost"
        size="lg"
        onClick={async () => {
          const { error } = await supabaseBrowser().auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
          if (error) {
            setError("Google sign-in failed. Try with your email instead.");
            setState("error");
          }
        }}
      >
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z" />
        </svg>
        Continue with Google
      </Button>

      <div className="flex items-center gap-3 text-[12px] text-ink-3">
        <span className="h-px flex-1 bg-line" /> or with email <span className="h-px flex-1 bg-line" />
      </div>

      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setState("sending");
          const { error } = await supabaseBrowser().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
          if (error) {
            setError(error.status === 429 ? "Too many attempts. Wait a minute and try again." : "Sending failed. Is your email address correct?");
            setState("error");
          } else setState("sent");
        }}
      >
        <label htmlFor="email" className="text-[13px] font-medium text-ink-2">Email address</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={inputClass + " h-12 text-[15px]"}
        />
        <Button size="lg" disabled={state === "sending"}>
          <Mail className="size-4" /> {state === "sending" ? "Sending…" : "Send login link"}
        </Button>
        {state === "error" && <p role="alert" className="text-sm text-sell">{error}</p>}
      </form>
    </div>
  );
}
