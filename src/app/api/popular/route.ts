import { prisma } from "@/lib/prisma";
import { collectionRoute } from "@/lib/crud";
import { popularServiceSchema } from "@/lib/validators";

export const { GET, POST } = collectionRoute({
  resource: "popular",
  schema: popularServiceSchema,
  list: () =>
    prisma.popularService.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] }),
  create: (data) => prisma.popularService.create({ data }),
  label: (row) => row.title,
});
