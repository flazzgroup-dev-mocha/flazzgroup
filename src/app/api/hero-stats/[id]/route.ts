import { prisma } from "@/lib/prisma";
import { itemRoute } from "@/lib/crud";
import { heroStatSchema } from "@/lib/validators";

export const { PUT, DELETE } = itemRoute({
  resource: "heroStats",
  schema: heroStatSchema,
  find: (id) => prisma.heroStat.findUnique({ where: { id } }),
  update: (id, data, guard) => prisma.heroStat.update({ where: { id, ...guard }, data }),
  remove: (id) => prisma.heroStat.delete({ where: { id } }),
  label: (row) => row.label,
});
