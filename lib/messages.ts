/**
 * Alle teksten van bot en site op één plek. Later: `en` toevoegen met dezelfde
 * vorm en `t()` laten kiezen op basis van de taal van de gebruiker.
 *
 * Telegram-teksten gebruiken HTML parse mode. Dynamische waarden ALTIJD door
 * escapeHtml() halen voordat ze in een bericht komen.
 */

export const DISCLAIMER = "Geen financieel advies. Alleen informatie.";

const nl = {
  disclaimer: DISCLAIMER,

  help: [
    "🐋 <b>Whale Alert</b>",
    "",
    "Ik volg whale- en smart-money-wallets op Ethereum en Solana en meld grote transfers, swaps en exchange-stortingen in deze groep.",
    "",
    "<b>Commando's</b>",
    "/analyse &lt;ticker|adres&gt; — feiten en context over een coin",
    "/wallets — gevolgde wallets",
    "/help — dit bericht",
    "",
    `<i>${DISCLAIMER}</i>`,
  ].join("\n"),

  helpAdmin: [
    "",
    "<b>Admin</b>",
    "/addwallet &lt;eth|sol&gt; &lt;adres&gt; &lt;label&gt; [smart_money|whale]",
    "/removewallet &lt;adres&gt;",
    "/threshold &lt;usd&gt;",
    "/pause · /resume — alerts aan/uit",
    "/setup — gebruik deze groep (en dit topic) voor alerts",
  ].join("\n"),

  start: "👋 Welkom! Voeg me toe aan een groep of typ /help voor de commando's.",
  linked: (pro: boolean) =>
    "✅ Je Telegram is gekoppeld aan je Whale Alert-account." +
    (pro ? "\nJe invite-link voor de Pro-groep volgt zo." : "\nAlerts voor je watchlist in je DM zijn onderdeel van Pro."),
  linkInvalid: "Deze koppelcode werkt niet (meer). Open je account op de site en probeer opnieuw.",
  linkTaken: "Dit Telegram-account is al aan een ander Whale Alert-account gekoppeld. Ontkoppel het daar eerst.",

  walletsEmpty: "Er worden nog geen wallets gevolgd.",
  walletsHeader: (n: number) => `🐋 <b>Gevolgde wallets</b> (${n})`,
  walletsMore: (n: number) => `… en nog ${n} meer`,

  notAdmin: "⛔ Alleen admins kunnen dit commando gebruiken.",
  comingSoon: "🚧 Dit commando komt in een volgende fase.",
  error: "⚠️ Er ging iets mis. Probeer het later opnieuw.",

  setupDone: (chatId: number, topics: string) =>
    `✅ Deze chat is ingesteld voor alerts.\nchat_id: <code>${chatId}</code>\n${topics}`,
  setupTopicsCreated: "Topics aangemaakt: 🐋 ETH, 🐋 SOL, 📊 Digest.",
  setupTopicsFailed:
    "⚠️ Kon geen topics aanmaken (geef de bot het recht <i>Topics beheren</i>). Alerts komen nu in dit topic/de hoofdchat.",
  setupNoTopics: "Geen forum-topics: alerts komen in de hoofdchat.",
  topicNames: { eth: "🐋 ETH", sol: "🐋 SOL", digest: "📊 Digest" },

  addWalletUsage:
    "Gebruik: <code>/addwallet &lt;eth|sol&gt; &lt;adres&gt; &lt;label&gt; [smart_money|whale]</code>",
  invalidChain: "Chain moet <code>eth</code> of <code>sol</code> zijn.",
  invalidAddress: (chain: string) => `Dat is geen geldig ${chain.toUpperCase()}-adres.`,
  walletAdded: (label: string, chain: string, synced: boolean, reason?: string) =>
    `✅ <b>${label}</b> toegevoegd (${chain.toUpperCase()}).` +
    (synced ? "" : `\n⚠️ Nog niet bij de webhook aangemeld: ${reason ?? "onbekend"}`),
  walletExists: "Deze wallet wordt al gevolgd (label bijgewerkt).",
  removeWalletUsage: "Gebruik: <code>/removewallet &lt;adres&gt;</code>",
  walletRemoved: (n: number) => (n ? "🗑️ Wallet verwijderd." : "Die wallet werd niet gevolgd."),
  thresholdUsage: "Gebruik: <code>/threshold &lt;usd&gt;</code>, bv. <code>/threshold 250000</code>",
  thresholdSet: (usd: string) => `✅ Drempel voor transfers ingesteld op <b>${usd}</b>.`,
  paused: "⏸️ Alerts gepauzeerd. Nieuwe events worden opgeslagen maar niet gemeld.",
  resumed: "▶️ Alerts staan weer aan.",

  analyseUsage: "Gebruik: <code>/analyse &lt;ticker of contractadres&gt;</code>, bv. <code>/analyse PEPE</code>",
  analyseBusy: (q: string) => `⏳ Analyse van <b>${q}</b>…`,
  analyseNotFound: (q: string) =>
    `Geen token gevonden voor <b>${q}</b> op Ethereum of Solana. Probeer het contractadres.`,
  analyseLimit: (limit: number) =>
    `Je hebt vandaag je ${limit} analyses gebruikt. Morgen kan het weer.`,
} as const;

export type Messages = typeof nl;

export const messages: Record<"nl", Messages> = { nl };

export function t(lang: "nl" = "nl"): Messages {
  return messages[lang];
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 0x1234…abcd */
export function shortAddress(addr: string, head = 4, tail = 4): string {
  if (addr.length <= head + tail + 1) return addr;
  const prefix = addr.startsWith("0x") ? 2 : 0;
  return `${addr.slice(0, prefix + head)}…${addr.slice(-tail)}`;
}
