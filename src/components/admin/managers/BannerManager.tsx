"use client";

import { useState } from "react";
import Image from "next/image";
import { Expand, ImageOff, Smartphone } from "lucide-react";

import type { HeroBanner } from "@/lib/models";
import { isVector } from "@/lib/media/url";
import { Field, Input } from "@/components/ui/field";
import { SwitchRow } from "@/components/ui/switch";
import { ActiveBadge } from "@/components/admin/cells";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { ImagePreview, formatBytes } from "@/components/admin/ImagePreview";
import { ResourceScreen } from "@/components/admin/ResourceScreen";
import { SITE_TIME_ZONE } from "@/lib/utils";

/**
 * A banner is a picture and where it points. Nothing else.
 *
 * The headline, chips and buttons this form used to collect are part of the
 * artwork a designer exports, so asking an admin to retype them into the CMS
 * only created two versions of the same message that could disagree.
 */

/** Dimensions and filename come from the stored upload, joined on the server. */
export type BannerAsset = {
  originalFilename: string;
  width: number;
  height: number;
  bytes: number;
};

export type AdminBanner = HeroBanner & { asset: BannerAsset | null };

type Draft = {
  imageUrl: string;
  mobileImageUrl: string;
  imageAlt: string;
  destinationUrl: string;
  isActive: boolean;
  order: number;
};

/** Last path segment, which is the SEO filename for a Cloudinary upload. */
function filenameOf(url: string) {
  if (!url) return "—";
  return decodeURIComponent(url.split("?")[0].split("/").pop() || url);
}

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: SITE_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function BannerManager({ items }: { items: AdminBanner[] }) {
  const [preview, setPreview] = useState<AdminBanner | null>(null);

  return (
    <>
      <ResourceScreen<AdminBanner, Draft>
        endpoint="/api/banners"
        items={items}
        singular="Banner"
        emptyHint="The hero slider needs at least one banner to appear."
        columns={[
          {
            header: "Preview",
            cell: (row) => (
              <button
                type="button"
                onClick={() => setPreview(row)}
                aria-label={`Preview ${row.imageAlt || filenameOf(row.imageUrl)}`}
                className="group relative block h-11 w-20 shrink-0 cursor-zoom-in overflow-hidden rounded-lg border border-white/10 bg-ink-800/60"
              >
                {row.imageUrl ? (
                  <>
                    <Image
                      src={row.imageUrl}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                      unoptimized={isVector(row.imageUrl)}
                    />
                    <span
                      aria-hidden
                      className="absolute inset-0 grid place-items-center bg-ink/70 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Expand className="size-3.5 text-foam" />
                    </span>
                  </>
                ) : (
                  <span className="grid h-full place-items-center text-fog">
                    <ImageOff className="size-4" aria-hidden />
                  </span>
                )}
              </button>
            ),
          },
          {
            header: "File",
            cell: (row) => (
              <span className="block max-w-56">
                <span className="block truncate font-mono text-[.7rem] text-foam">
                  {row.asset?.originalFilename || filenameOf(row.imageUrl)}
                </span>
                <span className="mt-0.5 flex items-center gap-2 text-[.65rem] text-fog">
                  {row.asset ? formatBytes(row.asset.bytes) : "legacy upload"}
                  {row.mobileImageUrl ? (
                    <span
                      title="Has a mobile crop"
                      className="inline-flex items-center gap-1 text-volt-300"
                    >
                      <Smartphone className="size-3" aria-hidden />
                      mobile
                    </span>
                  ) : null}
                </span>
              </span>
            ),
          },
          {
            header: "Size",
            cell: (row) => (
              <span className="font-mono text-[.68rem] text-mist">
                {row.asset?.width ? `${row.asset.width}×${row.asset.height}` : "—"}
              </span>
            ),
          },
          {
            header: "Links to",
            cell: (row) => (
              <span className="block max-w-44 truncate font-mono text-[.68rem] text-mist">
                {row.destinationUrl || "—"}
              </span>
            ),
          },
          { header: "Status", cell: (row) => <ActiveBadge active={row.isActive} /> },
          {
            header: "Order",
            cell: (row) => (
              <span className="font-mono text-xs text-fog">{row.order + 1}</span>
            ),
          },
          {
            header: "Added",
            cell: (row) => (
              <span className="font-mono text-[.66rem] whitespace-nowrap text-fog">
                {dateFormat.format(row.createdAt)}
              </span>
            ),
          },
        ]}
        itemLabel={(row) => row.imageAlt || filenameOf(row.imageUrl)}
        toDraft={(row) => ({
          imageUrl: row?.imageUrl ?? "",
          mobileImageUrl: row?.mobileImageUrl ?? "",
          imageAlt: row?.imageAlt ?? "",
          destinationUrl: row?.destinationUrl ?? "",
          isActive: row?.isActive ?? true,
          order: row?.order ?? items.length,
        })}
        renderForm={(draft, patch, errors) => (
          <>
            <ImageUploader
              value={draft.imageUrl}
              onChange={(url) => patch({ imageUrl: url })}
              folder="banner"
              label="Banner image"
              aspect="wide"
              hint="The whole slide as it should appear — around 1920×800 works well."
              error={errors.imageUrl}
              alt={draft.imageAlt}
              onAltChange={(imageAlt) => patch({ imageAlt })}
              altError={errors.imageAlt}
              required
            />

            <ImageUploader
              value={draft.mobileImageUrl}
              onChange={(url) => patch({ mobileImageUrl: url })}
              folder="banner"
              label="Mobile banner (optional)"
              hint="A taller crop for phones. Leave empty to use the main image everywhere."
              error={errors.mobileImageUrl}
            />

            <Field
              label="Destination URL (optional)"
              htmlFor="destinationUrl"
              error={errors.destinationUrl}
              hint="Where the slide goes when clicked — https://…, /path or #section. Leave empty and the banner is not clickable."
            >
              <Input
                id="destinationUrl"
                value={draft.destinationUrl}
                onChange={(event) => patch({ destinationUrl: event.target.value })}
                placeholder="#royal-dream"
                aria-invalid={Boolean(errors.destinationUrl)}
              />
            </Field>

            <SwitchRow
              id="isActive"
              label="Show this banner"
              hint="Hidden banners stay saved but drop out of the slider."
              checked={draft.isActive}
              onCheckedChange={(value) => patch({ isActive: value })}
            />
          </>
        )}
      />

      <ImagePreview
        open={preview !== null}
        onOpenChange={(open) => !open && setPreview(null)}
        src={preview?.imageUrl ?? ""}
        alt={preview?.imageAlt}
        caption={
          preview
            ? preview.asset?.originalFilename || filenameOf(preview.imageUrl)
            : undefined
        }
      />
    </>
  );
}
