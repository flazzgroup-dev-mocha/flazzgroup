import { prisma } from "@/lib/prisma";
import { itemRoute } from "@/lib/crud";
import { faqSchema } from "@/lib/validators";

export const { PUT, DELETE } = itemRoute({
  resource: "faq",
  schema: faqSchema,
  find: (id) => prisma.faq.findUnique({ where: { id } }),
  update: (id, data, guard) => prisma.faq.update({ where: { id, ...guard }, data }),
  remove: (id) => prisma.faq.delete({ where: { id } }),
  label: (row) => row.question,
});
