import type { AdminRole } from "@/generated/prisma/enums";

/**
 * Who may reach what.
 *
 * One file, consulted by the middleware, by every page, by every route handler
 * and by the navigation. That is the point: an access rule that lives in three
 * places is an access rule that will disagree with itself, and the disagreement
 * will be discovered by whoever is not supposed to be there.
 *
 * Deliberately free of `server-only`, Prisma and `next/headers` so the edge
 * middleware and the client navigation can both import it.
 */

export type { AdminRole };

export const ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
};

export const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  SUPER_ADMIN:
    "Owner. Everything an Admin can do, plus website settings, SEO, analytics and user accounts.",
  ADMIN:
    "Customer service. Day-to-day content — articles, banners, brands, payments, the chat widget.",
};

/**
 * Route prefixes only a SUPER_ADMIN may open.
 *
 * Prefixes rather than exact paths so a nested page added later
 * (`/admin/users/new`) inherits the rule instead of quietly escaping it.
 */
export const SUPER_ADMIN_PAGES = ["/admin/settings", "/admin/users"] as const;

/**
 * API prefixes only a SUPER_ADMIN may call.
 *
 * `/api/settings` covers site identity, SEO, analytics IDs and the homepage
 * section switches — everything an ADMIN is explicitly not allowed to touch.
 * The floating chat used to live in that payload too; it has its own endpoint
 * now precisely so an ADMIN can keep managing it without being handed the rest.
 */
export const SUPER_ADMIN_APIS = ["/api/settings", "/api/admins"] as const;

/**
 * Paths inside a restricted prefix that are open to both roles.
 *
 * Checked before the prefixes above, so ordering is not accidental: without
 * this, `/api/settings/chat` would be swallowed by the `/api/settings` rule.
 */
const SHARED_EXCEPTIONS = ["/api/settings/chat", "/admin/chat"] as const;

const startsWithSegment = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/** Whether a path is reserved for SUPER_ADMIN, page or API alike. */
export function requiresSuperAdmin(pathname: string) {
  if (SHARED_EXCEPTIONS.some((path) => startsWithSegment(pathname, path))) {
    return false;
  }

  return [...SUPER_ADMIN_PAGES, ...SUPER_ADMIN_APIS].some((prefix) =>
    startsWithSegment(pathname, prefix)
  );
}

/** Whether this role may open this path. */
export function canAccess(role: AdminRole, pathname: string) {
  return role === "SUPER_ADMIN" || !requiresSuperAdmin(pathname);
}

/**
 * The settings columns an ADMIN is allowed to write.
 *
 * The settings row is a single record holding two very different things: the
 * chat widget an ADMIN maintains, and the site URL, SEO copy, analytics IDs and
 * section switches they must not touch. Splitting the *endpoint* is what makes
 * that enforceable — this list is the contract that endpoint validates against,
 * and it exists here rather than beside the route so the boundary is visible
 * next to every other rule.
 */
export const CHAT_SETTINGS_FIELDS = [
  "chatEnabled",
  "chatLogoUrl",
  "chatTitle",
  "chatSubtitle",
  "chatGreeting",
  "chatPosition",
  "chatQuickActions",
] as const;

export type ChatSettingsField = (typeof CHAT_SETTINGS_FIELDS)[number];

/**
 * Exactly what the chat screen reads back.
 *
 * Splitting the *write* path was not enough. Both the chat page and its GET
 * originally returned the whole settings row, which handed an ADMIN all 24
 * fields belonging to the SEO, analytics and homepage-section screens they are
 * denied — through an endpoint they are allowed to call. None of those values
 * is a secret (they appear in public HTML), but "cannot change it" and "cannot
 * see it" are the same sentence in the permission list, and a boundary that
 * only holds in one direction is half a boundary.
 *
 * `siteName` is here because it is the placeholder for an empty chat title, and
 * the contact URLs because the form greys out an action whose channel is not
 * configured. Both are already public on every page of the site.
 */
export const CHAT_FORM_SELECT = {
  chatEnabled: true,
  chatLogoUrl: true,
  chatTitle: true,
  chatSubtitle: true,
  chatGreeting: true,
  chatPosition: true,
  chatQuickActions: true,
  siteName: true,
  whatsappUrl: true,
  telegramUrl: true,
  updatedAt: true,
} as const;
