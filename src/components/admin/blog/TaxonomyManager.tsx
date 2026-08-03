"use client";

import { useState } from "react";

import { slugify } from "@/lib/blog/slug";
import type { Author, BlogCategory, BlogTag } from "@/lib/models";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Card } from "@/components/ui/surface";
import { TextCell, Thumb } from "@/components/admin/cells";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { ResourceScreen } from "@/components/admin/ResourceScreen";
import { cn } from "@/lib/utils";

/**
 * Categories, tags and authors — the three lists an article is filed under.
 *
 * All three already had REST endpoints and unique-slug constraints; what was
 * missing was any way to reach them. The post editor even pointed at "Blog
 * taxonomy" for adding tags, which was a screen that did not exist, so after
 * the seed nothing here could be changed without going to the database.
 *
 * One page with three tabs rather than three routes: these lists are short,
 * they are edited together, and it keeps the sidebar from growing a section
 * per lookup table.
 */

type Tab = "categories" | "tags" | "authors";

const TABS: { key: Tab; label: string }[] = [
  { key: "categories", label: "Categories" },
  { key: "tags", label: "Tags" },
  { key: "authors", label: "Authors" },
];

/**
 * A slug follows its name until someone edits it by hand. Freezing it after
 * that matters more here than in the post editor: a category slug is a public
 * URL (`/blog?kategori=…`) that the sitemap has already advertised.
 */
function useNamedSlug<D extends { name: string; slug: string }>(
  patch: (values: Partial<D>) => void,
  initialSlug: string
) {
  // Seeded at mount: a row that arrives with a slug already has a live URL, so
  // renaming it must not silently rewrite that. The dialog unmounts between
  // rows, so this is re-seeded for each one.
  const [touched, setTouched] = useState(Boolean(initialSlug));

  return {
    onName: (name: string) =>
      patch((touched ? { name } : { name, slug: slugify(name) }) as Partial<D>),
    onSlug: (slug: string) => {
      setTouched(true);
      patch({ slug } as Partial<D>);
    },
  };
}

function SlugFields<D extends { name: string; slug: string }>({
  draft,
  patch,
  errors,
  nameLabel,
  hint,
}: {
  draft: D;
  patch: (values: Partial<D>) => void;
  errors: Record<string, string>;
  nameLabel: string;
  hint: string;
}) {
  const slug = useNamedSlug<D>(patch, draft.slug);

  return (
    <>
      <Field label={nameLabel} htmlFor="name" error={errors.name} required>
        <Input
          id="name"
          value={draft.name}
          onChange={(event) => slug.onName(event.target.value)}
          aria-invalid={Boolean(errors.name)}
        />
      </Field>

      <Field label="Slug" htmlFor="slug" error={errors.slug} required hint={hint}>
        <Input
          id="slug"
          value={draft.slug}
          onChange={(event) => slug.onSlug(event.target.value)}
          className="font-mono text-sm"
          aria-invalid={Boolean(errors.slug)}
        />
      </Field>
    </>
  );
}

type CategoryDraft = {
  name: string;
  slug: string;
  description: string;
  order: number;
};

type TagDraft = { name: string; slug: string };

type AuthorDraft = {
  name: string;
  slug: string;
  avatarUrl: string;
  bio: string;
  websiteUrl: string;
};

export function TaxonomyManager({
  categories,
  tags,
  authors,
}: {
  categories: (BlogCategory & { _count: { posts: number } })[];
  tags: (BlogTag & { _count: { posts: number } })[];
  authors: (Author & { _count: { posts: number } })[];
}) {
  const [tab, setTab] = useState<Tab>("categories");

  const counts: Record<Tab, number> = {
    categories: categories.length,
    tags: tags.length,
    authors: authors.length,
  };

  return (
    <>
      <Card className="mb-4 p-1.5">
        <div role="tablist" aria-label="Taxonomy" className="flex flex-wrap gap-1">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              onClick={() => setTab(item.key)}
              className={cn(
                "inline-flex min-h-9 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors",
                tab === item.key
                  ? "bg-gold/12 text-gold"
                  : "text-mist hover:bg-white/[.05] hover:text-foam"
              )}
            >
              {item.label}
              <span className="font-mono text-[.62rem] opacity-70">
                {counts[item.key]}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {tab === "categories" ? (
        <ResourceScreen<(typeof categories)[number], CategoryDraft>
          endpoint="/api/blog/categories"
          items={categories}
          singular="Category"
          emptyHint="Categories group articles and become an indexed archive at /blog?kategori=…"
          columns={[
            {
              header: "Category",
              cell: (row) => <TextCell primary={row.name} secondary={`/${row.slug}`} />,
            },
            {
              header: "Description",
              cell: (row) => (
                <span className="block max-w-md truncate text-xs text-fog">
                  {row.description || "—"}
                </span>
              ),
            },
            {
              header: "Articles",
              cell: (row) => (
                <span className="font-mono text-xs text-mist">{row._count.posts}</span>
              ),
            },
          ]}
          itemLabel={(row) => row.name}
          toDraft={(row) => ({
            name: row?.name ?? "",
            slug: row?.slug ?? "",
            description: row?.description ?? "",
            order: row?.order ?? categories.length,
          })}
          renderForm={(draft, patch, errors) => (
            <>
              <SlugFields
                draft={draft}
                patch={patch}
                errors={errors}
                nameLabel="Name"
                hint={`Public URL: /blog?kategori=${draft.slug || "…"}`}
              />

              <Field
                label="Description"
                htmlFor="description"
                error={errors.description}
                hint="Shown at the top of the archive and used as its meta description."
              >
                <Textarea
                  id="description"
                  value={draft.description}
                  onChange={(event) => patch({ description: event.target.value })}
                  className="min-h-20"
                />
              </Field>
            </>
          )}
        />
      ) : null}

      {tab === "tags" ? (
        <ResourceScreen<(typeof tags)[number], TagDraft>
          endpoint="/api/blog/tags"
          items={tags}
          singular="Tag"
          // No /api/blog/tags/reorder endpoint — tags render alphabetically.
          sortable={false}
          emptyHint="Tags appear at the foot of an article and in its structured data."
          columns={[
            {
              header: "Tag",
              cell: (row) => <TextCell primary={row.name} secondary={`/${row.slug}`} />,
            },
            {
              header: "Articles",
              cell: (row) => (
                <span className="font-mono text-xs text-mist">{row._count.posts}</span>
              ),
            },
          ]}
          itemLabel={(row) => row.name}
          toDraft={(row) => ({ name: row?.name ?? "", slug: row?.slug ?? "" })}
          dialogSize="sm"
          renderForm={(draft, patch, errors) => (
            <SlugFields
              draft={draft}
              patch={patch}
              errors={errors}
              nameLabel="Name"
              hint="Lowercase letters, numbers and hyphens."
            />
          )}
        />
      ) : null}

      {tab === "authors" ? (
        <ResourceScreen<(typeof authors)[number], AuthorDraft>
          endpoint="/api/blog/authors"
          items={authors}
          singular="Author"
          sortable={false}
          emptyHint="An author byline feeds the Person schema and the E-E-A-T signals on every article."
          columns={[
            {
              header: "Author",
              cell: (row) => (
                <div className="flex items-center gap-3">
                  <Thumb src={row.avatarUrl} alt="" rounded="rounded-full" />
                  <TextCell primary={row.name} secondary={`/${row.slug}`} />
                </div>
              ),
            },
            {
              header: "Bio",
              cell: (row) => (
                <span className="block max-w-md truncate text-xs text-fog">
                  {row.bio || "—"}
                </span>
              ),
            },
            {
              header: "Articles",
              cell: (row) => (
                <span className="font-mono text-xs text-mist">{row._count.posts}</span>
              ),
            },
          ]}
          itemLabel={(row) => row.name}
          toDraft={(row) => ({
            name: row?.name ?? "",
            slug: row?.slug ?? "",
            avatarUrl: row?.avatarUrl ?? "",
            bio: row?.bio ?? "",
            websiteUrl: row?.websiteUrl ?? "",
          })}
          renderForm={(draft, patch, errors) => (
            <>
              <SlugFields
                draft={draft}
                patch={patch}
                errors={errors}
                nameLabel="Name"
                hint="Identifies the author in structured data."
              />

              <ImageUploader
                value={draft.avatarUrl}
                onChange={(url) => patch({ avatarUrl: url })}
                folder="blog"
                label="Avatar"
                hint="Square. Shown on article bylines and cards."
                error={errors.avatarUrl}
              />

              <Field
                label="Bio"
                htmlFor="bio"
                error={errors.bio}
                hint="One or two sentences on why this person is worth reading."
              >
                <Textarea
                  id="bio"
                  value={draft.bio}
                  onChange={(event) => patch({ bio: event.target.value })}
                  className="min-h-24"
                />
              </Field>

              <Field
                label="Website"
                htmlFor="websiteUrl"
                error={errors.websiteUrl}
                hint="Optional public profile, used as the Person schema's sameAs."
              >
                <Input
                  id="websiteUrl"
                  value={draft.websiteUrl}
                  onChange={(event) => patch({ websiteUrl: event.target.value })}
                />
              </Field>
            </>
          )}
        />
      ) : null}
    </>
  );
}
