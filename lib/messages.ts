import { SITE } from "@/lib/site";

/**
 * Alle bot-teksten op één plek. Engels is de standaard (BOT_LANG=en),
 * Nederlands blijft beschikbaar (BOT_LANG=nl).
 *
 * Telegram-teksten gebruiken HTML parse mode. Dynamische waarden ALTIJD door
 * escapeHtml() halen voordat ze in een bericht komen.
 */

export const DISCLAIMER = "Not financial advice. Information only.";
const B = SITE.name;

const en = {
  disclaimer: DISCLAIMER,

  help: [
    `🐋 <b>${B}</b>`,
    "",
    "I track whale and smart-money wallets on Ethereum and Solana and post large transfers, swaps and exchange deposits in this group.",
    "",
    "<b>Commands</b>",
    "/analyze &lt;ticker|address&gt; — facts and context on a coin",
    "/wallets — tracked wallets",
    "/help — this message",
    "",
    `<i>${DISCLAIMER}</i>`,
  ].join("\n"),

  helpAdmin: [
    "",
    "<b>Admin</b>",
    "/addwallet &lt;eth|sol&gt; &lt;address&gt; &lt;label&gt; [smart_money|whale]",
    "/removewallet &lt;address&gt;",
    "/threshold &lt;usd&gt;",
    "/pause · /resume — alerts off/on",
    "/setup — use this group (and topics) for alerts",
  ].join("\n"),

  start: "👋 Welcome! Add me to a group or type /help for the commands.",
  linked: (pro: boolean) =>
    `✅ Your Telegram is linked to your ${B} account.` +
    (pro ? "\nYour invite link for the Pro group is on its way." : "\nWatchlist alerts in your DMs are part of Pro."),
  linkInvalid: "This link code doesn't work (anymore). Open your account on the website and try again.",
  linkTaken: `This Telegram account is already linked to another ${B} account. Unlink it there first.`,

  walletsEmpty: "No wallets are being tracked yet.",
  walletsHeader: (n: number) => `🐋 <b>Tracked wallets</b> (${n})`,
  walletsMore: (n: number) => `… and ${n} more`,

  notAdmin: "⛔ Only admins can use this command.",
  comingSoon: "🚧 This command is coming soon.",
  error: "⚠️ Something went wrong. Please try again later.",

  setupDone: (chatId: number, topics: string) =>
    `✅ This chat is set up for alerts.\nchat_id: <code>${chatId}</code>\n${topics}`,
  setupTopicsCreated: "Topics created: 🐋 ETH, 🐋 SOL, 📊 Digest.",
  setupTopicsFailed:
    "⚠️ Couldn't create topics (give the bot the <i>Manage topics</i> right). Alerts will go to this topic/the main chat.",
  setupNoTopics: "No forum topics: alerts go to the main chat.",
  setupNoDb:
    "⚠️ The database isn't connected, so I can't save this group. Check the Supabase keys in Vercel and redeploy. Status: /api/health on your website.",
  topicNames: { eth: "🐋 ETH", sol: "🐋 SOL", digest: "📊 Digest" },

  addWalletUsage:
    "Usage: <code>/addwallet &lt;eth|sol&gt; &lt;address&gt; &lt;label&gt; [smart_money|whale]</code>",
  invalidChain: "Chain must be <code>eth</code> or <code>sol</code>.",
  invalidAddress: (chain: string) => `That's not a valid ${chain.toUpperCase()} address.`,
  walletAdded: (label: string, chain: string, synced: boolean, reason?: string) =>
    `✅ <b>${label}</b> added (${chain.toUpperCase()}).` +
    (synced ? "" : `\n⚠️ Not registered with the webhook yet: ${reason ?? "unknown"}`),
  walletExists: "This wallet is already tracked (label updated).",
  removeWalletUsage: "Usage: <code>/removewallet &lt;address&gt;</code>",
  walletRemoved: (n: number): string => (n ? "🗑️ Wallet removed." : "That wallet wasn't being tracked."),
  thresholdUsage: "Usage: <code>/threshold &lt;usd&gt;</code>, e.g. <code>/threshold 250000</code>",
  thresholdSet: (usd: string) => `✅ Transfer threshold set to <b>${usd}</b>.`,
  paused: "⏸️ Alerts paused. New events are stored but not posted.",
  resumed: "▶️ Alerts are back on.",

  analyseUsage: "Usage: <code>/analyze &lt;ticker or contract address&gt;</code>, e.g. <code>/analyze PEPE</code>",
  analyseBusy: (q: string) => `⏳ Analyzing <b>${q}</b>…`,
  analyseNotFound: (q: string) =>
    `No token found for <b>${q}</b> on Ethereum or Solana. Try the contract address.`,
  analyseLimit: (limit: number) => `You've used your ${limit} analyses for today. Try again tomorrow.`,
};

export type Messages = typeof en;

const nl: Messages = {
  disclaimer: "Geen financieel advies. Alleen informatie.",
  help: [
    `🐋 <b>${B}</b>`,
    "",
    "Ik volg whale- en smart-money-wallets op Ethereum en Solana en meld grote transfers, swaps en exchange-stortingen in deze groep.",
    "",
    "<b>Commando's</b>",
    "/analyse &lt;ticker|adres&gt; — feiten en context over een coin",
    "/wallets — gevolgde wallets",
    "/help — dit bericht",
    "",
    "<i>Geen financieel advies. Alleen informatie.</i>",
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
  linked: (pro) =>
    `✅ Je Telegram is gekoppeld aan je ${B}-account.` +
    (pro ? "\nJe invite-link voor de Pro-groep volgt zo." : "\nAlerts voor je watchlist in je DM zijn onderdeel van Pro."),
  linkInvalid: "Deze koppelcode werkt niet (meer). Open je account op de site en probeer opnieuw.",
  linkTaken: `Dit Telegram-account is al aan een ander ${B}-account gekoppeld. Ontkoppel het daar eerst.`,
  walletsEmpty: "Er worden nog geen wallets gevolgd.",
  walletsHeader: (n) => `🐋 <b>Gevolgde wallets</b> (${n})`,
  walletsMore: (n) => `… en nog ${n} meer`,
  notAdmin: "⛔ Alleen admins kunnen dit commando gebruiken.",
  comingSoon: "🚧 Dit commando komt in een volgende fase.",
  error: "⚠️ Er ging iets mis. Probeer het later opnieuw.",
  setupDone: (chatId, topics) => `✅ Deze chat is ingesteld voor alerts.\nchat_id: <code>${chatId}</code>\n${topics}`,
  setupTopicsCreated: "Topics aangemaakt: 🐋 ETH, 🐋 SOL, 📊 Digest.",
  setupTopicsFailed:
    "⚠️ Kon geen topics aanmaken (geef de bot het recht <i>Topics beheren</i>). Alerts komen nu in dit topic/de hoofdchat.",
  setupNoTopics: "Geen forum-topics: alerts komen in de hoofdchat.",
  setupNoDb:
    "⚠️ De database is niet gekoppeld, dus ik kan deze groep niet opslaan. Check de Supabase-keys in Vercel en redeploy. Status: /api/health op je website.",
  topicNames: { eth: "🐋 ETH", sol: "🐋 SOL", digest: "📊 Digest" },
  addWalletUsage: "Gebruik: <code>/addwallet &lt;eth|sol&gt; &lt;adres&gt; &lt;label&gt; [smart_money|whale]</code>",
  invalidChain: "Chain moet <code>eth</code> of <code>sol</code> zijn.",
  invalidAddress: (chain) => `Dat is geen geldig ${chain.toUpperCase()}-adres.`,
  walletAdded: (label, chain, synced, reason) =>
    `✅ <b>${label}</b> toegevoegd (${chain.toUpperCase()}).` +
    (synced ? "" : `\n⚠️ Nog niet bij de webhook aangemeld: ${reason ?? "onbekend"}`),
  walletExists: "Deze wallet wordt al gevolgd (label bijgewerkt).",
  removeWalletUsage: "Gebruik: <code>/removewallet &lt;adres&gt;</code>",
  walletRemoved: (n) => (n ? "🗑️ Wallet verwijderd." : "Die wallet werd niet gevolgd."),
  thresholdUsage: "Gebruik: <code>/threshold &lt;usd&gt;</code>, bv. <code>/threshold 250000</code>",
  thresholdSet: (usd) => `✅ Drempel voor transfers ingesteld op <b>${usd}</b>.`,
  paused: "⏸️ Alerts gepauzeerd. Nieuwe events worden opgeslagen maar niet gemeld.",
  resumed: "▶️ Alerts staan weer aan.",
  analyseUsage: "Gebruik: <code>/analyse &lt;ticker of contractadres&gt;</code>, bv. <code>/analyse PEPE</code>",
  analyseBusy: (q) => `⏳ Analyse van <b>${q}</b>…`,
  analyseNotFound: (q) => `Geen token gevonden voor <b>${q}</b> op Ethereum of Solana. Probeer het contractadres.`,
  analyseLimit: (limit) => `Je hebt vandaag je ${limit} analyses gebruikt. Morgen kan het weer.`,
};

export type Lang = "en" | "nl";
export const messages: Record<Lang, Messages> = { en, nl };

export function botLang(): Lang {
  return process.env.BOT_LANG === "nl" ? "nl" : "en";
}

export function t(lang: Lang = botLang()): Messages {
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
