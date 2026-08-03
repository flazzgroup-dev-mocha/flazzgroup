import { prisma } from "@/lib/prisma";
import { itemRoute } from "@/lib/crud";
import { blogTagSchema } from "@/lib/validators";

export const { PUT, DELETE } = itemRoute({
  resource: "blogTaxonomy",
  schema: blogTagSchema,
  find: (id) => prisma.blogTag.findUnique({ where: { id } }),
  update: (id, data, guard) => prisma.blogTag.update({ where: { id, ...guard }, data }),
  remove: (id) => prisma.blogTag.delete({ where: { id } }),
  label: (row) => row.name,
});
