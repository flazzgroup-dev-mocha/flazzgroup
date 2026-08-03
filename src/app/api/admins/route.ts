import { ok, parseBody, withAdmin } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { createAdmin, listAdmins } from "@/lib/admins";
import { createAdminSchema } from "@/lib/validators";

/**
 * Account management. SUPER_ADMIN only, declared once here.
 *
 * `withAdmin(..., { role: "SUPER_ADMIN" })` runs before the handler body, so
 * there is no path through this file that reaches the database without the
 * check having already passed.
 */

const PER_PAGE = 10;

export const GET = withAdmin(
  async (_session, request: Request) => {
    const url = new URL(request.url);

    // Same discipline as the public blog: never let a query string reach the
    // database as-is. A non-numeric page becomes page 1, not `skip: NaN`.
    const raw = url.searchParams.get("page") ?? "1";
    const page = /^\d+$/.test(raw) ? Math.min(Number(raw), 10_000) : 1;

    return ok(
      await listAdmins({
        query: (url.searchParams.get("q") ?? "").slice(0, 80),
        page: Math.max(1, page),
        perPage: PER_PAGE,
      })
    );
  },
  { role: "SUPER_ADMIN" }
);

export const POST = withAdmin(
  async (session, request: Request) => {
    const data = await parseBody(request, createAdminSchema);

    const admin = await createAdmin({
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
      avatarUrl: data.avatarUrl,
      isActive: data.isActive ?? true,
    });

    await recordAudit({
      action: "ADMIN_CREATED",
      request,
      actor: { id: session.sub, email: session.email },
      target: { id: admin.id, email: admin.email },
      summary: `created ${admin.role} account`,
    });

    return ok(admin, 201);
  },
  { role: "SUPER_ADMIN" }
);
