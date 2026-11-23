import { isEthAddress, isSolAddress, normAddr, type Chain } from "@/lib/chain/types";

const TYPES = ["smart_money", "whale", "exchange"] as const;
type WType = (typeof TYPES)[number];

export type WalletInput = { chain: Chain; address: string; label: string; type: WType; entity: string | null };

/** Eén CSV-regel → wallet. Formaat: chain,address,label[,type][,entity]. Puur, getest. */
export function parseWalletCsv(text: string): { rows: WalletInput[]; errors: string[] } {
  const rows: WalletInput[] = [];
  const errors: string[] = [];
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .forEach((line, i) => {
      if (!line || line.startsWith("#") || /^chain\s*,/i.test(line)) return;
      const [c, a, label, t, entity] = line.split(",").map((s) => s?.trim().replace(/^"|"$/g, ""));
      const chain = c?.toLowerCase();
      if (chain !== "eth" && chain !== "sol") return errors.push(`Row ${i + 1}: chain must be eth or sol`);
      if (chain === "eth" ? !isEthAddress(a ?? "") : !isSolAddress(a ?? "")) return errors.push(`Row ${i + 1}: invalid address`);
      if (!label) return errors.push(`Row ${i + 1}: label is missing`);
      const type = (t?.toLowerCase() || "whale") as WType;
      if (!TYPES.includes(type)) return errors.push(`Row ${i + 1}: type must be smart_money, whale or exchange`);
      rows.push({ chain, address: normAddr(chain, a!), label: label.slice(0, 60), type, entity: entity || null });
    });
  return { rows, errors };
}

