import "server-only";

import { revalidateTag } from "next/cache";

import { prisma } from "@/lib/prisma";
import { tagsFor, type ResourceKey } from "@/lib/cache";
import type { ActivityAction } from "@/generated/prisma/enums";

/** How many activity entries to keep. */
const ACTIVITY_KEEP = 200;

/**
 * Records what changed and drops the matching homepage cache tag.
 * Call this from every admin write so the public site and the dashboard
 * activity feed both stay honest.
 */
export async function recordChange(input: {
  resource: ResourceKey;
  action: ActivityAction;
  label: string;
  adminId?: string | null;
}) {
  await prisma.activityLog.create({
    data: {
      entity: input.resource,
      action: input.action,
      label: input.label.slice(0, 160),
      adminId: input.adminId ?? null,
    },
  });

  for (const tag of tagsFor(input.resource)) {
    revalidateTag(tag);
  }
}

/**
 * Trims the log so it cannot grow without bound.
 *
 * One statement instead of three, and it deletes by id rather than by
 * timestamp: the previous version compared `createdAt <= cutoff`, which also
 * removed any other row sharing that millisecond.
 */
export async function pruneActivity(keep = ACTIVITY_KEEP) {
  return prisma.$executeRaw`
    DELETE FROM "activity_logs"
    WHERE "id" IN (
      SELECT "id" FROM "activity_logs"
      ORDER BY "createdAt" DESC, "id" DESC
      OFFSET ${keep}
    )
  `;
}
