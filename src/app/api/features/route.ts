import { prisma } from "@/lib/prisma";
import { collectionRoute } from "@/lib/crud";
import { featureSchema } from "@/lib/validators";

export const { GET, POST } = collectionRoute({
  resource: "features",
  schema: featureSchema,
  list: () =>
    prisma.feature.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] }),
  create: (data) => prisma.feature.create({ data }),
  label: (row) => row.title,
});
