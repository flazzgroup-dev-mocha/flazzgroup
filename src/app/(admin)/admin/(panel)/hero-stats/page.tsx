import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/PageHeader";
import { HeroStatManager } from "@/components/admin/managers/HeroStatManager";

export const dynamic = "force-dynamic";

export default async function HeroStatPage() {
  const items = await prisma.heroStat.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return (
    <>
      <PageHeader
        eyebrow="Homepage"
        title="Hero stats"
        description="The proof strip directly under the hero slider."
      />
      <HeroStatManager items={items} />
    </>
  );
}
