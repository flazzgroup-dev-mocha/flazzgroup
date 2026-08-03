import { SignJWT, jwtVerify } from "jose";

import type { AdminRole } from "@/lib/rbac";

/**
 * Edge-safe session primitives: JWT signing and verification only.
 *
 * Deliberately free of `server-only`, `next/headers`, Prisma and bcrypt so
 * middleware can import it and run on the edge runtime.
 */

export const SESSION_COOKIE = "flazz_admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  /**
   * The role at sign-in time.
   *
   * Carried in the token so the edge middleware can gate a route without a
   * database round trip. It is a *fast path only*: a token is valid for eight
   * hours, so a demotion or a suspension would otherwise take that long to bite.
   * Everything that actually touches data calls `requireSession`, which reloads
   * the row and trusts the database over the token — see lib/auth.ts.
   */
  role: AdminRole;
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET must be set to a random string of at least 32 characters."
    );
  }

  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT({
    email: payload.email,
    name: payload.name,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function readSessionToken(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });

    if (!payload.sub) return null;

    /**
     * An unrecognised role is not a role.
     *
     * A token minted before roles existed carries none, and a hand-edited one
     * could carry anything. Falling back to the *less* privileged value means a
     * malformed token can only ever lose access, never gain it.
     */
    const role: AdminRole = payload.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN";

    return {
      sub: payload.sub,
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      role,
    };
  } catch {
    return null;
  }
}
