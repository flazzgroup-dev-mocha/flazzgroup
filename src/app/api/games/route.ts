import { prisma } from "@/lib/prisma";
import { collectionRoute } from "@/lib/crud";
import { gameSchema } from "@/lib/validators";
import { claimTopUp } from "./claim";

/**
 * Admin only, like every other content endpoint — `collectionRoute` wraps both
 * handlers in `withAdmin`, and the middleware refuses `/api/*` without a
 * session before that.
 *
 * There is deliberately no public read endpoint. The site does not fetch games
 * over HTTP; it calls the cached `getGames()` server-side, which is faster,
 * cannot leak a hidden row, and is the pattern every other section follows.
 */
export const { GET, POST } = collectionRoute({
  resource: "games",
  schema: gameSchema,
  list: () =>
    prisma.game.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] }),
  create: (data) =>
    prisma.$transaction(async (tx) => {
      const row = await tx.game.create({ data });
      await claimTopUp(tx, row);
      return row;
    }),
  label: (row) => row.name,
});
