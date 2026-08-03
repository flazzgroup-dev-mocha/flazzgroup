import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/PageHeader";
import { CommunityManager } from "@/components/admin/managers/CommunityManager";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const items = await prisma.communityLink.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return (
    <>
      <PageHeader
        eyebrow="Homepage"
        title="Community links"
        description="Telegram, WhatsApp, channels and groups shown in the Community section."
      />
      <CommunityManager items={items} />
    </>
  );
}
