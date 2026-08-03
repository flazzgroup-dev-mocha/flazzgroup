import { prisma } from "@/lib/prisma";
import { itemRoute } from "@/lib/crud";
import { featureSchema } from "@/lib/validators";

export const { PUT, DELETE } = itemRoute({
  resource: "features",
  schema: featureSchema,
  find: (id) => prisma.feature.findUnique({ where: { id } }),
  update: (id, data, guard) => prisma.feature.update({ where: { id, ...guard }, data }),
  remove: (id) => prisma.feature.delete({ where: { id } }),
  label: (row) => row.title,
});
