import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/admin/PageHeader";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { ForbiddenNotice } from "@/components/admin/ForbiddenNotice";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  /**
   * The middleware already refuses this path for an ADMIN, with a 403. This is
   * the check that actually protects the data: it runs before any query, so
   * even if the matcher were changed or the middleware removed, nothing here is
   * read, let alone rendered.
   */
  const session = await getSession();
  if (session?.role !== "SUPER_ADMIN") return <ForbiddenNotice />;

  const settings = await prisma.websiteSettings.upsert({
    where: { id: "settings" },
    update: {},
    create: { id: "settings" },
  });

  return (
    <>
      <PageHeader
        eyebrow="Configuration"
        title="General settings"
        description="Identity, SEO, contact details, and which homepage sections are visible."
      />
      <SettingsForm settings={settings} />
    </>
  );
}
