"use client";

import {
  GOOGLE_ADS_CONVERSIONS,
  META_EVENT_MAP,
  SERVER_SIDE_EVENTS,
  type AnalyticsEventName,
  type AnalyticsEvents,
} from "./events";
import { readConsent } from "./consent";

/**
 * One entry point for every tracked event.
 *
 * A call site says what happened; this decides where it goes. Components never
 * touch `dataLayer`, `fbq` or `gtag` directly, which is what keeps the event
 * catalogue honest and makes it possible to answer "what do we actually send?"
 * by reading one file.
 *
 * Fan-out per event:
 *   dataLayer   always (GTM forwards to GA4, and to anything added later)
 *   fbq         when the event maps to a Meta standard event
 *   /api/track  for conversions, sharing the same event_id for deduplication
 *   gtag        for conversions, when Google Ads is configured
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[] };
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

/** Set by <Analytics>. `track()` is a no-op until it is. */
let runtime: {
  metaPixelId: string;
  googleAdsId: string;
  googleAdsConversionLabel: string;
} | null = null;

export function configureTracking(config: NonNullable<typeof runtime>) {
  runtime = config;
}

const isDev = process.env.NODE_ENV === "development";

/**
 * Shared identifier for the browser and server copies of one event.
 *
 * Meta deduplicates on `event_name` + `event_id`. Without it a conversion
 * counted by both the pixel and the Conversions API is reported twice, and an
 * ad account optimising against doubled conversions bids on fiction.
 */
function eventId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * The development console.
 *
 * Grouped and collapsed so a busy page stays readable, and stripped entirely
 * from production builds — `process.env.NODE_ENV` is inlined, so the whole
 * branch is dead code the minifier removes.
 */
function debugLog(
  name: AnalyticsEventName,
  params: Record<string, unknown>,
  destinations: string[]
) {
  if (!isDev) return;

  console.groupCollapsed(
    `%c Analytics %c ${name} `,
    "background:#FFD54A;color:#071321;font-weight:700;border-radius:3px 0 0 3px",
    "background:#2E7CF6;color:#fff;font-weight:600;border-radius:0 3px 3px 0"
  );
  console.log(params);
  console.log("→ %s", destinations.join(", ") || "nowhere (no destination configured)");
  console.groupEnd();
}

export type TrackOptions = {
  /**
   * Whether this call may fire the Google Ads conversion.
   *
   * There is exactly one conversion action configured — one ID, one label — so
   * every event in `GOOGLE_ADS_CONVERSIONS` reports into the same counter. When
   * one interaction legitimately emits two of them (the support panel sends
   * both the specific opener and the channel it went out on), Ads sees two
   * conversions with different `transaction_id`s and counts them separately.
   * Nothing in the Ads interface flags that; the campaign simply optimises
   * against a number roughly twice the truth.
   *
   * Pass `false` on the companion call. GA4 and Meta still receive it — they
   * distinguish events by name, so the extra one is information there rather
   * than duplication.
   */
  adsConversion?: boolean;
};

export function track<K extends AnalyticsEventName>(
  name: K,
  params: AnalyticsEvents[K],
  options: TrackOptions = {}
) {
  if (typeof window === "undefined") return;

  // Declining has to mean nothing is sent, including to our own endpoint.
  if (readConsent() !== "granted") {
    if (isDev) debugLog(name, params as Record<string, unknown>, ["blocked: no consent"]);
    return;
  }

  const payload = params as Record<string, unknown>;
  const id = eventId();
  const destinations: string[] = [];

  // ------------------------------------------------------------- dataLayer
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event: name, event_id: id, ...payload });
  destinations.push("dataLayer");

  // ------------------------------------------------------------------ Meta
  const metaEvent = META_EVENT_MAP[name as keyof typeof META_EVENT_MAP];

  if (metaEvent && runtime?.metaPixelId && window.fbq) {
    window.fbq("track", metaEvent, toMetaParams(payload), { eventID: id });
    destinations.push(`fbq:${metaEvent}`);
  }

  if (metaEvent && SERVER_SIDE_EVENTS.has(name)) {
    sendServerEvent(name, metaEvent, payload, id);
    destinations.push("capi");
  }

  // ----------------------------------------------------------- Google Ads
  if (
    options.adsConversion !== false &&
    GOOGLE_ADS_CONVERSIONS.has(name) &&
    runtime?.googleAdsId &&
    runtime.googleAdsConversionLabel &&
    window.gtag
  ) {
    window.gtag("event", "conversion", {
      send_to: `${runtime.googleAdsId}/${runtime.googleAdsConversionLabel}`,
      transaction_id: id,
    });
    destinations.push("google_ads");
  }

  debugLog(name, payload, destinations);
}

/** Meta reads a small, fixed vocabulary; everything else is noise to it. */
function toMetaParams(params: Record<string, unknown>) {
  const out: Record<string, unknown> = {};

  if (typeof params.item_id === "string") out.content_ids = [params.item_id];
  if (typeof params.item_name === "string") out.content_name = params.item_name;
  if (typeof params.category === "string") out.content_category = params.category;
  if (typeof params.search_term === "string") out.search_string = params.search_term;

  return out;
}

/**
 * Server copy of a conversion.
 *
 * `keepalive` so the request survives the navigation that usually follows a
 * contact click — the whole point of these events is that the visitor is
 * leaving for WhatsApp. Failures are swallowed: analytics must never surface
 * an error to someone trying to send a message.
 */
function sendServerEvent(
  name: AnalyticsEventName,
  metaEvent: string,
  params: Record<string, unknown>,
  id: string
) {
  const body = JSON.stringify({
    event: name,
    meta_event: metaEvent,
    event_id: id,
    event_source_url: window.location.href,
    params,
  });

  try {
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {});
  } catch {
    // Never let a tracking failure interrupt the visitor.
  }
}

/**
 * A page view.
 *
 * Kept separate from `track()` because it is not in the event catalogue: GTM
 * and the Meta pixel both emit their own on load, and this exists only to
 * report the *client-side* navigations they cannot see.
 */
export function trackPageView(url: string, title: string) {
  if (typeof window === "undefined" || readConsent() !== "granted") return;

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event: "page_view", page_location: url, page_title: title });

  if (runtime?.metaPixelId && window.fbq) window.fbq("track", "PageView");

  if (isDev) debugLog("blog_view" as AnalyticsEventName, { url, title }, ["page_view"]);
}
