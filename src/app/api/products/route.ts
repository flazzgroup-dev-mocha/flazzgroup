import { prisma } from "@/lib/prisma";
import { collectionRoute } from "@/lib/crud";
import { productSchema } from "@/lib/validators";

export const { GET, POST } = collectionRoute({
  resource: "products",
  schema: productSchema,
  list: () =>
    prisma.product.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] }),
  create: (data) => prisma.product.create({ data }),
  label: (row) => row.title,
});
