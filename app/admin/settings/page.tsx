import { getAllSettings } from "@/lib/settings";
import { Panel } from "@/components/ui/panel";
import { SettingsForm } from "@/components/admin/forms";

export default async function AdminSettings() {
  const s = await getAllSettings();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="display text-[40px] sm:text-[48px]">Settings</h1>
      <Panel title="Alerts">
        <SettingsForm
          s={{
            alert_threshold_usd: Number(s.alert_threshold_usd),
            swap_threshold_usd: Number(s.swap_threshold_usd),
            min_liquidity_usd: Number(s.min_liquidity_usd),
            throttle_seconds: Number(s.throttle_seconds),
            analyse_daily_limit: Number(s.analyse_daily_limit),
            alerts_paused: Boolean(s.alerts_paused),
          }}
        />
      </Panel>
      <Panel title="Telegram">
        <p className="num text-sm text-ink-2">chat_id: {String(s.chat_id ?? "not set")} · topics ETH {String(s.topic_eth ?? "—")} / SOL {String(s.topic_sol ?? "—")} / digest {String(s.topic_digest ?? "—")}</p>
        <p className="mt-2 text-[13px] text-ink-3">To change: type /setup in the group.</p>
      </Panel>
    </div>
  );
}
