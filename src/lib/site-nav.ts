import type { Settings } from "@/lib/queries";

export type NavLink = { label: string; href: string };

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
 */
export function buildNavLinks(settings: Settings): NavLink[] {
  return [
    { label: "Royal Dream", href: "/#royal-dream", on: settings.showProducts },
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
export function buildHeaderLinks(settings: Settings): NavLink[] {
  return [...buildNavLinks(settings), ...PAGE_LINKS];
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

/** Where the search box and hero CTAs should land. */
export function primaryTargetId(settings: Settings) {
  if (settings.showProducts) return "royal-dream";
  if (settings.showPopular) return "promo";
  if (settings.showBrands) return "brands";
  return "main";
}
