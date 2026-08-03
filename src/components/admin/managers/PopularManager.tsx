"use client";

import type { PopularService } from "@/lib/models";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/field";
import { SwitchRow } from "@/components/ui/switch";
import { ActiveBadge, TextCell, Thumb } from "@/components/admin/cells";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { ResourceScreen } from "@/components/admin/ResourceScreen";

type Draft = {
  title: string;
  description: string;
  priceLabel: string;
  badge: string;
  href: string;
  imageUrl: string;
  accent: "GOLD" | "VOLT";
  isActive: boolean;
  order: number;
};

export function PopularManager({ items }: { items: PopularService[] }) {
  return (
    <ResourceScreen<PopularService, Draft>
      endpoint="/api/popular"
      items={items}
      singular="Service"
      addLabel="Add service"
      emptyHint="These are the three large cards under “Populer Hari Ini”."
      columns={[
        { header: "Image", cell: (row) => <Thumb src={row.imageUrl} /> },
        {
          header: "Service",
          cell: (row) => <TextCell primary={row.title} secondary={row.description} />,
        },
        {
          header: "Price label",
          cell: (row) => (
            <span className="font-mono text-xs text-gold">
              {row.priceLabel || "—"}
            </span>
          ),
        },
        {
          header: "Badge",
          cell: (row) => (
            <span className="text-xs text-mist">{row.badge || "—"}</span>
          ),
        },
        { header: "Status", cell: (row) => <ActiveBadge active={row.isActive} /> },
      ]}
      itemLabel={(row) => row.title}
      toDraft={(row) => ({
        title: row?.title ?? "",
        description: row?.description ?? "",
        priceLabel: row?.priceLabel ?? "",
        badge: row?.badge ?? "",
        href: row?.href ?? "#",
        imageUrl: row?.imageUrl ?? "",
        accent: row?.accent ?? "GOLD",
        isActive: row?.isActive ?? true,
        order: row?.order ?? items.length,
      })}
      renderForm={(draft, patch, errors) => (
        <>
          <ImageUploader
            value={draft.imageUrl}
            onChange={(url) => patch({ imageUrl: url })}
            folder="banner"
              label="Card image"
            aspect="wide"
            hint="Wide artwork works best — the card crops to 16:10."
            error={errors.imageUrl}
            required
          />

          <Field label="Title" htmlFor="title" error={errors.title} required>
            <Input
              id="title"
              value={draft.title}
              onChange={(e) => patch({ title: e.target.value })}
              aria-invalid={Boolean(errors.title)}
            />
          </Field>

          <Field label="Description" htmlFor="description" error={errors.description}>
            <Textarea
              id="description"
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price label" htmlFor="priceLabel" error={errors.priceLabel} hint="Free text, e.g. “Mulai Rp 13.000”.">
              <Input
                id="priceLabel"
                value={draft.priceLabel}
                onChange={(e) => patch({ priceLabel: e.target.value })}
              />
            </Field>

            <Field label="Badge" htmlFor="badge" error={errors.badge}>
              <Input
                id="badge"
                value={draft.badge}
                onChange={(e) => patch({ badge: e.target.value })}
              />
            </Field>

            <Field label="Link" htmlFor="href" error={errors.href}>
              <Input
                id="href"
                value={draft.href}
                onChange={(e) => patch({ href: e.target.value })}
              />
            </Field>

            <Field label="Badge colour" htmlFor="accent" error={errors.accent}>
              <NativeSelect
                id="accent"
                value={draft.accent}
                onChange={(e) => patch({ accent: e.target.value as Draft["accent"] })}
              >
                <option value="GOLD">Gold</option>
                <option value="VOLT">Blue</option>
              </NativeSelect>
            </Field>
          </div>

          <SwitchRow
            id="isActive"
            label="Show this service"
            checked={draft.isActive}
            onCheckedChange={(value) => patch({ isActive: value })}
          />
        </>
      )}
    />
  );
}
