"use client";

import type { PaymentMethod } from "@/lib/models";
import { Field, Input } from "@/components/ui/field";
import { SwitchRow } from "@/components/ui/switch";
import { ActiveBadge, HueSwatch, TextCell, Thumb } from "@/components/admin/cells";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { ResourceScreen } from "@/components/admin/ResourceScreen";

type Draft = {
  name: string;
  kind: string;
  logoUrl: string;
  hue: string;
  isActive: boolean;
  order: number;
};

export function PaymentManager({ items }: { items: PaymentMethod[] }) {
  return (
    <ResourceScreen<PaymentMethod, Draft>
      endpoint="/api/payments"
      items={items}
      singular="Payment method"
      addLabel="Add method"
      dialogSize="sm"
      emptyHint="Methods scroll through the marquee in the Payment section."
      columns={[
        { header: "Logo", cell: (row) => <Thumb src={row.logoUrl} alt={row.name} /> },
        {
          header: "Method",
          cell: (row) => <TextCell primary={row.name} secondary={row.kind} />,
        },
        { header: "Accent", cell: (row) => <HueSwatch hue={row.hue} /> },
        { header: "Status", cell: (row) => <ActiveBadge active={row.isActive} /> },
      ]}
      itemLabel={(row) => row.name}
      toDraft={(row) => ({
        name: row?.name ?? "",
        kind: row?.kind ?? "",
        logoUrl: row?.logoUrl ?? "",
        hue: row?.hue ?? "#2E7CF6",
        isActive: row?.isActive ?? true,
        order: row?.order ?? items.length,
      })}
      renderForm={(draft, patch, errors) => (
        <>
          <ImageUploader
            value={draft.logoUrl}
            onChange={(url) => patch({ logoUrl: url })}
            folder="payment"
            label="Logo (optional)"
            hint="Leave empty to show an initials tile in the accent colour."
            error={errors.logoUrl}
          />

          <Field label="Name" htmlFor="name" error={errors.name} required>
            <Input
              id="name"
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              aria-invalid={Boolean(errors.name)}
            />
          </Field>

          <Field label="Category" htmlFor="kind" error={errors.kind} hint="Shown under the name, e.g. E-wallet or Transfer.">
            <Input
              id="kind"
              value={draft.kind}
              onChange={(e) => patch({ kind: e.target.value })}
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
            label="Accept this method"
            checked={draft.isActive}
            onCheckedChange={(value) => patch({ isActive: value })}
          />
        </>
      )}
    />
  );
}
