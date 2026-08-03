import { prisma } from "@/lib/prisma";
import {
  afterWrite,
  fail,
  ok,
  parseVersionedBody,
  staleWrite,
  withAdmin,
} from "@/lib/api";
import { settingsSchema } from "@/lib/validators";

/**
 * Settings is a single row, so it has no collection or id segment —
 * GET reads it, PUT replaces it.
 *
 * SUPER_ADMIN only. This payload carries the site URL, the SEO copy, the
 * analytics and Google Ads IDs and the homepage section switches: between them
 * they can take the site out of the index, point its conversion data at another
 * account, or blank the page. That is the line between an owner and staff.
 *
 * The floating chat used to live in here too, and an ADMIN is meant to manage
 * it. It has its own endpoint now — see ./chat — precisely so granting that
 * does not hand over everything else in the same row.
 */

/**
 * Read first, create only if the row is genuinely absent.
 *
 * A bare `upsert` here issued a write on every read: it takes a row lock and
 * dirties a page each time anyone opens the settings screen, for a row that
 * exists on every deployed database after the first request. The same change
 * was already made to `getSettings()` on the public side; this was the copy it
 * left behind.
 */
export const GET = withAdmin(
  async () => {
  const existing = await prisma.websiteSettings.findUnique({
    where: { id: "settings" },
  });

  if (existing) return ok(existing);

  return ok(
    await prisma.websiteSettings.upsert({
      where: { id: "settings" },
      update: {},
      create: { id: "settings" },
    })
  );
  },
  { role: "SUPER_ADMIN" }
);

export const PUT = withAdmin(
  async (session, request: Request) => {
  const { data, expectedVersion } = await parseVersionedBody(request, settingsSchema);

  const existing = await prisma.websiteSettings.findUnique({
    where: { id: "settings" },
    select: { updatedAt: true },
  });

  /**
   * The singleton is the highest-contention row in the system — one row holding
   * identity, SEO, social links, the chat widget and every analytics ID — so
   * two people in the settings screen at once is not a corner case, and a
   * silent last-write-wins there quietly reverts whole sections of the site.
   *
   * `updateMany` rather than `update` because a version mismatch should be a
   * count of zero to inspect, not an exception to catch.
   */
  if (existing) {
    if (!expectedVersion) {
      return fail("Please fix the highlighted fields.", 400, {
        form: "This form is missing its version stamp. Refresh the page and try again.",
      });
    }

    const written = await prisma.websiteSettings.updateMany({
      where: { id: "settings", updatedAt: expectedVersion },
      data,
    });

    if (written.count === 0) return staleWrite();
  }

  const settings = await prisma.websiteSettings.upsert({
    where: { id: "settings" },
    update: existing ? {} : data,
    create: { id: "settings", ...data },
  });

  await afterWrite({
    resource: "settings",
    action: "UPDATE",
    label: "Website settings",
    adminId: session.sub,
  });

  return ok(settings);
  },
  { role: "SUPER_ADMIN" }
);
