import { requireProfile, planOf } from "@/lib/auth";
import { AnalyseClient } from "@/components/app/analyse-client";

export default async function AnalysePage() {
  const p = await requireProfile("/app/analyze");
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="display text-[40px] sm:text-[48px]">Analyze</h1>
        <p className="mt-2 max-w-[60ch] text-sm text-ink-2">
          Price, liquidity, whale activity and news for one coin. Type a ticker or address, or upload a chart screenshot. You get facts, never buy advice.
        </p>
      </div>
      <AnalyseClient limit={planOf(p).analysesPerDay} />
    </div>
  );
}
