import { prisma } from "@/lib/prisma";
import { itemRoute } from "@/lib/crud";
import { brandSchema } from "@/lib/validators";

export const { PUT, DELETE } = itemRoute({
  resource: "brands",
  schema: brandSchema,
  find: (id) => prisma.brand.findUnique({ where: { id } }),
  update: (id, data, guard) => prisma.brand.update({ where: { id, ...guard }, data }),
  remove: (id) => prisma.brand.delete({ where: { id } }),
  label: (row) => row.name,
  images: (row) => [row.logoUrl],
});
