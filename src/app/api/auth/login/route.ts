import { NextResponse } from "next/server";
import { z } from "zod";

import { isSameOrigin } from "@/lib/api";
import { authenticate, startSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { clientKey, rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { loginSchema, toFieldErrors } from "@/lib/validators";

/** Ten attempts per address per 15 minutes. */
const LIMIT = 10;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  // Every other write goes through `withAdmin`, which checks this. The auth
  // routes are exempt from that wrapper by definition — they run before a
  // session exists — so they have to make the check themselves, or they are
  // the two endpoints on the site with no origin guard at all.
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: "Cross-origin requests are not allowed." },
      { status: 403 }
    );
  }

  const key = clientKey(request, "login");
  const limit = rateLimit({ key, limit: LIMIT, windowMs: WINDOW_MS });

  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Check your details.",
        fields: toFieldErrors(parsed.error as z.ZodError),
      },
      { status: 422 }
    );
  }

  const result = await authenticate(parsed.data.email, parsed.data.password);

  if (!result.ok) {
    /**
     * One message for every failure — unknown address, wrong password, and a
     * suspended account alike.
     *
     * A suspended user being told "your account is disabled" would be kinder,
     * and would also confirm to anyone guessing that the address exists and
     * that its password was correct. The audit row below keeps the distinction
     * where it belongs: in the log, not on the screen.
     */
    await recordAudit({
      action: "LOGIN_FAILED",
      request,
      actor: result.adminId
        ? { id: result.adminId, email: parsed.data.email }
        : null,
      target: { email: parsed.data.email },
      summary:
        result.reason === "inactive"
          ? "sign-in refused: account is disabled"
          : result.reason === "password"
            ? "sign-in refused: wrong password"
            : "sign-in refused: no such account",
    });

    return NextResponse.json(
      { error: "Email or password is incorrect." },
      { status: 401 }
    );
  }

  const { admin } = result;

  // A legitimate sign-in should not leave the address near its limit.
  resetRateLimit(key);

  await startSession({
    sub: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  });

  await prisma.activityLog.create({
    data: {
      entity: "settings",
      action: "LOGIN",
      label: `${admin.email} signed in`,
      adminId: admin.id,
    },
  });

  await recordAudit({
    action: "LOGIN",
    request,
    actor: { id: admin.id, email: admin.email },
    summary: `signed in as ${admin.role}`,
  });

  return NextResponse.json({
    data: { email: admin.email, name: admin.name, role: admin.role },
  });
}
