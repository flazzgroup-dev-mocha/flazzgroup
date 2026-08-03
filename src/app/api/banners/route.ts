import { prisma } from "@/lib/prisma";
import { collectionRoute } from "@/lib/crud";
import { heroBannerSchema } from "@/lib/validators";
import { bannerLabel } from "./label";

export const { GET, POST } = collectionRoute({
  resource: "banners",
  schema: heroBannerSchema,
  list: () =>
    prisma.heroBanner.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] }),
  create: (data) => prisma.heroBanner.create({ data }),
  label: bannerLabel,
});
