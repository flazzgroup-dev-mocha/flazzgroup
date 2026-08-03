import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/PageHeader";
import { BrandManager } from "@/components/admin/managers/BrandManager";

export const dynamic = "force-dynamic";

export default async function BrandPage() {
  const items = await prisma.brand.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return (
    <>
      <PageHeader
        eyebrow="Homepage"
        title="Brands"
        description="Stores in the “Brand Kami” grid. Drag to reorder, or hide one without deleting it."
      />
      <BrandManager items={items} />
    </>
  );
}
