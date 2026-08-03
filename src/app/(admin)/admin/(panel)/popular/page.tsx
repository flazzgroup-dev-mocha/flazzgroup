import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/PageHeader";
import { PopularManager } from "@/components/admin/managers/PopularManager";

export const dynamic = "force-dynamic";

export default async function PopularPage() {
  const items = await prisma.popularService.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return (
    <>
      <PageHeader
        eyebrow="Homepage"
        title="Popular services"
        description="The three highlighted cards under “Populer Hari Ini”."
      />
      <PopularManager items={items} />
    </>
  );
}
