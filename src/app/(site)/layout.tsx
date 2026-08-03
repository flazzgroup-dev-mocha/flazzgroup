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
