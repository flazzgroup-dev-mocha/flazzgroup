import { prisma } from "@/lib/prisma";
import { collectionRoute } from "@/lib/crud";
import { faqSchema } from "@/lib/validators";

export const { GET, POST } = collectionRoute({
  resource: "faq",
  schema: faqSchema,
  list: () =>
    prisma.faq.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] }),
  create: (data) => prisma.faq.create({ data }),
  label: (row) => row.question,
});
