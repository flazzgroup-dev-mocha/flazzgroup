import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/PageHeader";
import { GameManager } from "@/components/admin/managers/GameManager";

export const dynamic = "force-dynamic";

export default async function GamesPage() {
  const items = await prisma.game.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return (
    <>
      <PageHeader
        eyebrow="Homepage"
        title="Games"
        description="The picker visitors land on. Drag to reorder, or hide a game without deleting it."
      />
      <GameManager items={items} />
    </>
  );
}
