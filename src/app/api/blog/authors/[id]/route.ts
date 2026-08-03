import { prisma } from "@/lib/prisma";
import { itemRoute } from "@/lib/crud";
import { authorSchema } from "@/lib/validators";

export const { PUT, DELETE } = itemRoute({
  resource: "blogTaxonomy",
  schema: authorSchema,
  find: (id) => prisma.author.findUnique({ where: { id } }),
  update: (id, data, guard) => prisma.author.update({ where: { id, ...guard }, data }),
  remove: (id) => prisma.author.delete({ where: { id } }),
  label: (row) => row.name,
});
