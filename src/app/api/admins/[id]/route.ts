import { fail, ok, parseVersionedBody, staleWrite, withAdmin } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_SELECT,
  assertNotLastSuperAdmin,
  assertNotSelf,
  findAdmin,
  normaliseEmail,
} from "@/lib/admins";
import { updateAdminSchema } from "@/lib/validators";

type Context = { params: Promise<{ id: string }> };

/**
 * Editing and deleting an account. SUPER_ADMIN only.
 *
 * The interesting part is not the CRUD, it is the four ways this screen could
 * lock the owner out of their own site — demoting yourself, disabling yourself,
 * deleting yourself, and removing the last Super Admin. Each is checked against
 * the row as it exists *now*, not as the form remembers it, because the form
 * could have been open while somebody else changed it.
 */

export const PUT = withAdmin(
  async (session, request: Request, context: Context) => {
    const { id } = await context.params;
    const { data, expectedVersion } = await parseVersionedBody(
      request,
      updateAdminSchema
    );

    const before = await findAdmin(id);
    if (!before) return fail("That account no longer exists.", 404);

    if (!expectedVersion) {
      return fail("Please fix the highlighted fields.", 400, {
        form: "This form is missing its version stamp. Refresh the page and try again.",
      });
    }

    const isActive = data.isActive ?? before.isActive;
    const demoting = before.role === "SUPER_ADMIN" && data.role === "ADMIN";
    const disabling = before.isActive && !isActive;

    // Refuse before writing anything, so a rejected edit changes nothing at all.
    if (demoting) {
      assertNotSelf(session.sub, id, "demote");
      await assertNotLastSuperAdmin(before, "demote");
    }
    if (disabling) {
      assertNotSelf(session.sub, id, "disable");
      await assertNotLastSuperAdmin(before, "disable");
    }

    const written = await prisma.admin.updateMany({
      where: { id, updatedAt: expectedVersion },
      data: {
        name: data.name,
        email: normaliseEmail(data.email),
        role: data.role,
        avatarUrl: data.avatarUrl,
        isActive,
      },
    });

    if (written.count === 0) return staleWrite();

    const after = await prisma.admin.findUniqueOrThrow({
      where: { id },
      select: ADMIN_SELECT,
    });

    const actor = { id: session.sub, email: session.email };
    const target = { id: after.id, email: after.email };

    /**
     * Three separate audit entries, not one "updated".
     *
     * A role change and a suspension are the events somebody reviewing this log
     * is looking for; burying them inside a generic update means finding them
     * requires diffing rows that were never stored.
     */
    if (before.role !== after.role) {
      await recordAudit({
        action: "ROLE_CHANGED",
        request,
        actor,
        target,
        summary: `role changed ${before.role} to ${after.role}`,
      });
    }

    if (before.isActive !== after.isActive) {
      await recordAudit({
        action: after.isActive ? "ADMIN_ENABLED" : "ADMIN_DISABLED",
        request,
        actor,
        target,
        summary: after.isActive ? "account enabled" : "account disabled",
      });
    }

    if (before.name !== after.name || before.email !== after.email) {
      await recordAudit({
        action: "ADMIN_UPDATED",
        request,
        actor,
        target,
        summary: `profile updated${before.email !== after.email ? ` (was ${before.email})` : ""}`,
      });
    }

    return ok(after);
  },
  { role: "SUPER_ADMIN" }
);

export const DELETE = withAdmin(
  async (session, request: Request, context: Context) => {
    const { id } = await context.params;

    const target = await findAdmin(id);
    if (!target) return fail("That account no longer exists.", 404);

    assertNotSelf(session.sub, id, "delete");
    await assertNotLastSuperAdmin(target, "delete");

    await prisma.admin.delete({ where: { id } });

    /**
     * Recorded after the delete, and it survives it: `audit_logs.actorId` is
     * ON DELETE SET NULL and the email is stored verbatim, so removing an
     * account never erases the trail of what it did — or of who removed it.
     */
    await recordAudit({
      action: "ADMIN_DELETED",
      request,
      actor: { id: session.sub, email: session.email },
      target: { id: target.id, email: target.email },
      summary: `deleted ${target.role} account`,
    });

    return ok({ id });
  },
  { role: "SUPER_ADMIN" }
);
