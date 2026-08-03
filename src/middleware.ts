import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, readSessionToken } from "@/lib/session";
import { canAccess } from "@/lib/rbac";

/**
 * Gate for everything under /admin and the admin APIs.
 *
 * This only verifies the session signature and reads the role out of it — it
 * never touches the database, so it stays fast and edge-safe.
 *
 * It is a **first** line, not the line. The role in the token is up to eight
 * hours old, so a just-demoted admin could still slip past here; every page and
 * every route handler re-checks against the database, and those are what
 * actually stand between a request and the data. Deleting this file would cost
 * speed and a nicer refusal, not safety.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await readSessionToken(token);

  const isLoginPage = pathname === "/admin/login";

  /**
   * The two API routes that are not admin surface.
   *
   * `/api/auth/*` runs before a session exists by definition. `/api/track`
   * receives events from anonymous visitors — gating it behind `requireSession`
   * would 401 every conversion the site is meant to measure. Both do their own
   * origin check and rate limiting.
   */
  const isPublicApi =
    pathname.startsWith("/api/auth/") || pathname === "/api/track";

  if (isPublicApi) {
    return NextResponse.next();
  }

  // API: answer with 401 JSON rather than an HTML redirect.
  if (pathname.startsWith("/api/")) {
    if (!session) {
      return NextResponse.json(
        { error: "You need to sign in again." },
        { status: 401 }
      );
    }

    /**
     * Authorisation for APIs is deliberately NOT decided here.
     *
     * Refusing at the edge looks tidier and is strictly worse: the audit log
     * lives behind Prisma, which cannot run in this runtime, so every refusal
     * short-circuited here vanishes without a trace. The first run of these
     * tests proved it — seven ADMIN attempts on super-admin endpoints, all
     * correctly refused, none of them recorded.
     *
     * `withAdmin` refuses the same requests a few milliseconds later, before
     * any handler body runs and before anything touches the database, and it
     * writes the row. Correct answer plus evidence beats correct answer alone.
     */
    return NextResponse.next();
  }

  if (isLoginPage) {
    if (session) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    const login = new URL("/admin/login", request.url);
    // Send the visitor back where they were headed after signing in.
    if (pathname !== "/admin") {
      login.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(login);
  }

  /**
   * A signed-in admin reaching for a page above their role.
   *
   * Rewritten rather than redirected so the URL they typed stays in the address
   * bar: being bounced elsewhere reads as "that link was wrong", when the true
   * answer is "this exists and you may not see it". The status is stated
   * explicitly because a rewrite otherwise answers 200, and a refusal that
   * reports success is not a refusal.
   */
  if (!canAccess(session.role, pathname)) {
    // The path travels with the rewrite so the forbidden page can record what
    // was actually reached for — see that page for why it, not this, logs it.
    const forbidden = new URL("/admin/forbidden", request.url);
    forbidden.searchParams.set("from", pathname);

    return NextResponse.rewrite(forbidden, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
