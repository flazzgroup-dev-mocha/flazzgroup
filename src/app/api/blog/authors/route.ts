import { prisma } from "@/lib/prisma";
import { collectionRoute } from "@/lib/crud";
import { authorSchema } from "@/lib/validators";

export const { GET, POST } = collectionRoute({
  resource: "blogTaxonomy",
  schema: authorSchema,
  list: () => prisma.author.findMany({ orderBy: { name: "asc" } }),
  create: (data) => prisma.author.create({ data }),
  label: (row) => row.name,
});
