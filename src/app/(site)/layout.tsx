import { Suspense } from "react";

import { getSettings } from "@/lib/queries";
import { toChatConfig } from "@/lib/chat";
import { toAnalyticsConfig } from "@/lib/analytics/config";
import { SupportChat } from "@/components/support/SupportChat";
import { Analytics } from "@/components/analytics/Analytics";
import { ConsentBanner } from "@/components/analytics/ConsentBanner";

/**
 * Shared chrome for the public site.
 *
 * Exists so the support widget is mounted once for the homepage, the blog index
 * and every article, rather than being pasted into each page. It renders as a
 * sibling of the page, not around it — no page's own layout changes.
 *
 * `getSettings` is tagged and already read by every route below this, so this
 * costs nothing extra: the cache entry is shared, and a settings save
 * invalidates the widget along with everything else on the page.
 */
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();
  const chat = toChatConfig(settings);
  const analytics = toAnalyticsConfig(settings);

  return (
    <>
      {/*
        The skip link lives here so that every public page has one.

        It was written into the homepage only, which meant the other eleven
        indexable pages — the blog archive, every article, and the four static
        pages — had no way to jump past a navbar full of links. All of them
        already render `<main id="main">`, so the target existed everywhere; the
        control did not.

        It has to be the first thing in the layout: a bypass link is only useful
        if it is the first element the keyboard reaches, and this renders ahead
        of `children` in document order for every route below.
      */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:rounded-full focus:bg-gold focus:px-5 focus:py-3 focus:text-sm focus:font-bold focus:text-ink"
      >
        Lewati ke konten utama
      </a>

      {children}
      {chat ? <SupportChat config={chat} /> : null}

      {/* PageViewTracker reads searchParams, which opts its subtree into
          dynamic rendering. The Suspense boundary keeps that contained so the
          pages themselves stay static. */}
      <Suspense fallback={null}>
        <Analytics config={analytics} />
      </Suspense>

      {analytics.active ? <ConsentBanner /> : null}
    </>
  );
}
