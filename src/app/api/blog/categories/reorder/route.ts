import { prisma } from "@/lib/prisma";
import { reorderRoute } from "@/lib/crud";

export const { POST } = reorderRoute({
  resource: "blogTaxonomy",
  /**
   * `updateMany` rather than `update`, so a category deleted in another tab
   * reports as "not updated" instead of throwing P2025 and surfacing as a 404.
   * The summed count is what `reorderRoute` compares against the request, and a
   * shortfall becomes a 409 telling the client its list is stale.
   */
  apply: async (ids) => {
    const results = await prisma.$transaction(
      ids.map((id, index) =>
        prisma.blogCategory.updateMany({ where: { id }, data: { order: index } })
      )
    );

    return results.reduce((total, result) => total + result.count, 0);
  },
});
