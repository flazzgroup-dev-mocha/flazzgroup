"use client";

import type { Game } from "@/lib/models";
import { topUpPath } from "@/lib/games";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SwitchRow } from "@/components/ui/switch";
import { ActiveBadge, TextCell, Thumb } from "@/components/admin/cells";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { ResourceScreen } from "@/components/admin/ResourceScreen";
import { Badge } from "@/components/ui/surface";

type Draft = {
  name: string;
  slug: string;
  imageUrl: string;
  description: string;
  about: string;
  articleCategorySlug: string;
  topUpEnabled: boolean;
  isActive: boolean;
  order: number;
};

/**
 * Lowercase, hyphenated, no punctuation — the same shape the slug rule on the
 * server accepts, applied as you type so the field cannot reach a state the
 * API will refuse.
 */
function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Games, and the page each one gets.
 *
 * There is no destination field any more. A game's page is its slug under
 * `/top-up`, decided by the application, and what that page *contains* is the
 * one switch below — which is the difference between a catalogue this site can
 * honour and a link an operator typed by hand. The rows this replaces proved
 * why: three of four pointed at blog categories that had never been created.
 */
export function GameManager({ items }: { items: Game[] }) {
  return (
    <ResourceScreen<Game, Draft>
      endpoint="/api/games"
      items={items}
      singular="Game"
      dialogSize="lg"
      emptyHint="Games are the first thing a visitor picks on the homepage."
      columns={[
        {
          header: "Image",
          cell: (row) => (
            <Thumb src={row.imageUrl} alt={row.name} rounded="rounded-xl" />
          ),
        },
        {
          header: "Game",
          cell: (row) => <TextCell primary={row.name} secondary={row.slug} />,
        },
        {
          header: "Page",
          cell: (row) => (
            <span className="block max-w-xs">
              <span className="block truncate font-mono text-[.68rem] text-fog">
                {topUpPath(row.slug)}
              </span>
              <span className="mt-1 block">
                {row.topUpEnabled ? (
                  <Badge tone="gold">Top up aktif</Badge>
                ) : (
                  <Badge>Informasi</Badge>
                )}
              </span>
            </span>
          ),
        },
        { header: "Status", cell: (row) => <ActiveBadge active={row.isActive} /> },
      ]}
      itemLabel={(row) => row.name}
      toDraft={(row) => ({
        name: row?.name ?? "",
        slug: row?.slug ?? "",
        imageUrl: row?.imageUrl ?? "",
        description: row?.description ?? "",
        about: row?.about ?? "",
        articleCategorySlug: row?.articleCategorySlug ?? "",
        topUpEnabled: row?.topUpEnabled ?? false,
        isActive: row?.isActive ?? true,
        order: row?.order ?? items.length,
      })}
      renderForm={(draft, patch, errors) => (
        <>
          <ImageUploader
            value={draft.imageUrl}
            onChange={(url) => patch({ imageUrl: url })}
            folder="game"
            label="Game artwork"
            aspect="square"
            hint="Square art — 512 × 512 or larger. The card crops to 1:1, so anything taller than it is wide loses its top and bottom."
            error={errors.imageUrl}
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Game name" htmlFor="name" error={errors.name} required>
              <Input
                id="name"
                value={draft.name}
                onChange={(e) => {
                  const name = e.target.value;
                  /**
                   * The slug follows the name only while nobody has typed one
                   * by hand. An existing slug is a public URL and a corrected
                   * title must not silently move the page.
                   */
                  patch(
                    draft.slug === "" || draft.slug === toSlug(draft.name)
                      ? { name, slug: toSlug(name) }
                      : { name }
                  );
                }}
                aria-invalid={Boolean(errors.name)}
              />
            </Field>

            <Field
              label="Slug"
              htmlFor="slug"
              error={errors.slug}
              required
              hint={`This game's page: ${topUpPath(draft.slug || "…")}`}
            >
              <Input
                id="slug"
                value={draft.slug}
                onChange={(e) => patch({ slug: toSlug(e.target.value) })}
                className="font-mono"
                aria-invalid={Boolean(errors.slug)}
              />
            </Field>
          </div>

          <Field
            label="Short description"
            htmlFor="description"
            error={errors.description}
            hint="One line under the title on the card. The card has no room for a paragraph."
          >
            <Textarea
              id="description"
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </Field>

          <Field
            label="About this game"
            htmlFor="about"
            error={errors.about}
            hint="The body of the game's page. Leave a blank line between paragraphs. Games with no top-up need this: without it the page is set to noindex and left out of the sitemap, because a page with only a name and a picture is not worth indexing."
          >
            <Textarea
              id="about"
              rows={8}
              value={draft.about}
              onChange={(e) => patch({ about: e.target.value })}
            />
          </Field>

          <Field
            label="Blog category slug"
            htmlFor="articleCategorySlug"
            error={errors.articleCategorySlug}
            hint="Optional. The slug from Blog Taxonomy, e.g. panduan-top-up. The game's page links to those articles — and shows nothing at all if the category has no published posts, so a slug that names nothing costs a reader nothing."
          >
            <Input
              id="articleCategorySlug"
              value={draft.articleCategorySlug}
              onChange={(e) => patch({ articleCategorySlug: toSlug(e.target.value) })}
              className="font-mono"
              placeholder="panduan-top-up"
              aria-invalid={Boolean(errors.articleCategorySlug)}
            />
          </Field>

          <SwitchRow
            id="topUpEnabled"
            label="Top up enabled"
            hint="On: this game's page shows the Products catalogue and takes orders. Off: it is an information page that says ordering is not open yet. Only one game can have this on — the Products list is one site-wide catalogue, so switching it on here switches it off everywhere else."
            checked={draft.topUpEnabled}
            onCheckedChange={(value) => patch({ topUpEnabled: value })}
          />

          <SwitchRow
            id="isActive"
            label="Show on homepage"
            hint="Turn off to take the card out of the picker. The page keeps answering — a URL that has been in an ad must not start 404ing — but it stops being indexed."
            checked={draft.isActive}
            onCheckedChange={(value) => patch({ isActive: value })}
          />
        </>
      )}
    />
  );
}
