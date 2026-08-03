import "server-only";

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { canAccess, type AdminRole } from "@/lib/rbac";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  readSessionToken,
  type SessionPayload,
} from "@/lib/session";

export { SESSION_COOKIE, readSessionToken };
export type { SessionPayload };

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

/** One place, so a change here cannot apply to sign-in but not to a reset. */
export const PASSWORD_COST = 12;

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, PASSWORD_COST);
}

export async function startSession(payload: SessionPayload) {
  const token = await createSessionToken(payload);
  const store = await cookies();

  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** The signed token's contents, with no check that the account still exists. */
export async function getSessionToken(): Promise<SessionPayload | null> {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Refused because of the caller's *role*, as opposed to a rule about the
 * specific action.
 *
 * The distinction earns its keep in the audit log. "An ADMIN tried to open the
 * user list" is a security event worth alerting on; "the owner tried to delete
 * their own account" is a person being stopped from making a mess, and mixing
 * the two buries the first under the second. Both still answer 403.
 */
export class RoleDeniedError extends ForbiddenError {
  constructor() {
    super("You do not have permission to do that.");
    this.name = "RoleDeniedError";
  }
}

export type Session = {
  sub: string;
  email: string;
  name: string;
  role: AdminRole;
  avatarUrl: string;
};

/**
 * The signed-in account, reloaded from the database on every call.
 *
 * The token alone is not enough to authorise anything. It is valid for eight
 * hours and states the role held when it was minted, so trusting it would mean
 * a demoted admin keeps super-admin powers until it expires, and a suspended
 * account keeps working for the rest of the day. Both are exactly the moments
 * the check matters.
 *
 * So the token proves *identity* — it is signed, and that cannot be forged —
 * and the database supplies *authority*. A revoked account is locked out on its
 * next request, not eight hours later.
 *
 * The cost is one primary-key lookup per admin request. The panel serves a
 * handful of people; correctness is worth more than the round trip.
 */
export async function getSession(): Promise<Session | null> {
  const token = await getSessionToken();
  if (!token) return null;

  const admin = await prisma.admin.findUnique({
    where: { id: token.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      avatarUrl: true,
    },
  });

  // Deleted, or suspended since the token was issued.
  if (!admin || !admin.isActive) return null;

  return {
    sub: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    avatarUrl: admin.avatarUrl,
  };
}

/** Throws when there is no valid session — use inside API route handlers. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();

  if (!session) {
    throw new UnauthorizedError();
  }

  return session;
}

/**
 * Requires a specific role.
 *
 * Distinct from `requireSession` on purpose: "not signed in" and "signed in but
 * not allowed" are different answers and deserve different statuses. Conflating
 * them sends an authenticated ADMIN back to the login screen, where signing in
 * again changes nothing.
 */
export async function requireRole(role: AdminRole): Promise<Session> {
  const session = await requireSession();

  if (role === "SUPER_ADMIN" && session.role !== "SUPER_ADMIN") {
    throw new RoleDeniedError();
  }

  return session;
}

/** Requires whatever role the given path demands. */
export async function requireAccessTo(pathname: string): Promise<Session> {
  const session = await requireSession();

  if (!canAccess(session.role, pathname)) {
    throw new RoleDeniedError();
  }

  return session;
}

/**
 * Signs in with email + password.
 *
 * Returns a discriminated result rather than a nullable admin so the caller can
 * record *why* a sign-in failed in the audit log while still showing one
 * message to the person at the keyboard. Distinguishing "unknown account",
 * "wrong password" and "suspended" on screen would be an enumeration oracle;
 * failing to distinguish them in the log would make a real intrusion attempt
 * indistinguishable from a typo.
 */
export type AuthResult =
  | { ok: true; admin: { id: string; email: string; name: string; role: AdminRole } }
  | { ok: false; reason: "unknown" | "password" | "inactive"; adminId?: string };

export async function authenticate(
  email: string,
  password: string
): Promise<AuthResult> {
  const admin = await prisma.admin.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!admin) {
    // Burn a comparable amount of time even when the account is missing, so
    // response timing does not reveal whether the email exists.
    await bcrypt.compare(
      password,
      "$2a$12$C6UzMDM.H6dfI/f/IKcEe.4gWLzXKPl0Zt0X1yq3z6Zc7mQKQ1n0S"
    );
    return { ok: false, reason: "unknown" };
  }

  const correct = await verifyPassword(password, admin.passwordHash);
  if (!correct) return { ok: false, reason: "password", adminId: admin.id };

  /**
   * The password check runs first, and deliberately.
   *
   * Refusing a suspended account before verifying its password would answer
   * faster for suspended accounts than for wrong passwords, turning the login
   * form into a way to enumerate who has been suspended.
   */
  if (!admin.isActive) return { ok: false, reason: "inactive", adminId: admin.id };

  await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    ok: true,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
  };
}
