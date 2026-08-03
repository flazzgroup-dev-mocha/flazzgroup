"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";

import { ApiError, apiRequest } from "@/lib/client-api";
import { parseQuickActions } from "@/lib/chat";
import type { FieldErrors, ChatQuickAction } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { SwitchRow } from "@/components/ui/switch";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/surface";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { ChatActionsEditor } from "@/components/admin/ChatActionsEditor";

/**
 * The floating chat, extracted from the settings screen.
 *
 * The fields are unchanged; what changed is who can reach them. This form posts
 * to `/api/settings/chat`, whose schema contains only these columns — so an
 * ADMIN saving here cannot touch the site URL, the SEO copy or the analytics
 * IDs that live in the same database row.
 */

type Draft = {
  chatEnabled: boolean;
  chatLogoUrl: string;
  chatTitle: string;
  chatSubtitle: string;
  chatGreeting: string;
  chatPosition: "LEFT" | "RIGHT";
  chatQuickActions: ChatQuickAction[];
};

/**
 * Deliberately not `WebsiteSettings`.
 *
 * The prop type is the subset the chat screen is allowed to see, so widening
 * what the page selects would no longer typecheck — the permission boundary is
 * held by the compiler rather than by whoever edits the query next.
 */
export type ChatFormSettings = {
  chatEnabled: boolean;
  chatLogoUrl: string;
  chatTitle: string;
  chatSubtitle: string;
  chatGreeting: string;
  chatPosition: "LEFT" | "RIGHT";
  chatQuickActions: unknown;
  siteName: string;
  whatsappUrl: string;
  telegramUrl: string;
  updatedAt: Date | string;
};

export function ChatSettingsForm({ settings }: { settings: ChatFormSettings }) {
  const router = useRouter();

  const [draft, setDraft] = useState<Draft>({
    chatEnabled: settings.chatEnabled,
    chatLogoUrl: settings.chatLogoUrl,
    chatTitle: settings.chatTitle,
    chatSubtitle: settings.chatSubtitle,
    chatGreeting: settings.chatGreeting,
    chatPosition: settings.chatPosition,
    chatQuickActions: parseQuickActions(settings.chatQuickActions),
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  // Shared with the settings screen, since both write the same row. Held in
  // state and advanced from each response so a second save is not refused as
  // stale against its own first.
  const [version, setVersion] = useState<string | Date>(settings.updatedAt);

  const patch = (values: Partial<Draft>) =>
    setDraft((current) => ({ ...current, ...values }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setErrors({});

    try {
      const saved = await apiRequest<{ updatedAt: string }>("/api/settings/chat", {
        method: "PUT",
        body: { ...draft, updatedAt: version },
      });

      setVersion(saved.updatedAt);
      toast.success("Floating chat saved");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fields);
        toast.error(error.message);
        if (error.status === 409) router.refresh();
      } else {
        toast.error("Could not save.");
      }
    } finally {
      setSaving(false);
    }
  }

  const whatsappConfigured = settings.whatsappUrl.trim().length > 0;
  const telegramConfigured = settings.telegramUrl.trim().length > 0;

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 pb-24">
      <Card>
        <CardHeader>
          <CardTitle>Floating chat</CardTitle>
          <p className="text-xs text-fog">
            The support bubble on every public page.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4">
          {errors.form ? (
            <p
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300"
            >
              {errors.form}
            </p>
          ) : null}

          <SwitchRow
            id="chatEnabled"
            label="Show the floating chat"
            hint="Hidden automatically if neither WhatsApp nor Telegram is configured."
            checked={draft.chatEnabled}
            onCheckedChange={(value) => patch({ chatEnabled: value })}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <ImageUploader
              value={draft.chatLogoUrl}
              onChange={(url) => patch({ chatLogoUrl: url })}
              folder="logo"
              label="Chat avatar"
              hint="Shown in the panel header. Leave empty to use the site logo."
              error={errors.chatLogoUrl}
            />

            <div className="grid content-start gap-4">
              <Field
                label="Position"
                htmlFor="chatPosition"
                error={errors.chatPosition}
                hint="Which corner the bubble sits in."
              >
                <NativeSelect
                  id="chatPosition"
                  value={draft.chatPosition}
                  onChange={(e) =>
                    patch({ chatPosition: e.target.value as Draft["chatPosition"] })
                  }
                >
                  <option value="RIGHT">Bottom right</option>
                  <option value="LEFT">Bottom left</option>
                </NativeSelect>
              </Field>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Title"
              htmlFor="chatTitle"
              error={errors.chatTitle}
              hint="Leave empty to use the website name."
            >
              <Input
                id="chatTitle"
                value={draft.chatTitle}
                onChange={(e) => patch({ chatTitle: e.target.value })}
                placeholder={settings.siteName}
              />
            </Field>

            <Field
              label="Status line"
              htmlFor="chatSubtitle"
              error={errors.chatSubtitle}
              hint="Sits next to the green dot."
            >
              <Input
                id="chatSubtitle"
                value={draft.chatSubtitle}
                onChange={(e) => patch({ chatSubtitle: e.target.value })}
                placeholder="Online 24 Jam"
              />
            </Field>
          </div>

          <Field
            label="Greeting"
            htmlFor="chatGreeting"
            error={errors.chatGreeting}
            hint="Line breaks are kept exactly as you type them."
          >
            <Textarea
              id="chatGreeting"
              value={draft.chatGreeting}
              onChange={(e) => patch({ chatGreeting: e.target.value })}
              className="min-h-24"
              placeholder={"Halo!\nSelamat datang di FLAZZ GROUP 👋"}
            />
          </Field>

          <div className="grid gap-2">
            <span className="text-xs font-semibold tracking-wide text-mist">
              Quick actions
            </span>
            <p className="text-xs text-fog">
              Each one opens WhatsApp or Telegram with the message already typed.
              The destinations come from the contact links in General settings.
            </p>
            <ChatActionsEditor
              actions={draft.chatQuickActions}
              onChange={(chatQuickActions) => patch({ chatQuickActions })}
              errors={errors}
              whatsappConfigured={whatsappConfigured}
              telegramConfigured={telegramConfigured}
            />
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button type="submit" variant="gold" size="md" disabled={saving}>
          {saving ? (
            <LoaderCircle className="animate-spin" aria-hidden />
          ) : (
            <Save aria-hidden />
          )}
          {saving ? "Saving…" : "Save chat settings"}
        </Button>
      </div>
    </form>
  );
}
