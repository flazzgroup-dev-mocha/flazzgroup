"use client";

import { useEffect, useRef } from "react";

import { track } from "@/lib/analytics/track";

/**
 * Reports a blog search once the results are on screen.
 *
 * The search is a plain GET form, so the term only exists as a URL parameter by
 * the time anything can observe it. Firing here rather than on submit means the
 * result count is known — "what did people search for" is far less useful than
 * "what did people search for and find nothing".
 *
 * Guarded on the term so React's development double-invoke, and any re-render
 * caused by something else on the page, cannot report one search twice.
 */
export function SearchTracker({
  term,
  resultsCount,
}: {
  term: string;
  resultsCount: number;
}) {
  const reported = useRef<string | null>(null);

  useEffect(() => {
    const cleaned = term.trim();
    if (!cleaned || reported.current === cleaned) return;

    reported.current = cleaned;
    track("blog_search", { search_term: cleaned, results_count: resultsCount });
  }, [term, resultsCount]);

  return null;
}
