import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Physical table names, keyed by the API route segment.
 *
 * These are literals from this file — never request data — because they are
 * interpolated into the statement below. The ids themselves are bound
 * parameters.
 */
export const REORDER_TABLES = {
  banners: "hero_banners",
  "hero-stats": "hero_stats",
  popular: "popular_services",
  products: "products",
  brands: "brands",
  features: "features",
  payments: "payment_methods",
  community: "community_links",
  faq: "faqs",
} as const;

export type ReorderTable = keyof typeof REORDER_TABLES;

/**
 * Writes a whole ordering in a single round trip.
 *
 * The previous implementation sent one UPDATE per row inside a transaction —
 * 200 statements for 200 rows, each a separate round trip to the database. This
 * builds one `UPDATE … FROM (VALUES …)`, so reordering costs one statement
 * regardless of list length, and is atomic without an explicit transaction.
 */
/**
 * Returns the number of rows the statement actually changed.
 *
 * Not the number requested. The two diverge whenever an id no longer exists —
 * a row deleted in another tab, or a client sending ids that belong to a
 * different resource — and reporting the request back as if it were the result
 * meant a reorder that moved nothing still answered "9 items reordered".
 */
export async function applyOrder(resource: ReorderTable, ids: string[]) {
  if (ids.length === 0) return 0;

  const table = REORDER_TABLES[resource];

  // ($1, $2::int), ($3, $4::int), …
  const values = ids
    .map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2}::int)`)
    .join(", ");

  const sql = `
    UPDATE "${table}" AS t
    SET "order" = v.ord, "updatedAt" = now()
    FROM (VALUES ${values}) AS v(id, ord)
    WHERE t."id" = v.id
  `;

  const params = ids.flatMap((id, index) => [id, index]);

  return prisma.$executeRawUnsafe(sql, ...params);
}
