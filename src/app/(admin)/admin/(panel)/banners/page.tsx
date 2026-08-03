import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/PageHeader";
import {
  BannerManager,
  type AdminBanner,
} from "@/components/admin/managers/BannerManager";

export const dynamic = "force-dynamic";

export default async function BannerPage() {
  const items = await prisma.heroBanner.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  /**
   * Filename, dimensions and weight live on the upload record rather than the
   * banner, so the table joins them in one query keyed by URL. Banners that
   * predate Cloudinary simply have no asset row, and the table says so.
   */
  const assets = await prisma.mediaAsset.findMany({
    where: { secureUrl: { in: items.map((item) => item.imageUrl) } },
    select: {
      secureUrl: true,
      originalFilename: true,
      width: true,
      height: true,
      bytes: true,
    },
  });

  const byUrl = new Map(assets.map((asset) => [asset.secureUrl, asset]));

  const rows: AdminBanner[] = items.map((item) => ({
    ...item,
    asset: byUrl.get(item.imageUrl) ?? null,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Homepage"
        title="Hero banners"
        description="Slides in the homepage hero. Upload the finished artwork — drag to reorder, and the slider follows this order."
      />
      <BannerManager items={rows} />
    </>
  );
}
