import { prisma } from "@/lib/prisma";
import { itemRoute } from "@/lib/crud";
import { popularServiceSchema } from "@/lib/validators";

export const { PUT, DELETE } = itemRoute({
  resource: "popular",
  schema: popularServiceSchema,
  find: (id) => prisma.popularService.findUnique({ where: { id } }),
  update: (id, data, guard) => prisma.popularService.update({ where: { id, ...guard }, data }),
  remove: (id) => prisma.popularService.delete({ where: { id } }),
  label: (row) => row.title,
  images: (row) => [row.imageUrl],
});
