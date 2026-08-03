"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { trackPageView } from "@/lib/analytics/track";

/**
 * Page views for client-side navigations.
 *
 * GTM and the Meta pixel each emit a page view when they load, which covers the
 * first page. After that the App Router swaps content without a document load,
 * and neither tag notices — so a visitor who lands on the homepage and reads
 * three articles is reported as one page view.
 *
 * This fills that gap and only that gap: the first render after mount is
 * skipped, because the tags have already counted it. Getting this wrong in the
 * other direction is the classic double-count.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    const query = searchParams.toString();
    const url = `${window.location.origin}${pathname}${query ? `?${query}` : ""}`;

    // The document title lags the navigation by a tick — metadata is applied
    // after the route commits, so reading it synchronously reports the title
    // of the page being left.
    const timer = setTimeout(() => trackPageView(url, document.title), 0);
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return null;
}
