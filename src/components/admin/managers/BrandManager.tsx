"use client";

import type { Brand } from "@/lib/models";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/field";
import { SwitchRow } from "@/components/ui/switch";
import {
  BrandStatusBadge,
  HueSwatch,
  TextCell,
  Thumb,
} from "@/components/admin/cells";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { ResourceScreen } from "@/components/admin/ResourceScreen";

type Draft = {
  name: string;
  description: string;
  logoUrl: string;
  link: string;
  status: "ONLINE" | "MAINTENANCE" | "COMING_SOON";
  hue: string;
  showOnHomepage: boolean;
  order: number;
};

export function BrandManager({ items }: { items: Brand[] }) {
  return (
    <ResourceScreen<Brand, Draft>
      endpoint="/api/brands"
      items={items}
      singular="Brand"
      emptyHint="Brands appear in the “Brand Kami” grid on the homepage."
      columns={[
        { header: "Logo", cell: (row) => <Thumb src={row.logoUrl} alt={row.name} rounded="rounded-xl" /> },
        {
          header: "Brand",
          cell: (row) => <TextCell primary={row.name} secondary={row.description} />,
        },
        { header: "Status", cell: (row) => <BrandStatusBadge status={row.status} /> },
        { header: "Accent", cell: (row) => <HueSwatch hue={row.hue} /> },
        {
          header: "Homepage",
          cell: (row) => (
            <span className="text-xs text-mist">
              {row.showOnHomepage ? "Shown" : "Hidden"}
            </span>
          ),
        },
      ]}
      itemLabel={(row) => row.name}
      toDraft={(row) => ({
        name: row?.name ?? "",
        description: row?.description ?? "",
        logoUrl: row?.logoUrl ?? "",
        link: row?.link ?? "#",
        status: row?.status ?? "ONLINE",
        hue: row?.hue ?? "#2E7CF6",
        showOnHomepage: row?.showOnHomepage ?? true,
        order: row?.order ?? items.length,
      })}
      renderForm={(draft, patch, errors) => (
        <>
          <ImageUploader
            value={draft.logoUrl}
            onChange={(url) => patch({ logoUrl: url })}
            folder="brand"
              label="Brand logo"
            error={errors.logoUrl}
            required
          />

          <Field label="Brand name" htmlFor="name" error={errors.name} required>
            <Input
              id="name"
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              aria-invalid={Boolean(errors.name)}
            />
          </Field>

          <Field label="Description" htmlFor="description" error={errors.description} hint="One short line — the card has no room for a paragraph.">
            <Textarea
              id="description"
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Visit link" htmlFor="link" error={errors.link} required hint="https://…, /path or #section">
              <Input
                id="link"
                value={draft.link}
                onChange={(e) => patch({ link: e.target.value })}
                aria-invalid={Boolean(errors.link)}
              />
            </Field>

            <Field label="Status" htmlFor="status" error={errors.status}>
              <NativeSelect
                id="status"
                value={draft.status}
                onChange={(e) => patch({ status: e.target.value as Draft["status"] })}
              >
                <option value="ONLINE">Online</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="COMING_SOON">Coming soon</option>
              </NativeSelect>
            </Field>
          </div>

          <Field label="Accent colour" htmlFor="hue" error={errors.hue} hint="Tints the card glow. Use a hex value.">
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
                aria-invalid={Boolean(errors.hue)}
              />
            </div>
          </Field>

          <SwitchRow
            id="showOnHomepage"
            label="Show on homepage"
            hint="Turn off to keep the brand on file without listing it."
            checked={draft.showOnHomepage}
            onCheckedChange={(value) => patch({ showOnHomepage: value })}
          />
        </>
      )}
    />
  );
}
