"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { track } from "@/lib/analytics/track";
import type { AnalyticsEventName, AnalyticsEvents } from "@/lib/analytics/events";

/**
 * A link that reports itself.
 *
 * Exists so the sections stay server components. Making BrandsSection or the
 * footer client-only just to attach an onClick would ship their whole render
 * to the browser for the sake of one handler; this moves only the anchor.
 *
 * The event name and its parameters are checked against the catalogue, so a
 * typo or a missing field is a build error rather than a gap someone notices
 * in GA4 three weeks later.
 */
export function TrackedLink<K extends AnalyticsEventName>({
  event,
  params,
  onClick,
  ...props
}: ComponentProps<typeof Link> & {
  event: K;
  params: AnalyticsEvents[K];
}) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        // Fire first: the navigation that follows may unload the page, and
        // track() uses keepalive for exactly this reason.
        track(event, params);
        onClick?.(e);
      }}
    />
  );
}
