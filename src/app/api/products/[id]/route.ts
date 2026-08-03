import { prisma } from "@/lib/prisma";
import { itemRoute } from "@/lib/crud";
import { productSchema } from "@/lib/validators";

export const { PUT, DELETE } = itemRoute({
  resource: "products",
  schema: productSchema,
  find: (id) => prisma.product.findUnique({ where: { id } }),
  update: (id, data, guard) => prisma.product.update({ where: { id, ...guard }, data }),
  remove: (id) => prisma.product.delete({ where: { id } }),
  label: (row) => row.title,
  images: (row) => [row.imageUrl],
});
