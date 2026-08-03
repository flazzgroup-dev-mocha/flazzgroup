import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ForbiddenError,
  RoleDeniedError,
  UnauthorizedError,
  requireRole,
  requireSession,
  getSession,
  type Session,
} from "@/lib/auth";
import { recordDenied } from "@/lib/audit";
import type { AdminRole } from "@/lib/rbac";
import { pruneActivity, recordChange } from "@/lib/activity";
import { toFieldErrors } from "@/lib/validators";
import type { ResourceKey } from "@/lib/cache";
import type { ActivityAction } from "@/generated/prisma/enums";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function fail(message: string, status = 400, fields?: Record<string, string>) {
  return NextResponse.json({ error: message, fields }, { status });
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Same-origin check for state-changing requests.
 *
 * The session cookie is already SameSite=Lax, which blocks cross-site form
 * posts. This is the second layer: a request that changes data must declare an
 * Origin matching the host it was sent to.
 */
export function isSameOrigin(request: Request) {
  if (SAFE_METHODS.has(request.method)) return true;

  const origin = request.headers.get("origin");

  // Non-browser clients (curl, server-to-server) send no Origin at all.
  if (!origin) return true;

  try {
    const host = request.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

type PrismaError = {
  code: string;
  meta?: {
    /** Shape used by the query engine. */
    target?: unknown;
    /** Shape used by a driver adapter — @prisma/adapter-pg, in our case. */
    driverAdapterError?: {
      cause?: { constraint?: { fields?: unknown; index?: unknown } };
    };
  };
};

function asPrismaError(error: unknown): PrismaError | null {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
    ? (error as PrismaError)
    : null;
}

const asStrings = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : typeof value === "string"
      ? [value]
      : [];

/**
 * The column a unique constraint fired on.
 *
 * Two shapes to cover: the query engine puts the column names in `meta.target`,
 * while a driver adapter reports the raw Postgres constraint instead. Anything
 * unrecognised falls back to the form-level slot, so the editor still sees a
 * message rather than a silent failed save.
 */
function conflictingField(error: PrismaError) {
  const constraint = error.meta?.driverAdapterError?.cause?.constraint;

  const columns = [
    ...asStrings(error.meta?.target),
    ...asStrings(constraint?.fields),
    // Last resort: derive it from a default constraint name such as
    // "blog_tags_slug_key".
    ...asStrings(constraint?.index).map((name) =>
      name.replace(/_key$/, "").split("_").pop() ?? ""
    ),
  ];

  return columns.find((column) => column && column !== "id") ?? "form";
}

/**
 * Wraps a handler with authentication, authorisation and uniform error shapes,
 * so every route handler stays down to its actual logic.
 *
 * `role` names the minimum required. It is the *only* place a route's
 * permission is declared, and it runs before the handler body, so forgetting a
 * check inside a handler cannot expose the route — the wrapper has already
 * decided.
 *
 * This is the enforcement point. The middleware refuses the same paths earlier
 * and the navigation hides them, but neither is a control: one can be reached
 * by a matcher change, the other by typing a URL. This one holds because it is
 * between the request and the data.
 */
export function withAdmin<Args extends unknown[]>(
  handler: (session: Session, ...args: Args) => Promise<NextResponse>,
  options: { role?: AdminRole } = {}
) {
  return async (...args: Args): Promise<NextResponse> => {
    const request = args[0] instanceof Request ? args[0] : null;

    try {
      if (request && !isSameOrigin(request)) {
        return fail("Cross-origin requests are not allowed.", 403);
      }

      const session = options.role
        ? await requireRole(options.role)
        : await requireSession();

      return await handler(session, ...args);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return fail("You need to sign in again.", 401);
      }

      /**
       * 403, not 404 and not a redirect.
       *
       * The caller is authenticated and simply may not do this; telling them so
       * is honest, and hiding it behind a 404 would only make a legitimate
       * ADMIN think the panel was broken. The attempt is recorded, because a
       * run of these is the clearest signal there is that somebody is walking
       * the API by hand.
       */
      if (error instanceof ForbiddenError) {
        /**
         * Only *role* refusals go in the audit log.
         *
         * A run of these means somebody is walking the admin API by hand, which
         * is worth being told about. The self-protection rules — "you cannot
         * delete your own account" — also answer 403, and logging those as
         * denied access would bury the signal under an owner clicking the wrong
         * button.
         */
        if (request && error instanceof RoleDeniedError) {
          const session = await getSession().catch(() => null);
          await recordDenied(
            request,
            session ? { id: session.sub, email: session.email } : null,
            new URL(request.url).pathname,
            request.method
          );
        }
        return fail(error.message, 403);
      }

      if (error instanceof z.ZodError) {
        return fail("Please fix the highlighted fields.", 422, toFieldErrors(error));
      }

      const prisma = asPrismaError(error);

      // "Record not found" for update/delete on a missing id.
      if (prisma?.code === "P2025") {
        return fail("That item no longer exists.", 404);
      }

      /**
       * A unique constraint. In practice this is always a slug an editor has
       * already used elsewhere, and it must come back as an inline field error
       * — reporting it as a generic 500 leaves them retrying a save that can
       * never succeed, with nothing on screen explaining why.
       */
      if (prisma?.code === "P2002") {
        const field = conflictingField(prisma);

        return fail("Please fix the highlighted fields.", 409, {
          [field]: `That ${field} is already used by another item. Choose a different one.`,
        });
      }

      console.error("[admin api]", error);
      return fail("Something went wrong. Please try again.", 500);
    }
  };
}

/**
 * The row version a client believes it is editing.
 *
 * Sent as `updatedAt`, the value that came back with the row. Every content
 * schema strips unknown keys, so it has to be read from the raw body before
 * validation rather than added to each schema.
 */
export const VERSION_FIELD = "updatedAt";

export type VersionedBody<T> = { data: T; expectedVersion: Date | null };

/**
 * Parses a body and separates the optimistic-concurrency token from it.
 *
 * Both halves come from one `request.json()` — a Request body is a stream and
 * can only be read once, so reading it twice would fail on the second call.
 */
export async function parseVersionedBody<S extends z.ZodType>(
  request: Request,
  schema: S
): Promise<VersionedBody<z.output<S>>> {
  const raw = await readJson(request);

  const token =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)[VERSION_FIELD]
      : undefined;

  let expectedVersion: Date | null = null;
  if (typeof token === "string" || token instanceof Date) {
    const parsed = new Date(token);
    if (!Number.isNaN(parsed.getTime())) expectedVersion = parsed;
  }

  return { data: schema.parse(raw), expectedVersion };
}

/** Shared by both body parsers so the "not JSON" error reads the same way. */
async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new z.ZodError([
      {
        code: "custom",
        path: ["form"],
        message: "The request body was not valid JSON.",
        input: undefined,
      },
    ]);
  }
}

/** Parses a JSON body against a schema, throwing ZodError for withAdmin. */
export async function parseBody<S extends z.ZodType>(
  request: Request,
  schema: S
): Promise<z.output<S>> {
  return schema.parse(await readJson(request));
}

/**
 * The one place a stale-write refusal is worded.
 *
 * 409 rather than 412: the client is not asking us to check a precondition it
 * set, it is discovering that the row moved underneath it.
 */
export const STALE_WRITE = {
  message: "Someone else changed this while you had it open.",
  fields: {
    form: "Your copy is out of date. Refresh to see the current version, then apply your change again.",
  },
} as const;

export function staleWrite() {
  return fail(STALE_WRITE.message, 409, { ...STALE_WRITE.fields });
}

/**
 * Whether a Prisma error is "no row matched".
 *
 * With a version guard in the `where` clause this no longer means only
 * "deleted" — it also means "found, but someone else has written to it since" —
 * so the caller has to look before deciding between 404 and 409.
 */
export function isRecordNotFound(error: unknown) {
  return asPrismaError(error)?.code === "P2025";
}

/** Logs the change, drops the cache tag and trims the activity table. */
export async function afterWrite(input: {
  resource: ResourceKey;
  action: ActivityAction;
  label: string;
  adminId: string;
}) {
  await recordChange(input);
  await pruneActivity();
}
