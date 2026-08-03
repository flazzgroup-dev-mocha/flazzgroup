import { prisma } from "@/lib/prisma";
import { collectionRoute } from "@/lib/crud";
import { blogTagSchema } from "@/lib/validators";

export const { GET, POST } = collectionRoute({
  resource: "blogTaxonomy",
  schema: blogTagSchema,
  list: () => prisma.blogTag.findMany({ orderBy: { name: "asc" } }),
  create: (data) => prisma.blogTag.create({ data }),
  label: (row) => row.name,
});
