import { prisma } from "@/lib/prisma";
import { itemRoute } from "@/lib/crud";
import { paymentMethodSchema } from "@/lib/validators";

export const { PUT, DELETE } = itemRoute({
  resource: "payments",
  schema: paymentMethodSchema,
  find: (id) => prisma.paymentMethod.findUnique({ where: { id } }),
  update: (id, data, guard) => prisma.paymentMethod.update({ where: { id, ...guard }, data }),
  remove: (id) => prisma.paymentMethod.delete({ where: { id } }),
  label: (row) => row.name,
  images: (row) => [row.logoUrl],
});
