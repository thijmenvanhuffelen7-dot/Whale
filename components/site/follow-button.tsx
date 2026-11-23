import { Eye } from "lucide-react";
import { followAction } from "@/lib/actions";
import { buttonClass } from "@/components/ui/button";

export function FollowButton({ kind, chain, address, label, back }: { kind: "wallet" | "token"; chain: string; address: string; label?: string; back: string }) {
  return (
    <form action={followAction}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="chain" value={chain} />
      <input type="hidden" name="address" value={address} />
      <input type="hidden" name="label" value={label ?? ""} />
      <input type="hidden" name="min_usd" value="10000" />
      <input type="hidden" name="back" value={back} />
      <button className={buttonClass("primary", "md")}>
        <Eye className="size-4" /> {kind === "wallet" ? "Follow this wallet" : "Follow this token"}
      </button>
    </form>
  );
}
