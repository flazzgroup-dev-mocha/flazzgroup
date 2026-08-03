import { prisma } from "@/lib/prisma";
import {
  afterWrite,
  fail,
  ok,
  parseVersionedBody,
  staleWrite,
  withAdmin,
} from "@/lib/api";
import { chatSettingsSchema } from "@/lib/validators";
import { CHAT_FORM_SELECT } from "@/lib/rbac";

/**
 * The floating chat widget, on its own endpoint, open to both roles.
 *
 * This exists because permissions and storage disagree. The chat lives in the
 * same singleton row as the site URL, the SEO copy and the analytics IDs — but
 * an ADMIN is meant to maintain the chat and must not touch any of the rest.
 *
 * Splitting the *endpoint* is what makes that enforceable. `chatSettingsSchema`
 * contains only the chat columns and Zod strips everything else, so an ADMIN
 * posting `{ chatTitle, siteUrl, gtmId }` here changes the title and nothing
 * else — no allowlist to keep in step with the schema, no field that silently
 * becomes writable when somebody extends the form later.
 *
 * The alternative, one endpoint that filters by role, was rejected for exactly
 * that reason: it works until the day a new column is added to the wrong list.
 */

export const GET = withAdmin(async () => {
  // Narrowed, not the whole row — see CHAT_FORM_SELECT.
  const settings = await prisma.websiteSettings.findUnique({
    where: { id: "settings" },
    select: CHAT_FORM_SELECT,
  });

  if (settings) return ok(settings);

  await prisma.websiteSettings.upsert({
    where: { id: "settings" },
    update: {},
    create: { id: "settings" },
  });

  return ok(
    await prisma.websiteSettings.findUniqueOrThrow({
      where: { id: "settings" },
      select: CHAT_FORM_SELECT,
    })
  );
});

export const PUT = withAdmin(async (session, request: Request) => {
  const { data, expectedVersion } = await parseVersionedBody(
    request,
    chatSettingsSchema
  );

  const existing = await prisma.websiteSettings.findUnique({
    where: { id: "settings" },
    select: { updatedAt: true },
  });

  if (!existing) return fail("Settings are not initialised yet.", 404);

  if (!expectedVersion) {
    return fail("Please fix the highlighted fields.", 400, {
      form: "This form is missing its version stamp. Refresh the page and try again.",
    });
  }

  // Shares the settings row's version, so an owner editing the SEO tab and an
  // admin editing the chat cannot silently overwrite one another.
  const written = await prisma.websiteSettings.updateMany({
    where: { id: "settings", updatedAt: expectedVersion },
    data,
  });

  if (written.count === 0) return staleWrite();

  await afterWrite({
    resource: "settings",
    action: "UPDATE",
    label: "Floating chat",
    adminId: session.sub,
  });

  return ok(
    await prisma.websiteSettings.findUniqueOrThrow({
      where: { id: "settings" },
      select: CHAT_FORM_SELECT,
    })
  );
});
