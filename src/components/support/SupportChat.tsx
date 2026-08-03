"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

import type { ChatConfig } from "@/lib/chat";

/**
 * Lazy gate for the support widget.
 *
 * Two things are deferred, for two different reasons:
 *
 *   The widget module is a dynamic import with `ssr: false`, so none of its
 *   markup or JavaScript is in the document or the page's first-load bundle.
 *   Nothing about the widget can move the LCP element or contribute layout
 *   shift, because at first paint it does not exist.
 *
 *   Even that import is held until the browser is idle. A visitor is reading
 *   the hero for several seconds before they think about contacting anyone, and
 *   fetching a support widget must never compete with the artwork and fonts on
 *   the critical path.
 *
 * The `timeout` matters: `requestIdleCallback` can be starved indefinitely on a
 * busy page, and a support button that never appears is worse than one that
 * appears a moment late.
 */
const SupportChatWidget = dynamic(
  () => import("./SupportChatWidget").then((m) => m.SupportChatWidget),
  { ssr: false }
);

export function SupportChat({ config }: { config: ChatConfig }) {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    if (typeof window.requestIdleCallback !== "function") {
      const timer = setTimeout(() => setIdle(true), 1200);
      return () => clearTimeout(timer);
    }

    const handle = window.requestIdleCallback(() => setIdle(true), {
      timeout: 2500,
    });
    return () => window.cancelIdleCallback(handle);
  }, []);

  if (!idle) return null;

  return <SupportChatWidget config={config} />;
}
