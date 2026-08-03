import "server-only";

import { prisma } from "@/lib/prisma";
import { ForbiddenError, hashPassword } from "@/lib/auth";
import type { AdminRole } from "@/lib/rbac";

/**
 * Account management, and the rules that stop it locking everyone out.
 *
 * These live here rather than in the route handlers because every one of them
 * has to hold for *every* path that changes an account. A rule enforced in the
 * PUT handler but not the DELETE handler is not a rule.
 */

/** Columns safe to send to the browser. Never the password hash. */
export const ADMIN_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatarUrl: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type AdminRow = Awaited<ReturnType<typeof findAdmin>>;

export function findAdmin(id: string) {
  return prisma.admin.findUnique({ where: { id }, select: ADMIN_SELECT });
}

/**
 * How many super admins would remain if this one stopped being one.
 *
 * The count is of *active* super admins: an account that cannot sign in is not
 * a way back into the settings screen, so disabling the last one locks the
 * owner out just as thoroughly as deleting it.
 */
async function otherActiveSuperAdmins(excludeId: string) {
  return prisma.admin.count({
    where: { role: "SUPER_ADMIN", isActive: true, id: { not: excludeId } },
  });
}

export class LastSuperAdminError extends ForbiddenError {
  constructor(action: string) {
    super(
      `This is the last active Super Admin. Promote another account before you ${action} it.`
    );
    this.name = "LastSuperAdminError";
  }
}

export class SelfActionError extends ForbiddenError {
  constructor(message: string) {
    super(message);
    this.name = "SelfActionError";
  }
}

/**
 * Refuses a change that would leave nobody able to administer the site.
 *
 * Called before demoting, disabling and deleting, because all three have the
 * same consequence: one fewer account that can reach the settings and the user
 * list. Losing the last one is unrecoverable from inside the product — it would
 * take a database console to fix.
 */
export async function assertNotLastSuperAdmin(
  target: { id: string; role: AdminRole; isActive: boolean },
  action: "delete" | "disable" | "demote"
) {
  if (target.role !== "SUPER_ADMIN") return;

  // Already inactive: it is not the account holding the door open.
  if (!target.isActive && action !== "delete") return;

  const remaining = await otherActiveSuperAdmins(target.id);
  if (remaining === 0) throw new LastSuperAdminError(action);
}

/**
 * Refuses the ways an owner can lock themselves out by accident.
 *
 * Deleting or disabling your own account signs you out immediately and, if you
 * were the only one, permanently. Demoting yourself is the same mistake wearing
 * a different label: you lose the Users screen you would need to undo it.
 *
 * Nothing stops a Super Admin doing any of this to a *different* account, which
 * is the whole point of the screen.
 */
export function assertNotSelf(
  actorId: string,
  targetId: string,
  action: "delete" | "disable" | "demote"
) {
  if (actorId !== targetId) return;

  const messages = {
    delete: "You cannot delete your own account.",
    disable: "You cannot disable your own account.",
    demote: "You cannot change your own role.",
  } as const;

  throw new SelfActionError(messages[action]);
}

/** Normalised the same way everywhere, so a lookup cannot miss on casing. */
export const normaliseEmail = (email: string) => email.toLowerCase().trim();

export async function createAdmin(input: {
  name: string;
  email: string;
  password: string;
  role: AdminRole;
  avatarUrl: string;
  isActive: boolean;
}) {
  return prisma.admin.create({
    data: {
      name: input.name,
      email: normaliseEmail(input.email),
      passwordHash: await hashPassword(input.password),
      role: input.role,
      avatarUrl: input.avatarUrl,
      isActive: input.isActive,
    },
    select: ADMIN_SELECT,
  });
}

/**
 * A page of accounts, newest-looking first.
 *
 * Ordered super admins first, then by name, so the people who can change
 * anything are visible without scrolling — the list exists to be audited as
 * much as to be edited.
 */
export async function listAdmins(options: {
  query: string;
  page: number;
  perPage: number;
}) {
  const query = options.query.trim();

  const where = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { email: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.admin.findMany({
      where,
      select: ADMIN_SELECT,
      orderBy: [{ role: "asc" }, { name: "asc" }],
      skip: (options.page - 1) * options.perPage,
      take: options.perPage,
    }),
    prisma.admin.count({ where }),
  ]);

  return {
    rows,
    total,
    page: options.page,
    perPage: options.perPage,
    pageCount: Math.max(1, Math.ceil(total / options.perPage)),
  };
}
