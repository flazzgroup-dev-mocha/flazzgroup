import type { ChatQuickAction } from "@/lib/validators";
import type { Settings } from "@/lib/queries";

/**
 * Floating support chat — the shared shape and the link building.
 *
 * Client-safe: the widget is a client component, and the settings screen
 * previews the same links, so neither may pull in anything server-only.
 */

export type ChatChannel = "WHATSAPP" | "TELEGRAM";

export type ChatConfig = {
  logoUrl: string;
  title: string;
  subtitle: string;
  greeting: string;
  position: "LEFT" | "RIGHT";
  whatsappUrl: string;
  telegramUrl: string;
  actions: (ChatQuickAction & { href: string })[];
};

/** Defaults used when the settings row has not been filled in yet. */
export const CHAT_FALLBACK_GREETING =
  "Halo!\nSelamat datang di FLAZZ GROUP 👋\n\nSilakan pilih kebutuhan Anda.";

export const CHAT_DEFAULT_ACTIONS: ChatQuickAction[] = [
  {
    label: "Top Up Royal Dream",
    message: "Halo Admin,\n\nSaya ingin melakukan Top Up Royal Dream.",
    channel: "WHATSAPP",
  },
  {
    label: "Kendala Pembayaran",
    message: "Halo Admin,\n\nSaya mengalami kendala pembayaran.",
    channel: "WHATSAPP",
  },
  {
    label: "Promo Terbaru",
    message: "Halo Admin,\n\nSaya ingin mengetahui promo terbaru.",
    channel: "WHATSAPP",
  },
  {
    label: "Pertanyaan Lain",
    message:
      "Halo Admin,\n\nSaya ingin bertanya mengenai layanan FLAZZ GROUP.",
    channel: "WHATSAPP",
  },
];

function appendQuery(url: string, key: string, value: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${key}=${encodeURIComponent(value)}`;
}

/**
 * The link a quick action opens.
 *
 * WhatsApp reads `?text=` on both wa.me and api.whatsapp.com links, so the
 * message arrives typed into the composer.
 *
 * Telegram has no equivalent for a direct chat — `?text=` is only meaningful on
 * its share dialog, which would make the visitor pick a recipient rather than
 * landing in the conversation. A Telegram action therefore opens the chat
 * itself, and the settings screen says so rather than letting an operator write
 * a message that would be silently dropped.
 */
export function quickActionHref(
  action: ChatQuickAction,
  whatsappUrl: string,
  telegramUrl: string
): string | null {
  if (action.channel === "TELEGRAM") {
    return telegramUrl || null;
  }

  if (!whatsappUrl) return null;
  return action.message
    ? appendQuery(whatsappUrl, "text", action.message)
    : whatsappUrl;
}

/**
 * Reads the settings row into what the widget renders, dropping anything that
 * cannot work — an action pointing at a channel with no link configured would
 * otherwise render as a dead button.
 */
export function toChatConfig(settings: Settings): ChatConfig | null {
  if (!settings.chatEnabled) return null;

  const whatsappUrl = settings.whatsappUrl.trim();
  const telegramUrl = settings.telegramUrl.trim();

  // With neither channel set there is nothing to contact, so the launcher is
  // not rendered at all rather than opening onto an empty panel.
  if (!whatsappUrl && !telegramUrl) return null;

  const stored = parseQuickActions(settings.chatQuickActions);
  const source = stored.length > 0 ? stored : CHAT_DEFAULT_ACTIONS;

  const actions = source
    .map((action) => {
      const href = quickActionHref(action, whatsappUrl, telegramUrl);
      return href ? { ...action, href } : null;
    })
    .filter((action): action is ChatQuickAction & { href: string } =>
      action !== null
    );

  return {
    logoUrl: settings.chatLogoUrl || settings.logoUrl,
    title: settings.chatTitle || settings.siteName,
    subtitle: settings.chatSubtitle,
    greeting: settings.chatGreeting || CHAT_FALLBACK_GREETING,
    position: settings.chatPosition,
    whatsappUrl,
    telegramUrl,
    actions,
  };
}

/**
 * The quick actions come out of a Json column, so they are `unknown` until
 * proven otherwise — a hand-edited row must not be able to crash a render.
 */
export function parseQuickActions(value: unknown): ChatQuickAction[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];

    const { label, message, channel } = entry as Record<string, unknown>;
    if (typeof label !== "string" || !label.trim()) return [];

    return [
      {
        label,
        message: typeof message === "string" ? message : "",
        channel: channel === "TELEGRAM" ? "TELEGRAM" : "WHATSAPP",
      } satisfies ChatQuickAction,
    ];
  });
}
