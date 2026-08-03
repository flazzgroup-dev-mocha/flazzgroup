import "server-only";

import { prisma } from "@/lib/prisma";
import { clientIp, type HeaderSource } from "@/lib/client-ip";
import type { AuditAction } from "@/generated/prisma/enums";

/**
 * The security trail: who did something sensitive, when, and from where.
 *
 * Kept apart from `recordChange`, which feeds the dashboard's "recent activity"
 * and is pruned to 200 rows. A trail that a busy afternoon of FAQ edits can
 * flush is not a trail — a failed-login burst has to still be there next week.
 *
 * Everything here is best-effort. A write that cannot be recorded must never
 * turn a successful sign-in into a 500, and must never *prevent* the action it
 * was describing: the audit row is evidence, not a gate.
 */

export type AuditInput = {
  action: AuditAction;
  /**
   * Where the request came from.
   *
   * A `Request` in a route handler; `{ headers: await headers() }` in a Server
   * Component. Both expose the same thing, and taking the narrower shape means
   * a page never has to invent a Request — which would throw away the real IP
   * and user agent, the two fields an investigation actually needs.
   */
  request: HeaderSource;
  actor?: { id: string; email: string } | null;
  /** The account acted upon, when that differs from the actor. */
  target?: { id?: string | null; email?: string } | null;
  summary?: string;
};

/** User agents are attacker-controlled and unbounded; store a usable prefix. */
const MAX_USER_AGENT = 300;

export async function recordAudit(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        actorId: input.actor?.id ?? null,
        actorEmail: input.actor?.email?.slice(0, 200) ?? "",
        targetId: input.target?.id ?? null,
        targetEmail: input.target?.email?.slice(0, 200) ?? "",
        summary: (input.summary ?? "").slice(0, 300),
        /**
         * Null when no proxy vouches for the caller — see lib/client-ip.ts.
         * Recording an unverified header here would put a value in the audit
         * trail that the sender chose, which is worse than recording nothing:
         * an investigation would chase an address the attacker picked.
         */
        ipAddress: clientIp(input.request) ?? "",
        userAgent: (input.request.headers.get("user-agent") ?? "").slice(
          0,
          MAX_USER_AGENT
        ),
      },
    });
  } catch (error) {
    // Never let bookkeeping break the thing it is describing.
    console.error("[audit] could not record", input.action, error);
  }
}

/**
 * Records a refused request.
 *
 * Separate helper because these are the rows worth alerting on: one is a
 * mistyped URL, fifty in a minute is somebody working through the admin API by
 * hand.
 */
export function recordDenied(
  request: HeaderSource,
  actor: { id: string; email: string } | null,
  pathname: string,
  method = "GET"
) {
  return recordAudit({
    action: "ACCESS_DENIED",
    request,
    actor,
    summary: `${method} ${pathname}`,
  });
}
