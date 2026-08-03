"use client";

import type { CommunityLink } from "@/lib/models";
import { COMMUNITY_ICONS } from "@/lib/validators";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/field";
import { SwitchRow } from "@/components/ui/switch";
import { ActiveBadge, HueSwatch, TextCell } from "@/components/admin/cells";
import { ResourceScreen } from "@/components/admin/ResourceScreen";

type Draft = {
  icon: (typeof COMMUNITY_ICONS)[number];
  title: string;
  description: string;
  meta: string;
  ctaLabel: string;
  url: string;
  hue: string;
  isActive: boolean;
  order: number;
};

const iconLabels: Record<Draft["icon"], string> = {
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  megaphone: "Channel / megaphone",
  users: "Group / people",
};

export function CommunityManager({ items }: { items: CommunityLink[] }) {
  return (
    <ResourceScreen<CommunityLink, Draft>
      endpoint="/api/community"
      items={items}
      singular="Community link"
      addLabel="Add link"
      emptyHint="These become the four cards in the Community section."
      columns={[
        {
          header: "Channel",
          cell: (row) => <TextCell primary={row.title} secondary={row.description} />,
        },
        {
          header: "Icon",
          cell: (row) => (
            <span className="font-mono text-[.68rem] text-fog uppercase">
              {row.icon}
            </span>
          ),
        },
        {
          header: "URL",
          cell: (row) => (
            <span className="block max-w-56 truncate font-mono text-[.68rem] text-mist">
              {row.url}
            </span>
          ),
        },
        { header: "Accent", cell: (row) => <HueSwatch hue={row.hue} /> },
        { header: "Status", cell: (row) => <ActiveBadge active={row.isActive} /> },
      ]}
      itemLabel={(row) => row.title}
      toDraft={(row) => ({
        icon: (row?.icon as Draft["icon"]) ?? "telegram",
        title: row?.title ?? "",
        description: row?.description ?? "",
        meta: row?.meta ?? "",
        ctaLabel: row?.ctaLabel ?? "Buka",
        url: row?.url ?? "",
        hue: row?.hue ?? "#2E7CF6",
        isActive: row?.isActive ?? true,
        order: row?.order ?? items.length,
      })}
      renderForm={(draft, patch, errors) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" htmlFor="title" error={errors.title} required>
              <Input
                id="title"
                value={draft.title}
                onChange={(e) => patch({ title: e.target.value })}
                aria-invalid={Boolean(errors.title)}
              />
            </Field>

            <Field label="Icon" htmlFor="icon" error={errors.icon}>
              <NativeSelect
                id="icon"
                value={draft.icon}
                onChange={(e) => patch({ icon: e.target.value as Draft["icon"] })}
              >
                {COMMUNITY_ICONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {iconLabels[icon]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          <Field label="Description" htmlFor="description" error={errors.description}>
            <Textarea
              id="description"
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Chip text" htmlFor="meta" error={errors.meta} hint="Small mono label, e.g. “Balas < 3 menit”.">
              <Input
                id="meta"
                value={draft.meta}
                onChange={(e) => patch({ meta: e.target.value })}
              />
            </Field>

            <Field label="Button label" htmlFor="ctaLabel" error={errors.ctaLabel} required>
              <Input
                id="ctaLabel"
                value={draft.ctaLabel}
                onChange={(e) => patch({ ctaLabel: e.target.value })}
                aria-invalid={Boolean(errors.ctaLabel)}
              />
            </Field>
          </div>

          <Field label="URL" htmlFor="url" error={errors.url} required hint="Full link, e.g. https://t.me/yourchannel">
            <Input
              id="url"
              value={draft.url}
              onChange={(e) => patch({ url: e.target.value })}
              aria-invalid={Boolean(errors.url)}
            />
          </Field>

          <Field label="Accent colour" htmlFor="hue" error={errors.hue}>
            <div className="flex items-center gap-3">
              <input
                type="color"
                aria-label="Pick accent colour"
                value={/^#[0-9a-f]{6}$/i.test(draft.hue) ? draft.hue : "#2E7CF6"}
                onChange={(e) => patch({ hue: e.target.value.toUpperCase() })}
                className="size-11 shrink-0 cursor-pointer rounded-xl border border-white/10 bg-transparent"
              />
              <Input
                id="hue"
                value={draft.hue}
                onChange={(e) => patch({ hue: e.target.value })}
                className="font-mono uppercase"
              />
            </div>
          </Field>

          <SwitchRow
            id="isActive"
            label="Show this link"
            checked={draft.isActive}
            onCheckedChange={(value) => patch({ isActive: value })}
          />
        </>
      )}
    />
  );
}
