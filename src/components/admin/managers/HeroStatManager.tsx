"use client";

import type { HeroStat } from "@/lib/models";
import { Field, Input } from "@/components/ui/field";
import { SwitchRow } from "@/components/ui/switch";
import { ActiveBadge } from "@/components/admin/cells";
import { ResourceScreen } from "@/components/admin/ResourceScreen";

type Draft = {
  value: string;
  label: string;
  isActive: boolean;
  order: number;
};

export function HeroStatManager({ items }: { items: HeroStat[] }) {
  return (
    <ResourceScreen<HeroStat, Draft>
      endpoint="/api/hero-stats"
      items={items}
      singular="Stat"
      addLabel="Add stat"
      dialogSize="sm"
      emptyHint="Stats sit in the proof strip directly under the hero slider."
      columns={[
        {
          header: "Value",
          cell: (row) => (
            <span className="font-mono text-sm font-bold text-gold">
              {row.value}
            </span>
          ),
        },
        {
          header: "Label",
          cell: (row) => <span className="text-sm text-foam">{row.label}</span>,
        },
        { header: "Status", cell: (row) => <ActiveBadge active={row.isActive} /> },
      ]}
      itemLabel={(row) => row.label}
      toDraft={(row) => ({
        value: row?.value ?? "",
        label: row?.label ?? "",
        isActive: row?.isActive ?? true,
        order: row?.order ?? items.length,
      })}
      renderForm={(draft, patch, errors) => (
        <>
          <Field label="Value" htmlFor="value" error={errors.value} required hint="The big number, e.g. 128K+ or < 30 dtk.">
            <Input
              id="value"
              value={draft.value}
              onChange={(e) => patch({ value: e.target.value })}
              aria-invalid={Boolean(errors.value)}
            />
          </Field>

          <Field label="Label" htmlFor="label" error={errors.label} required>
            <Input
              id="label"
              value={draft.label}
              onChange={(e) => patch({ label: e.target.value })}
              aria-invalid={Boolean(errors.label)}
            />
          </Field>

          <SwitchRow
            id="isActive"
            label="Show this stat"
            checked={draft.isActive}
            onCheckedChange={(value) => patch({ isActive: value })}
          />
        </>
      )}
    />
  );
}
