"use client";

import { useEffect, useRef } from "react";

import { track } from "@/lib/analytics/track";

/**
 * How far down an article a visitor got, and how long they actually spent.
 *
 * Both answer the same question — is this piece worth the effort — and both are
 * easy to get wrong in ways that flatter the numbers:
 *
 *   Scroll depth fires once per threshold per article. Without the guard, a
 *   visitor scrolling back up and down again reports 50% four times.
 *
 *   Time counts *engaged* seconds, not wall clock. A tab left open overnight
 *   is not a twelve-hour read, so the timer stops when the page is hidden and
 *   resumes when it comes back.
 *
 * The total is sent on `visibilitychange`, not `beforeunload`: mobile browsers
 * frequently never fire unload, and it is the platform where most of this
 * traffic is.
 */

const THRESHOLDS = [25, 50, 75, 100] as const;

export function ArticleEngagement({
  itemId,
  itemName,
  readingMinutes,
  category,
  author,
}: {
  itemId: string;
  itemName: string;
  readingMinutes: number;
  category?: string;
  author?: string;
}) {
  const viewed = useRef<string | null>(null);

  /**
   * blog_view, once per article.
   *
   * Guarded by id rather than a boolean: React runs effects twice in
   * development Strict Mode, and the article page is a client-side navigation
   * target, so a plain `hasFired` flag would either double-count on the first
   * render or miss the second article entirely.
   */
  useEffect(() => {
    if (viewed.current === itemId) return;
    viewed.current = itemId;

    track("blog_view", {
      item_id: itemId,
      item_name: itemName,
      reading_minutes: readingMinutes,
      ...(category ? { category } : {}),
      ...(author ? { author } : {}),
    });
  }, [itemId, itemName, readingMinutes, category, author]);

  // Refs throughout: none of this should cause a render.
  const reached = useRef(new Set<number>());
  const engagedMs = useRef(0);
  const segmentStart = useRef<number | null>(null);
  const reported = useRef(false);

  useEffect(() => {
    // A fresh article resets everything, so navigating between posts does not
    // carry one article's progress into the next.
    reached.current = new Set();
    engagedMs.current = 0;
    reported.current = false;
    segmentStart.current = document.visibilityState === "visible" ? Date.now() : null;

    let frame = 0;

    const measure = () => {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      // A short article is fully read the moment it is opened.
      const percent =
        scrollable <= 0
          ? 100
          : Math.round((window.scrollY / scrollable) * 100);

      for (const threshold of THRESHOLDS) {
        if (percent >= threshold && !reached.current.has(threshold)) {
          reached.current.add(threshold);
          track("blog_scroll_depth", {
            item_id: itemId,
            item_name: itemName,
            percent_scrolled: threshold,
          });
        }
      }
    };

    const onScroll = () => {
      // rAF-throttled; a scroll handler that measures layout on every event is
      // the classic way to make a page feel heavy.
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };

    const closeSegment = () => {
      if (segmentStart.current === null) return;
      engagedMs.current += Date.now() - segmentStart.current;
      segmentStart.current = null;
    };

    const report = () => {
      closeSegment();
      if (reported.current) return;

      const seconds = Math.round(engagedMs.current / 1000);
      // Under two seconds is a bounce or a mis-tap, not a read.
      if (seconds < 2) return;

      reported.current = true;
      track("blog_read_time", {
        item_id: itemId,
        item_name: itemName,
        engaged_seconds: seconds,
        reading_minutes: readingMinutes,
        completion_ratio: Number(
          Math.min(seconds / Math.max(readingMinutes * 60, 1), 3).toFixed(2)
        ),
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        report();
      } else {
        // Coming back starts a new segment; it does not re-report.
        segmentStart.current = Date.now();
      }
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    // Desktop still benefits from the unload path; `report` is idempotent.
    window.addEventListener("pagehide", report);

    return () => {
      // Report before tearing down, so a client-side navigation to the next
      // article still records the time spent on this one.
      report();

      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", report);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [itemId, itemName, readingMinutes]);

  return null;
}
