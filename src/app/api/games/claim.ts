import "server-only";

import type { Prisma } from "@/generated/prisma/client";

/**
 * Makes one game the sole owner of the top-up catalogue.
 *
 * The `products` table is a single site-wide list with no game column, so the
 * catalogue can only ever describe one game. If two rows carried
 * `topUpEnabled`, the second game's page would render the first game's amounts
 * under its own name — a page that states a price for something it does not
 * sell, which is worse than the page not existing.
 *
 * Enforced as a transfer rather than a rejection, and that is a deliberate
 * trade. A rejection ("turn it off on Royal Dream first") leaves the operator
 * two saves away from a working state, and leaves the intermediate state —
 * *no* game owning the catalogue — reachable in between, which takes the
 * top-up off the menu and out of the sitemap until they finish. A transfer has
 * one outcome, is atomic, and is the thing they were asking for.
 *
 * Runs inside the caller's transaction so the write and the exclusivity it
 * depends on cannot be observed apart.
 */
export async function claimTopUp(
  tx: Prisma.TransactionClient,
  row: { id: string; topUpEnabled: boolean }
) {
  if (!row.topUpEnabled) return;

  await tx.game.updateMany({
    where: { id: { not: row.id }, topUpEnabled: true },
    data: { topUpEnabled: false },
  });
}
