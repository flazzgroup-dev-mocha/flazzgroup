import { prisma } from "@/lib/prisma";
import { itemRoute } from "@/lib/crud";
import { blogCategorySchema } from "@/lib/validators";

export const { PUT, DELETE } = itemRoute({
  resource: "blogTaxonomy",
  schema: blogCategorySchema,
  find: (id) => prisma.blogCategory.findUnique({ where: { id } }),
  update: (id, data, guard) => prisma.blogCategory.update({ where: { id, ...guard }, data }),
  remove: (id) => prisma.blogCategory.delete({ where: { id } }),
  label: (row) => row.name,
});
