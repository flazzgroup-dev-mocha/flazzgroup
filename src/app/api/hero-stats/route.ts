import { prisma } from "@/lib/prisma";
import { collectionRoute } from "@/lib/crud";
import { heroStatSchema } from "@/lib/validators";

export const { GET, POST } = collectionRoute({
  resource: "heroStats",
  schema: heroStatSchema,
  list: () =>
    prisma.heroStat.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] }),
  create: (data) => prisma.heroStat.create({ data }),
  label: (row) => row.label,
});
