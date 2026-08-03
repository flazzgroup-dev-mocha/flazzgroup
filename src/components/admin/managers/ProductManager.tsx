"use client";

import type { Product } from "@/lib/models";
import { cn, rupiah } from "@/lib/utils";
import { Field, Input, NativeSelect } from "@/components/ui/field";
import { SwitchRow } from "@/components/ui/switch";
import { ActiveBadge, TextCell, Thumb } from "@/components/admin/cells";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { ResourceScreen } from "@/components/admin/ResourceScreen";

type Draft = {
  title: string;
  unit: string;
  description: string;
  price: number;
  strikePrice: number | "";
  badge: string;
  badgeColor: "DEFAULT" | "GOLD";
  tier: "COIN" | "SERVICE";
  imageUrl: string;
  buttonLink: string;
  isActive: boolean;
  order: number;
};

export function ProductManager({ items }: { items: Product[] }) {
  return (
    <ResourceScreen<Product, Draft>
      endpoint="/api/products"
      items={items}
      singular="Product"
      emptyHint="Products fill the “Pilih nominal koin” grid."
      columns={[
        { header: "Thumbnail", cell: (row) => <Thumb src={row.imageUrl} /> },
        {
          header: "Product",
          cell: (row) => (
            <TextCell
              primary={`${row.title} ${row.unit}`.trim()}
              secondary={row.description}
            />
          ),
        },
        {
          header: "Price",
          cell: (row) => (
            <span className="font-mono text-xs text-gold">
              {rupiah(row.price)}
              {row.strikePrice ? (
                <span className="ml-2 text-fog line-through">
                  {rupiah(row.strikePrice)}
                </span>
              ) : null}
            </span>
          ),
        },
        {
          header: "Badge",
          // Shown in the colour it will actually render on the homepage, so the
          // list answers "which of these is gold?" without opening each one.
          cell: (row) =>
            row.badge ? (
              <span
                className={cn(
                  "inline-flex rounded-md px-2 py-1 font-mono text-[.58rem] font-bold tracking-[.14em] uppercase",
                  row.badgeColor === "GOLD"
                    ? "bg-gold text-ink"
                    : "bg-volt/85 text-white"
                )}
              >
                {row.badge}
              </span>
            ) : (
              <span className="text-xs text-mist">—</span>
            ),
        },
        { header: "Status", cell: (row) => <ActiveBadge active={row.isActive} /> },
      ]}
      itemLabel={(row) => `${row.title} ${row.unit}`.trim()}
      toDraft={(row) => ({
        title: row?.title ?? "",
        unit: row?.unit ?? "Koin",
        description: row?.description ?? "",
        price: row?.price ?? 0,
        strikePrice: row?.strikePrice ?? "",
        badge: row?.badge ?? "",
        badgeColor: row?.badgeColor ?? "DEFAULT",
        tier: row?.tier ?? "COIN",
        imageUrl: row?.imageUrl ?? "",
        buttonLink: row?.buttonLink ?? "/order",
        isActive: row?.isActive ?? true,
        order: row?.order ?? items.length,
      })}
      renderForm={(draft, patch, errors) => (
        <>
          <ImageUploader
            value={draft.imageUrl}
            onChange={(url) => patch({ imageUrl: url })}
            folder="banner"
            label="Thumbnail"
            error={errors.imageUrl}
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" htmlFor="title" error={errors.title} required hint="The amount, e.g. 50.000">
              <Input
                id="title"
                value={draft.title}
                onChange={(e) => patch({ title: e.target.value })}
                aria-invalid={Boolean(errors.title)}
              />
            </Field>

            <Field label="Unit" htmlFor="unit" error={errors.unit} hint="Koin, Jasa, Bundle…">
              <Input
                id="unit"
                value={draft.unit}
                onChange={(e) => patch({ unit: e.target.value })}
              />
            </Field>

            <Field label="Price (Rp)" htmlFor="price" error={errors.price} required>
              <Input
                id="price"
                type="number"
                min={0}
                step={500}
                value={draft.price}
                onChange={(e) => patch({ price: Number(e.target.value) })}
                aria-invalid={Boolean(errors.price)}
              />
            </Field>

            <Field label="Was price (Rp)" htmlFor="strikePrice" error={errors.strikePrice} hint="Optional — shown struck through.">
              <Input
                id="strikePrice"
                type="number"
                min={0}
                step={500}
                value={draft.strikePrice}
                onChange={(e) =>
                  patch({
                    strikePrice: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
              />
            </Field>
          </div>

          <Field label="Description" htmlFor="description" error={errors.description}>
            <Input
              id="description"
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Badge"
              htmlFor="badge"
              error={errors.badge}
              hint="Any wording you like — “Terlaris”, “Best Value”, “Promo”."
            >
              <Input
                id="badge"
                value={draft.badge}
                onChange={(e) => patch({ badge: e.target.value })}
              />
            </Field>

            {/* Disabled rather than hidden when there is no badge: the field
                keeps its place, so choosing a colour never makes the rest of
                the form jump. */}
            <Field
              label="Badge colour"
              htmlFor="badgeColor"
              error={errors.badgeColor}
              hint={
                draft.badge
                  ? "Gold marks the offer you want people to pick."
                  : "Add a badge above to choose its colour."
              }
            >
              <NativeSelect
                id="badgeColor"
                value={draft.badgeColor}
                disabled={!draft.badge}
                onChange={(e) =>
                  patch({ badgeColor: e.target.value as Draft["badgeColor"] })
                }
              >
                <option value="DEFAULT">Default (blue)</option>
                <option value="GOLD">Gold</option>
              </NativeSelect>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type" htmlFor="tier" error={errors.tier}>
              <NativeSelect
                id="tier"
                value={draft.tier}
                onChange={(e) => patch({ tier: e.target.value as Draft["tier"] })}
              >
                <option value="COIN">Coin top-up</option>
                <option value="SERVICE">Service / bundle</option>
              </NativeSelect>
            </Field>
          </div>

          <Field label="Buy link" htmlFor="buttonLink" error={errors.buttonLink} required>
            <Input
              id="buttonLink"
              value={draft.buttonLink}
              onChange={(e) => patch({ buttonLink: e.target.value })}
              aria-invalid={Boolean(errors.buttonLink)}
            />
          </Field>

          <SwitchRow
            id="isActive"
            label="Sell this product"
            checked={draft.isActive}
            onCheckedChange={(value) => patch({ isActive: value })}
          />
        </>
      )}
    />
  );
}
