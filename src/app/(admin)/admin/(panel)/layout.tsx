import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";

/**
 * Server-side gate for the panel. Middleware already redirects unauthenticated
 * visitors; this is the second check that actually guards the data, so a
 * misconfigured matcher can never expose a page.
 */
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminShell
      adminName={session.name}
      adminEmail={session.email}
      role={session.role}
    >
      {children}
    </AdminShell>
  );
}
