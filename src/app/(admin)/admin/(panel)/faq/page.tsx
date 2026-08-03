import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/PageHeader";
import { FaqManager } from "@/components/admin/managers/FaqManager";

export const dynamic = "force-dynamic";

export default async function FaqPage() {
  const items = await prisma.faq.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return (
    <>
      <PageHeader
        eyebrow="Homepage"
        title="FAQ"
        description="Questions in the accordion. These also generate the FAQ structured data."
      />
      <FaqManager items={items} />
    </>
  );
}
