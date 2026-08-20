import { prisma } from "@/lib/prisma";
import { itemRoute } from "@/lib/crud";
import { gameSchema } from "@/lib/validators";
import { claimTopUp } from "../claim";

export const { PUT, DELETE } = itemRoute({
  resource: "games",
  schema: gameSchema,
  find: (id) => prisma.game.findUnique({ where: { id } }),
  /**
   * The version guard stays in the `where` clause, so a stale form still fails
   * the way it does everywhere else — and it fails *before* `claimTopUp` runs,
   * because the update is the first statement in the transaction and a
   * rejected one takes the transfer down with it.
   */
  update: (id, data, guard) =>
    prisma.$transaction(async (tx) => {
      const row = await tx.game.update({ where: { id, ...guard }, data });
      await claimTopUp(tx, row);
      return row;
    }),
  remove: (id) => prisma.game.delete({ where: { id } }),
  label: (row) => row.name,
  // Reclaims the card artwork when the row is deleted or its picture replaced.
  images: (row) => [row.imageUrl],
});
