import { prisma } from "@/lib/prisma";
import { collectionRoute } from "@/lib/crud";
import { brandSchema } from "@/lib/validators";

export const { GET, POST } = collectionRoute({
  resource: "brands",
  schema: brandSchema,
  list: () =>
    prisma.brand.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] }),
  create: (data) => prisma.brand.create({ data }),
  label: (row) => row.name,
});
