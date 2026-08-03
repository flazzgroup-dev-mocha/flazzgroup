import { getSession } from "@/lib/auth";
import { listAdmins } from "@/lib/admins";
import { PageHeader } from "@/components/admin/PageHeader";
import { ForbiddenNotice } from "@/components/admin/ForbiddenNotice";
import { UserManager, type AdminUser } from "@/components/admin/UserManager";

export const dynamic = "force-dynamic";

const PER_PAGE = 10;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  /**
   * The middleware refuses this path for an ADMIN before it renders. This check
   * is what makes that refusal a control rather than a convenience: it runs
   * before the query, so no account list is read — let alone sent — even if the
   * middleware were bypassed or its matcher changed.
   */
  const session = await getSession();
  if (session?.role !== "SUPER_ADMIN") return <ForbiddenNotice />;

  const params = await searchParams;

  // Same rule as the public blog: a query string never reaches the database
  // unvalidated. Anything that is not a plain page number becomes page 1.
  const raw = params.page ?? "1";
  const page = /^\d+$/.test(raw) ? Math.max(1, Math.min(Number(raw), 10_000)) : 1;

  const { rows, total, pageCount } = await listAdmins({
    query: (params.q ?? "").slice(0, 80),
    page,
    perPage: PER_PAGE,
  });

  return (
    <>
      <PageHeader
        eyebrow="Access"
        title="Users"
        description="Who can sign in to this panel, and what each of them is allowed to change."
      />
      <UserManager
        users={rows as AdminUser[]}
        total={total}
        page={page}
        pageCount={pageCount}
        query={params.q ?? ""}
        currentUserId={session.sub}
      />
    </>
  );
}
