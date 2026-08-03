import { prisma } from "@/lib/prisma";
import { CHAT_FORM_SELECT } from "@/lib/rbac";
import { PageHeader } from "@/components/admin/PageHeader";
import { ChatSettingsForm } from "@/components/admin/ChatSettingsForm";

export const dynamic = "force-dynamic";

/**
 * The floating chat, on its own page and open to both roles.
 *
 * It used to be a section inside General Settings, which became untenable once
 * roles existed: an ADMIN is meant to maintain the chat and must not see the
 * site URL, the SEO copy or the analytics IDs it shared a form with. Moving it
 * out is what lets both statements be true.
 */
export default async function ChatPage() {
  await prisma.websiteSettings.upsert({
    where: { id: "settings" },
    update: {},
    create: { id: "settings" },
  });

  /**
   * Only the chat columns cross into the browser.
   *
   * This is a Server Component handing props to a client one, so whatever is
   * selected here is serialised into the payload and readable by anyone with
   * the page open. Passing the whole settings row would put the SEO copy and
   * every analytics ID in front of an ADMIN who is not allowed either screen.
   */
  const settings = await prisma.websiteSettings.findUniqueOrThrow({
    where: { id: "settings" },
    select: CHAT_FORM_SELECT,
  });

  return (
    <>
      <PageHeader
        eyebrow="Support"
        title="Floating chat"
        description="The launcher, its greeting, and the pre-written openers visitors can pick."
      />
      <ChatSettingsForm settings={settings} />
    </>
  );
}
