"use client";

import type { Feature } from "@/lib/models";
import { FEATURE_ICONS } from "@/lib/validators";
import { Field, Input, NativeSelect } from "@/components/ui/field";
import { SwitchRow } from "@/components/ui/switch";
import { ActiveBadge, TextCell } from "@/components/admin/cells";
import { ResourceScreen } from "@/components/admin/ResourceScreen";

type Draft = {
  icon: (typeof FEATURE_ICONS)[number];
  title: string;
  description: string;
  isActive: boolean;
  order: number;
};

const iconLabels: Record<Draft["icon"], string> = {
  zap: "Lightning — speed",
  shield: "Shield — security",
  clock: "Clock — availability",
  card: "Card — payments",
  star: "Star — trust",
  chat: "Chat — support",
  crown: "Crown — premium",
  rocket: "Rocket — performance",
};

export function FeatureManager({ items }: { items: Feature[] }) {
  return (
    <ResourceScreen<Feature, Draft>
      endpoint="/api/features"
      items={items}
      singular="Feature"
      emptyHint="Features fill the “Why FLAZZ” grid — six works best."
      dialogSize="sm"
      columns={[
        {
          header: "Feature",
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
        { header: "Status", cell: (row) => <ActiveBadge active={row.isActive} /> },
      ]}
      itemLabel={(row) => row.title}
      toDraft={(row) => ({
        icon: (row?.icon as Draft["icon"]) ?? "zap",
        title: row?.title ?? "",
        description: row?.description ?? "",
        isActive: row?.isActive ?? true,
        order: row?.order ?? items.length,
      })}
      renderForm={(draft, patch, errors) => (
        <>
          <Field label="Icon" htmlFor="icon" error={errors.icon}>
            <NativeSelect
              id="icon"
              value={draft.icon}
              onChange={(e) => patch({ icon: e.target.value as Draft["icon"] })}
            >
              {FEATURE_ICONS.map((icon) => (
                <option key={icon} value={icon}>
                  {iconLabels[icon]}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Title" htmlFor="title" error={errors.title} required>
            <Input
              id="title"
              value={draft.title}
              onChange={(e) => patch({ title: e.target.value })}
              aria-invalid={Boolean(errors.title)}
            />
          </Field>

          <Field label="Description" htmlFor="description" error={errors.description} hint="A few words only — it renders as a small mono line.">
            <Input
              id="description"
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </Field>

          <SwitchRow
            id="isActive"
            label="Show this feature"
            checked={draft.isActive}
            onCheckedChange={(value) => patch({ isActive: value })}
          />
        </>
      )}
    />
  );
}
