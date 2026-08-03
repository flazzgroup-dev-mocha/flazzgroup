import { prisma } from "@/lib/prisma";
import { itemRoute } from "@/lib/crud";
import { heroBannerSchema } from "@/lib/validators";
import { bannerLabel } from "../label";

export const { PUT, DELETE } = itemRoute({
  resource: "banners",
  schema: heroBannerSchema,
  find: (id) => prisma.heroBanner.findUnique({ where: { id } }),
  update: (id, data, guard) => prisma.heroBanner.update({ where: { id, ...guard }, data }),
  remove: (id) => prisma.heroBanner.delete({ where: { id } }),
  label: bannerLabel,
  // Both slots, in a stable order, so a replaced desktop image is reclaimed
  // without touching the mobile crop.
  images: (row) => [row.imageUrl, row.mobileImageUrl],
});
