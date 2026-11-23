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

  walletsEmpty: "Er worden nog geen wallets gevolgd.",
  walletsHeader: (n: number) => `🐋 <b>Gevolgde wallets</b> (${n})`,
  walletsMore: (n: number) => `… en nog ${n} meer`,

  notAdmin: "⛔ Alleen admins kunnen dit commando gebruiken.",
  comingSoon: "🚧 Dit commando komt in een volgende fase.",
  error: "⚠️ Er ging iets mis. Probeer het later opnieuw.",

  setupDone: (chatId: number, topicId?: number) =>
    `✅ Deze chat is ingesteld voor alerts.\nchat_id: <code>${chatId}</code>` +
    (topicId ? `\ntopic: <code>${topicId}</code>` : ""),
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
