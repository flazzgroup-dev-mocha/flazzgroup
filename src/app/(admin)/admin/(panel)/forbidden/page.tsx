import { headers } from "next/headers";

import { getSession } from "@/lib/auth";
import { recordDenied } from "@/lib/audit";
import { PageHeader } from "@/components/admin/PageHeader";
import { ForbiddenNotice } from "@/components/admin/ForbiddenNotice";

/**
 * Where the middleware rewrites a request for a page above the caller's role.
 *
 * A rewrite rather than a redirect, so the address the person typed stays in
 * the bar and the response carries 403 — see src/middleware.ts. This page reads
 * nothing about the section that was refused, so reaching it reveals nothing.
 *
 * It also does the logging the middleware cannot. The audit table is behind
 * Prisma, which does not run in the edge runtime, so a refusal decided there
 * would leave no trace at all. The middleware passes the original path in
 * `?from=`, and this records it against the real headers.
 */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Not permitted — FLAZZ GROUP",
  robots: { index: false, follow: false },
};

export default async function ForbiddenPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  /**
   * Recorded only when the middleware sent us here.
   *
   * Someone opening /admin/forbidden directly has been refused nothing, and
   * logging that would put noise in the one table that should be all signal.
   * `from` arrives in a URL, so it is treated as untrusted: bounded, and
   * confined to this app's own admin tree before it is written anywhere.
   */
  if (from && from.startsWith("/admin/") && from.length < 200) {
    const session = await getSession();

    if (session) {
      await recordDenied(
        { headers: await headers() },
        { id: session.sub, email: session.email },
        from
      );
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Access"
        title="403 — Forbidden"
        description="You are signed in, but this section is not part of your role."
      />
      <ForbiddenNotice />
    </>
  );
}
