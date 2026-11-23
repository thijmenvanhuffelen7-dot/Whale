/**
 * Maak (of update) de Helius- en Alchemy-webhooks en zet alle gevolgde
 * adressen erin. Draai opnieuw na een nieuwe tunnel-URL of deploy.
 *
 *   npm run webhooks:register -- https://jouw-domein.vercel.app
 *
 * Eerste keer: het script print HELIUS_WEBHOOK_ID, ALCHEMY_WEBHOOK_ID en de
 * ALCHEMY_WEBHOOK_SIGNING_KEY. Zet die in .env.local (en in Vercel).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const HELIUS = "https://api.helius.xyz/v0/webhooks";
const ALCHEMY = "https://dashboard.alchemy.com/api";

async function main() {
  const { addressesToWatch, heliusWebhookBody, updateAlchemy } = await import("../lib/providers");
  const base = (process.argv[2] ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  if (!base.startsWith("https://")) throw new Error("Geef een https-URL mee (tunnel of Vercel-domein).");

  // ---------- Helius (Solana) ----------
  const hKey = process.env.HELIUS_API_KEY;
  const hAuth = process.env.HELIUS_WEBHOOK_AUTH;
  if (hKey && hAuth) {
    const sol = await addressesToWatch("sol");
    const list = sol.length ? sol : ["11111111111111111111111111111111"];
    const body = JSON.stringify(heliusWebhookBody(`${base}/api/webhooks/helius`, list, hAuth));
    const id = process.env.HELIUS_WEBHOOK_ID;
    const res = await fetch(id ? `${HELIUS}/${id}?api-key=${hKey}` : `${HELIUS}?api-key=${hKey}`, {
      method: id ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    const json = (await res.json().catch(() => ({}))) as { webhookID?: string };
    if (!res.ok) console.error("❌ Helius:", res.status, json);
    else {
      console.log(`✅ Helius-webhook ${id ? "bijgewerkt" : "aangemaakt"} (${sol.length} adressen)`);
      if (!id) console.log(`   → Zet in .env.local: HELIUS_WEBHOOK_ID=${json.webhookID}`);
    }
  } else {
    console.log("⏭️  Helius overgeslagen (HELIUS_API_KEY / HELIUS_WEBHOOK_AUTH ontbreekt)");
  }

  // ---------- Alchemy (Ethereum) ----------
  const aToken = process.env.ALCHEMY_AUTH_TOKEN;
  if (aToken) {
    const eth = await addressesToWatch("eth");
    const id = process.env.ALCHEMY_WEBHOOK_ID;
    if (id) {
      // URL van een bestaande Alchemy-webhook kun je niet wijzigen; alleen adressen.
      const r = await updateAlchemy(eth, []);
      console.log(r.ok ? `✅ Alchemy-adressen bijgewerkt (${eth.length})` : `❌ Alchemy: ${r.reason}`);
      console.log(`   Let op: staat de webhook nog op ${base}/api/webhooks/alchemy? Zo niet: verwijder ALCHEMY_WEBHOOK_ID en draai opnieuw.`);
    } else {
      const res = await fetch(`${ALCHEMY}/create-webhook`, {
        method: "POST",
        headers: { "content-type": "application/json", "X-Alchemy-Token": aToken },
        body: JSON.stringify({
          network: "ETH_MAINNET",
          webhook_type: "ADDRESS_ACTIVITY",
          webhook_url: `${base}/api/webhooks/alchemy`,
          // Alchemy vereist minstens 1 adres
          addresses: eth.length ? eth : ["0x000000000000000000000000000000000000dead"],
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { data?: { id: string; signing_key: string } };
      if (!res.ok || !json.data) console.error("❌ Alchemy:", res.status, json);
      else {
        console.log(`✅ Alchemy-webhook aangemaakt (${eth.length} adressen)`);
        console.log(`   → Zet in .env.local: ALCHEMY_WEBHOOK_ID=${json.data.id}`);
        console.log(`   → Zet in .env.local: ALCHEMY_WEBHOOK_SIGNING_KEY=${json.data.signing_key}`);
      }
    }
  } else {
    console.log("⏭️  Alchemy overgeslagen (ALCHEMY_AUTH_TOKEN ontbreekt)");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
