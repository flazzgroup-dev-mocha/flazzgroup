import { prisma } from "@/lib/prisma";
import { collectionRoute } from "@/lib/crud";
import { communityLinkSchema } from "@/lib/validators";

export const { GET, POST } = collectionRoute({
  resource: "community",
  schema: communityLinkSchema,
  list: () =>
    prisma.communityLink.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] }),
  create: (data) => prisma.communityLink.create({ data }),
  label: (row) => row.title,
});
