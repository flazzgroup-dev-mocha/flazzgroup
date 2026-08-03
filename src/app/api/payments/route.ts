import { prisma } from "@/lib/prisma";
import { collectionRoute } from "@/lib/crud";
import { paymentMethodSchema } from "@/lib/validators";

export const { GET, POST } = collectionRoute({
  resource: "payments",
  schema: paymentMethodSchema,
  list: () =>
    prisma.paymentMethod.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] }),
  create: (data) => prisma.paymentMethod.create({ data }),
  label: (row) => row.name,
});
