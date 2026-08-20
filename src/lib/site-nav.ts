import { topUpHref } from "@/lib/games";
import type { GameCard, Settings } from "@/lib/queries";

export type NavLink = { label: string; href: string };

/** Just enough of a game row to build a link out of it. */
export type TopUpGame = Pick<GameCard, "name" | "slug"> | null;

/**
 * Navigation follows the section switches: turning a section off in the admin
 * panel removes its link from the navbar and footer too, so nothing ever
 * points at a section that is not on the page.
 *
 * Targets are root-absolute (`/#brands`, not `#brands`). The same navbar and
 * footer render on /blog and on every article, where a bare fragment resolves
 * against the article's own URL — so every link in the header was silently
 * dead on the whole blog. `/#id` scrolls in place on the homepage and
 * navigates there from anywhere else.
 *
 * @param topUpGame Whichever game currently owns the top-up catalogue, or null.
 *   Passed in rather than looked up because this file is pure — it is called
 *   from four different pages that each already hold the data, and a query in
 *   here would be four extra reads for one link.
 */
export function buildNavLinks(
  settings: Settings,
  topUpGame: TopUpGame = null
): NavLink[] {
  return [
    /**
     * The top-up, named after whichever game actually has it.
     *
     * This entry used to be the literal word "Royal Dream" pointing at a
     * literal path. Both are now read from the row, so moving the catalogue to
     * another game in the panel moves the menu with it — and a menu entry can
     * no longer name a game the site has stopped selling.
     *
     * Hidden entirely when no game owns the catalogue: a "Top Up" link that
     * leads to a page with nothing on it is worse than no link.
     */
    {
      label: topUpGame ? `Top Up ${topUpGame.name}` : "",
      href: topUpHref(topUpGame),
      on: settings.showProducts && topUpGame !== null,
    },
    { label: "Brands", href: "/#brands", on: settings.showBrands },
    { label: "Promo", href: "/#promo", on: settings.showPopular },
    { label: "Community", href: "/#community", on: settings.showCommunity },
    { label: "FAQ", href: "/#faq", on: settings.showFaq },
  ]
    .filter((link) => link.on)
    .map(({ label, href }) => ({ label, href }));
}

/**
 * Standalone public pages.
 *
 * Not behind a section switch, because they are not sections: they are their
 * own routes and they exist whatever the homepage is configured to show.
 */
export const PAGE_LINKS: NavLink[] = [
  { label: "Tentang", href: "/about" },
  { label: "Kontak", href: "/contact" },
];

/** Footer-only. Legal pages belong in the footer, not in the header. */
export const LEGAL_LINKS: NavLink[] = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms" },
];

/** What the navbar shows: the homepage sections, then the standalone pages. */
export function buildHeaderLinks(
  settings: Settings,
  topUpGame: TopUpGame = null
): NavLink[] {
  return [...buildNavLinks(settings, topUpGame), ...PAGE_LINKS];
}

/**
 * Makes an admin-entered link safe to render away from the homepage.
 *
 * Brand and community rows are edited as `#royal-dream`, which resolves
 * against whatever page is rendering them — so the same footer link that works
 * on `/` silently points at `/blog/some-article#royal-dream` everywhere else.
 * Rooting the fragment keeps it an in-page scroll on the homepage and a real
 * navigation from anywhere else. Absolute URLs and normal paths pass through.
 */
export function resolveHref(href: string): string {
  const value = href.trim();
  if (!value) return "/";
  return value.startsWith("#") ? `/${value}` : value;
}

/**
 * Where the search box and hero CTAs should land.
 *
 * The homepage's main section, whichever one the mode selected — landing on
 * `#games` while the page is rendering the catalogue would scroll past the
 * thing the visitor asked for, to a section that is not there.
 */
export function primaryTargetId(settings: Settings) {
  return settings.homepageMode === "TOP_UP" ? "royal-dream" : "games";
}
