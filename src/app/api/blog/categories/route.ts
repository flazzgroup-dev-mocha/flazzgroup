import { prisma } from "@/lib/prisma";
import { collectionRoute } from "@/lib/crud";
import { blogCategorySchema } from "@/lib/validators";

export const { GET, POST } = collectionRoute({
  resource: "blogTaxonomy",
  schema: blogCategorySchema,
  list: () => prisma.blogCategory.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] }),
  create: (data) => prisma.blogCategory.create({ data }),
  label: (row) => row.name,
});
