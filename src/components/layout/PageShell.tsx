import type { ReactNode } from "react";
import Link from "next/link";

import {
  getBrands,
  getCommunityLinks,
  getSettings,
  getTopUpGame,
} from "@/lib/queries";
import { buildHeaderLinks, buildNavLinks, primaryTargetId } from "@/lib/site-nav";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

/**
 * Navbar + main + footer for the standalone public pages.
 *
 * The homepage, the blog index and the article page each wire this up by hand
 * because each needs the same data for its own body anyway. The static pages do
 * not, and pasting the same twenty lines into four of them is how a navbar prop
 * ends up right on three pages and stale on the fourth.
 *
 * Every query below is `unstable_cache`d and already read by the page itself,
 * so this costs no extra round trip — and a settings save invalidates the
 * chrome along with the page.
 */
export async function PageShell({ children }: { children: ReactNode }) {
  const [settings, brands, community, topUpGame] = await Promise.all([
    getSettings(),
    getBrands(),
    getCommunityLinks(),
    /**
     * Read here so the menu on a policy page names the same game as the menu
     * on the homepage. It costs no round trip: it resolves from the same
     * cached `games` entry the picker was built from.
     */
    getTopUpGame(),
  ]);

  return (
    <>
      {/* `next/link`, not a bare `<a>`: an internal `href` on an anchor fails
          the `no-html-link-for-pages` lint rule, which runs as part of the
          production build — so the raw element did not just skip prefetching,
          it stopped the app compiling at all. */}
      <Link
        href="/"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:rounded-full focus:bg-gold focus:px-5 focus:py-3 focus:text-sm focus:font-bold focus:text-ink"
      >
        Lewati ke halaman utama
      </Link>

      <Navbar
        siteName={settings.siteName}
        logoUrl={settings.logoUrl}
        tickerEnabled={settings.tickerEnabled}
        tickerText={settings.tickerText}
        links={buildHeaderLinks(settings, topUpGame)}
        searchTargetId={primaryTargetId(settings)}
      />

      <main id="main" className="relative pt-28 pb-8 sm:pt-32">
        {children}
      </main>

      <Footer
        settings={settings}
        navLinks={buildNavLinks(settings, topUpGame)}
        brands={brands}
        community={community}
      />
    </>
  );
}
