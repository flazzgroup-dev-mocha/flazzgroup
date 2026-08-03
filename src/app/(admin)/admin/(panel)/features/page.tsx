import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/PageHeader";
import { FeatureManager } from "@/components/admin/managers/FeatureManager";

export const dynamic = "force-dynamic";

export default async function FeaturePage() {
  const items = await prisma.feature.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return (
    <>
      <PageHeader
        eyebrow="Homepage"
        title="Features"
        description="Reasons to buy, shown in the “Why FLAZZ” grid."
      />
      <FeatureManager items={items} />
    </>
  );
}
