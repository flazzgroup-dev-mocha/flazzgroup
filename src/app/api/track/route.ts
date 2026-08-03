import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { clientKey, rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/api";
import { clientIp } from "@/lib/client-ip";

/**
 * Meta Conversions API relay.
 *
 * The browser pixel is blocked for a large share of real visitors — content
 * blockers, iOS tracking prevention, corporate proxies — so conversions that
 * actually happened never reach the ad account, and it learns from a biased
 * sample. Sending the same event from here fills that in.
 *
 * The pair is deduplicated by Meta on `event_name` + `event_id`, which the
 * browser generates once and gives to both copies. Without that every
 * conversion is counted twice.
 *
 * Public and unauthenticated by necessity — visitors are anonymous — so it is
 * origin-checked, rate limited, and accepts only the event names the site
 * actually sends.
 */

const GRAPH_VERSION = "v21.0";

/** Generous for a human, cheap to refuse for a script. */
const LIMIT = 60;
const WINDOW_MS = 60 * 1000;

const bodySchema = z.object({
  event: z.string().min(1).max(60),
  meta_event: z.enum(["PageView", "ViewContent", "Lead", "Contact", "Search"]),
  event_id: z.string().min(8).max(64),
  event_source_url: z.string().url().max(2000),
  params: z.record(z.string(), z.unknown()).default({}),
});

/** Meta requires SHA-256 for anything that could identify a person. */
const sha256 = (value: string) =>
  createHash("sha256").update(value.trim().toLowerCase()).digest("hex");

/**
 * Sent to Meta as `client_ip_address`, so it must be the real peer.
 *
 * Reading `X-Forwarded-For[0]` here did two kinds of damage: it let a caller
 * choose their own rate-limit bucket, and it let them dictate the address Meta
 * attributes the conversion to — which is an input to Meta's identity matching.
 * `clientIp` only believes a header infrastructure wrote.
 */
const peerAddress = (request: Request) => clientIp(request) ?? undefined;

export async function POST(request: Request) {
  // Same guard as every other write: an endpoint that spends API quota should
  // not be callable from another origin.
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Cross-origin not allowed." }, { status: 403 });
  }

  const limit = rateLimit({
    key: clientKey(request, "track"),
    limit: LIMIT,
    windowMs: WINDOW_MS,
  });

  if (!limit.ok) {
    return NextResponse.json({ error: "Too many events." }, { status: 429 });
  }

  const pixelId = process.env.META_PIXEL_ID ?? process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  // Not configured is not an error — the browser fires these unconditionally,
  // and a 500 per contact click would fill the logs with noise.
  if (!pixelId || !accessToken) {
    return NextResponse.json({ data: { skipped: "not_configured" } });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid event." }, { status: 422 });
  }

  const ip = peerAddress(request);
  const userAgent = request.headers.get("user-agent") ?? undefined;

  /**
   * No identifiers are collected by this site, so `user_data` carries only what
   * the request already revealed. Meta requires at least one field; IP and user
   * agent are the documented minimum for a web event.
   *
   * `fbp` / `fbc` are read from the pixel's own cookies when present — they are
   * what actually lifts match quality, and they exist only for visitors who
   * accepted, since nothing sets them otherwise.
   */
  const cookies = request.headers.get("cookie") ?? "";
  const cookieValue = (name: string) =>
    cookies.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1];

  const payload = {
    data: [
      {
        event_name: parsed.meta_event,
        event_time: Math.floor(Date.now() / 1000),
        event_id: parsed.event_id,
        event_source_url: parsed.event_source_url,
        action_source: "website",
        user_data: {
          ...(ip ? { client_ip_address: ip } : {}),
          ...(userAgent ? { client_user_agent: userAgent } : {}),
          ...(cookieValue("_fbp") ? { fbp: cookieValue("_fbp") } : {}),
          ...(cookieValue("_fbc") ? { fbc: cookieValue("_fbc") } : {}),
          // Hashed only so the shape is right if a future form collects one.
          ...(typeof parsed.params.email === "string"
            ? { em: [sha256(parsed.params.email)] }
            : {}),
        },
        custom_data: {
          ...(typeof parsed.params.item_id === "string"
            ? { content_ids: [parsed.params.item_id] }
            : {}),
          ...(typeof parsed.params.item_name === "string"
            ? { content_name: parsed.params.item_name }
            : {}),
          ...(typeof parsed.params.category === "string"
            ? { content_category: parsed.params.category }
            : {}),
          // Kept so a report can tell contact_whatsapp from contact_telegram,
          // which both arrive at Meta as "Contact".
          source_event: parsed.event,
        },
      },
    ],
    ...(process.env.META_TEST_EVENT_CODE
      ? { test_event_code: process.env.META_TEST_EVENT_CODE }
      : {}),
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        // Meta occasionally stalls; a hung request here would hold a server
        // connection open for a page the visitor has already left.
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("[capi] rejected", response.status, detail.slice(0, 300));
      // The visitor did nothing wrong; the event is simply lost.
      return NextResponse.json({ data: { delivered: false } }, { status: 202 });
    }

    return NextResponse.json({ data: { delivered: true, event_id: parsed.event_id } });
  } catch (error) {
    console.error("[capi] unreachable", (error as Error).message);
    return NextResponse.json({ data: { delivered: false } }, { status: 202 });
  }
}
