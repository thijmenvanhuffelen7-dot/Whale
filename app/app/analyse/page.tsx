import { requireProfile, planOf } from "@/lib/auth";
import { AnalyseClient } from "@/components/app/analyse-client";

export default async function AnalysePage() {
  const p = await requireProfile("/app/analyse");
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="display text-[40px] sm:text-[48px]">Analyse</h1>
        <p className="mt-2 max-w-[60ch] text-sm text-ink-2">
          Prijs, liquiditeit, whale-activiteit en nieuws over één coin. Typ een ticker of adres, of upload een screenshot van een chart. Je krijgt feiten, nooit koopadvies.
        </p>
      </div>
      <AnalyseClient limit={planOf(p).analysesPerDay} />
    </div>
  );
}
