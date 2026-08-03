import { fail, ok, parseBody, withAdmin } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { findAdmin } from "@/lib/admins";
import { resetPasswordSchema } from "@/lib/validators";

type Context = { params: Promise<{ id: string }> };

/**
 * Resetting someone's password. SUPER_ADMIN only.
 *
 * Its own endpoint rather than a field on the edit form, for two reasons. It
 * must be impossible to change a password as a side effect of correcting a
 * name; and it earns its own audit entry, which is hard to guarantee when the
 * action is one optional key inside a general update.
 *
 * An ADMIN cannot reach this at all — not for a colleague, and not for
 * themselves — because the route requires SUPER_ADMIN. Self-service password
 * change is a separate feature and deliberately not smuggled in here.
 */
export const PUT = withAdmin(
  async (session, request: Request, context: Context) => {
    const { id } = await context.params;
    const { password } = await parseBody(request, resetPasswordSchema);

    const target = await findAdmin(id);
    if (!target) return fail("That account no longer exists.", 404);

    await prisma.admin.update({
      where: { id },
      data: { passwordHash: await hashPassword(password) },
    });

    await recordAudit({
      action: "PASSWORD_RESET",
      request,
      actor: { id: session.sub, email: session.email },
      target: { id: target.id, email: target.email },
      summary:
        session.sub === id ? "reset their own password" : "password reset by owner",
    });

    /**
     * Existing sessions are deliberately left alone.
     *
     * Invalidating them would need a token version column and a check on every
     * request; without one, "log everyone out" is a claim this code cannot
     * honour. Saying so plainly is better than implying a revocation that does
     * not happen — and disabling the account, which *is* enforced on every
     * request, is the control for a compromised login.
     */
    return ok({ id, sessionsRevoked: false });
  },
  { role: "SUPER_ADMIN" }
);
