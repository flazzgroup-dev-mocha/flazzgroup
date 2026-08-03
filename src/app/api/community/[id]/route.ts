import { prisma } from "@/lib/prisma";
import { itemRoute } from "@/lib/crud";
import { communityLinkSchema } from "@/lib/validators";

export const { PUT, DELETE } = itemRoute({
  resource: "community",
  schema: communityLinkSchema,
  find: (id) => prisma.communityLink.findUnique({ where: { id } }),
  update: (id, data, guard) => prisma.communityLink.update({ where: { id, ...guard }, data }),
  remove: (id) => prisma.communityLink.delete({ where: { id } }),
  label: (row) => row.title,
});
