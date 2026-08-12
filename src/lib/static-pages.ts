/**
 * The standalone public pages, in one table.
 *
 * These four have no row anywhere — they are code, not content — so the
 * sitemap cannot derive them and the pages themselves cannot derive their own
 * "last updated" line. Both used to guess: the sitemap reported
 * `settings.updatedAt`, which meant saving an unrelated analytics ID moved the
 * `lastmod` of the privacy policy, and the two policy pages each carried their
 * own hand-typed Indonesian date that nothing checked against it.
 *
 * One entry per page, one date, read by both.
 *
 * `lastModified` is the day the page's *text* last changed. Bump it when you
 * edit the copy — not when the chrome around it changes.
 */
export type StaticPage = {
  /** Root-absolute, e.g. "/about". */
  path: string;
  /** Sitemap priority, relative to the homepage's 1.0. */
  priority: number;
  /** ISO date (YYYY-MM-DD), interpreted as UTC midnight. */
  lastModified: string;
};

export const STATIC_PAGES = [
  { path: "/about", priority: 0.6, lastModified: "2026-08-11" },
  { path: "/contact", priority: 0.6, lastModified: "2026-08-11" },
  { path: "/privacy-policy", priority: 0.3, lastModified: "2026-08-11" },
  { path: "/terms", priority: 0.3, lastModified: "2026-08-11" },
] as const satisfies readonly StaticPage[];

/** The `lastModified` of one page, as a Date, for the sitemap. */
export function staticPageDate(path: string): Date {
  const page = STATIC_PAGES.find((entry) => entry.path === path);
  // `T00:00:00Z` rather than the bare date: `new Date("2026-08-11")` is UTC
  // midnight already, but the explicit form documents that and survives a
  // future change to a date-time value.
  return new Date(`${page?.lastModified ?? STATIC_PAGES[0].lastModified}T00:00:00Z`);
}

const LONG_DATE = new Intl.DateTimeFormat("id-ID", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** The same date, written the way the policy pages show it to a reader. */
export function staticPageDateLabel(path: string) {
  return LONG_DATE.format(staticPageDate(path));
}
