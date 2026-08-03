"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowLeft, ExternalLink, LoaderCircle, Save, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { ApiError, apiRequest } from "@/lib/client-api";
import { slugify } from "@/lib/blog/slug";
import type { FieldErrors } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/field";
import { SwitchRow } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/surface";
import { ImageUploader } from "@/components/admin/ImageUploader";

// Tiptap is ~100 kB and only ever runs here, so it is split out of the shell.
const RichTextEditor = dynamic(
  () => import("@/components/admin/editor/RichTextEditor").then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="glass grid min-h-[32rem] place-items-center rounded-2xl text-sm text-mist">
        Loading editor…
      </div>
    ),
  }
);

export type PostDraft = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  featuredImageAlt: string;
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  canonicalUrl: string;
  noIndex: boolean;
  status: "DRAFT" | "PUBLISHED";
  /** ISO 8601 instant, or "" for "not dated yet". Never a wall-clock string. */
  publishedAt: string;
  authorId: string;
  categoryId: string;
  tagIds: string[];
};

/**
 * `input[type=datetime-local]` speaks wall-clock time in whichever timezone the
 * machine rendering it is set to; the draft, the API and the database all speak
 * UTC instants. These two functions are the only place the two meet.
 *
 * Both depend on `getTimezoneOffset()`, which answers for the machine that runs
 * them — UTC on a server, WIB on an editor's laptop. Running them on
 * the server would therefore be wrong twice over: the rendered value would not
 * match what the browser produces on hydration, and every save would walk a
 * scheduled post backwards by the offset. They are client-only by construction,
 * which is why nothing here is exported.
 */
function toLocalInput(iso: string) {
  if (!iso) return "";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromLocalInput(value: string) {
  if (!value) return "";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function PostEditor({
  postId,
  initial,
  version: initialVersion,
  categories,
  tags,
  authors,
}: {
  postId?: string;
  initial: PostDraft;
  /** The article's `updatedAt` when this editor loaded. Absent for a new post. */
  version?: string | Date;
  categories: { id: string; name: string }[];
  tags: { id: string; name: string }[];
  authors: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<PostDraft>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));

  /**
   * Optimistic-concurrency stamp, kept in state and refreshed from each save.
   *
   * An article editor is open for a long time, which is exactly why it needs
   * this — and why the stamp has to advance after every save rather than being
   * read once from props, or the second save of a session would be rejected as
   * stale against its own first save.
   */
  const [version, setVersion] = useState<string | Date | undefined>(initialVersion);

  // The publish field renders empty until mount, so the server HTML and the
  // first client render agree; the browser's timezone only exists after that.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const patch = (values: Partial<PostDraft>) =>
    setDraft((current) => ({ ...current, ...values }));

  const scheduled = useMemo(() => {
    if (draft.status !== "PUBLISHED" || !draft.publishedAt) return false;
    return new Date(draft.publishedAt).getTime() > Date.now();
  }, [draft.status, draft.publishedAt]);

  function onTitleChange(title: string) {
    // The slug follows the title until an author edits it by hand — after
    // that it is frozen, because changing a live slug breaks its URL.
    patch(slugTouched ? { title } : { title, slug: slugify(title) });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setErrors({});

    // `draft.publishedAt` is already an ISO instant — see toLocalInput.
    const body = {
      ...draft,
      publishedAt: draft.publishedAt || null,
      ...(postId ? { updatedAt: version } : {}),
    };

    try {
      const saved = await apiRequest<{
        id: string;
        slug: string;
        updatedAt: string;
      }>(postId ? `/api/blog/posts/${postId}` : "/api/blog/posts", {
        method: postId ? "PUT" : "POST",
        body,
      });

      setVersion(saved.updatedAt);
      toast.success(postId ? "Article saved" : "Article created");

      if (!postId) router.replace(`/admin/blog/${saved.id}`);
      else router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fields);
        toast.error(error.message);
        // The draft stays on screen: a 409 must never cost someone their writing.
        if (error.status === 409) router.refresh();
      } else {
        toast.error("Could not save the article.");
      }
    } finally {
      setSaving(false);
    }
  }

  const seoTitlePreview = draft.seoTitle || draft.title;
  const seoDescPreview = draft.seoDescription || draft.excerpt;

  return (
    <form onSubmit={save} noValidate className="grid gap-4 pb-28">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/blog">
            <ArrowLeft aria-hidden />
            All articles
          </Link>
        </Button>

        {postId && draft.status === "PUBLISHED" && !scheduled ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/blog/${draft.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden />
              View live
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        {/* ---------------------------------------------------- main column */}
        <div className="grid min-w-0 gap-4">
          <Card>
            <CardContent className="grid gap-4">
              <Field label="Title" htmlFor="title" error={errors.title} required>
                <Input
                  id="title"
                  value={draft.title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  placeholder="Cara Top Up Royal Dream Pakai QRIS"
                  aria-invalid={Boolean(errors.title)}
                  className="text-lg font-semibold"
                />
              </Field>

              <Field
                label="Slug"
                htmlFor="slug"
                error={errors.slug}
                required
                hint={`Public URL: /blog/${draft.slug || "…"}`}
              >
                <div className="flex items-center gap-2">
                  <Input
                    id="slug"
                    value={draft.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      patch({ slug: e.target.value });
                    }}
                    className="font-mono text-sm"
                    aria-invalid={Boolean(errors.slug)}
                  />
                  <Button
                    type="button"
                    variant="glass"
                    size="sm"
                    onClick={() => patch({ slug: slugify(draft.title) })}
                    title="Regenerate from title"
                  >
                    <Wand2 aria-hidden />
                  </Button>
                </div>
              </Field>

              <Field
                label="Excerpt"
                htmlFor="excerpt"
                error={errors.excerpt}
                hint="Shown on cards and used as the meta description fallback. Leave empty to derive it from the body."
              >
                <Textarea
                  id="excerpt"
                  value={draft.excerpt}
                  onChange={(e) => patch({ excerpt: e.target.value })}
                  className="min-h-20"
                />
              </Field>
            </CardContent>
          </Card>

          <div className="grid gap-1.5">
            <span className="text-xs font-semibold tracking-wide text-mist">
              Content
            </span>
            <RichTextEditor
              value={draft.content}
              onChange={(content) => patch({ content })}
            />
            {errors.content ? (
              <p role="alert" className="text-xs font-medium text-red-400">
                {errors.content}
              </p>
            ) : null}
          </div>

          {/* ------------------------------------------------------- SEO */}
          <Card>
            <CardHeader>
              <CardTitle>Search engine listing</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {/* A live preview keeps titles inside the length Google shows. */}
              <div className="rounded-xl border border-white/8 bg-white/[.02] p-4">
                <p className="truncate text-[.7rem] text-online">
                  flazzgroup.com › blog › {draft.slug || "…"}
                </p>
                <p className="mt-1 truncate text-base text-volt-300">
                  {seoTitlePreview || "Judul artikel"}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-mist">
                  {seoDescPreview || "Deskripsi singkat artikel akan muncul di sini."}
                </p>
              </div>

              <Field
                label="SEO title"
                htmlFor="seoTitle"
                error={errors.seoTitle}
                hint={`${seoTitlePreview.length} characters — around 60 is the safe limit.`}
              >
                <Input
                  id="seoTitle"
                  value={draft.seoTitle}
                  onChange={(e) => patch({ seoTitle: e.target.value })}
                  placeholder={draft.title}
                />
              </Field>

              <Field
                label="Meta description"
                htmlFor="seoDescription"
                error={errors.seoDescription}
                hint={`${seoDescPreview.length} characters — around 155 reads best.`}
              >
                <Textarea
                  id="seoDescription"
                  value={draft.seoDescription}
                  onChange={(e) => patch({ seoDescription: e.target.value })}
                  className="min-h-20"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Focus keyword"
                  htmlFor="focusKeyword"
                  error={errors.focusKeyword}
                  hint="The phrase this article should rank for."
                >
                  <Input
                    id="focusKeyword"
                    value={draft.focusKeyword}
                    onChange={(e) => patch({ focusKeyword: e.target.value })}
                  />
                </Field>

                <Field
                  label="Canonical URL"
                  htmlFor="canonicalUrl"
                  error={errors.canonicalUrl}
                  hint="Only if this content lives elsewhere first."
                >
                  <Input
                    id="canonicalUrl"
                    value={draft.canonicalUrl}
                    onChange={(e) => patch({ canonicalUrl: e.target.value })}
                  />
                </Field>
              </div>

              <SwitchRow
                id="noIndex"
                label="Hide from search engines"
                hint="Adds noindex and keeps the article out of the sitemap."
                checked={draft.noIndex}
                onCheckedChange={(value) => patch({ noIndex: value })}
              />
            </CardContent>
          </Card>
        </div>

        {/* ------------------------------------------------------- sidebar */}
        <div className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Publishing</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Field label="Status" htmlFor="status" error={errors.status}>
                <NativeSelect
                  id="status"
                  value={draft.status}
                  onChange={(e) =>
                    patch({ status: e.target.value as PostDraft["status"] })
                  }
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </NativeSelect>
              </Field>

              <Field
                label="Publish date"
                htmlFor="publishedAt"
                error={errors.publishedAt}
                hint={
                  scheduled
                    ? "In the future — the article goes live automatically at this time."
                    : "Leave empty to stamp the moment you publish."
                }
              >
                <Input
                  id="publishedAt"
                  type="datetime-local"
                  value={mounted ? toLocalInput(draft.publishedAt) : ""}
                  onChange={(e) =>
                    patch({ publishedAt: fromLocalInput(e.target.value) })
                  }
                />
              </Field>

              {scheduled ? (
                <p className="rounded-xl border border-gold/30 bg-gold/8 px-3.5 py-2.5 text-xs text-gold">
                  Scheduled. It stays hidden from the blog, sitemap and RSS until
                  that time.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Featured image</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {/* Alt text is part of the uploader rather than a field of its
                  own, so a picture and its description are always added
                  together — the same control the banner and author forms use. */}
              <ImageUploader
                value={draft.featuredImage}
                onChange={(url) => patch({ featuredImage: url })}
                folder="blog"
                label="Image"
                aspect="wide"
                hint="Used on cards and as the social share image."
                error={errors.featuredImage}
                alt={draft.featuredImageAlt}
                onAltChange={(featuredImageAlt) => patch({ featuredImageAlt })}
                altError={errors.featuredImageAlt}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organisation</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Field label="Category" htmlFor="categoryId" error={errors.categoryId}>
                <NativeSelect
                  id="categoryId"
                  value={draft.categoryId}
                  onChange={(e) => patch({ categoryId: e.target.value })}
                >
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field label="Author" htmlFor="authorId" error={errors.authorId}>
                <NativeSelect
                  id="authorId"
                  value={draft.authorId}
                  onChange={(e) => patch({ authorId: e.target.value })}
                >
                  <option value="">No author</option>
                  {authors.map((author) => (
                    <option key={author.id} value={author.id}>
                      {author.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <fieldset className="grid gap-2">
                <legend className="text-xs font-semibold tracking-wide text-mist">
                  Tags
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => {
                    const active = draft.tagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          patch({
                            tagIds: active
                              ? draft.tagIds.filter((id) => id !== tag.id)
                              : [...draft.tagIds, tag.id],
                          })
                        }
                        className={
                          active
                            ? "rounded-full border border-gold/50 bg-gold/12 px-3 py-1.5 text-xs font-semibold text-gold"
                            : "rounded-full border border-white/12 px-3 py-1.5 text-xs font-medium text-mist transition-colors hover:border-white/25 hover:text-foam"
                        }
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                  {tags.length === 0 ? (
                    <p className="text-xs text-fog">
                      No tags yet — add them under{" "}
                      <Link
                        href="/admin/blog-taxonomy"
                        className="font-semibold text-gold hover:underline"
                      >
                        Blog taxonomy
                      </Link>
                      .
                    </p>
                  ) : null}
                </div>
              </fieldset>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky save bar, matching the settings screen */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink/85 px-4 py-3 backdrop-blur-xl lg:left-68">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <p className="text-xs text-fog">
            {draft.status === "PUBLISHED"
              ? scheduled
                ? "Will publish automatically."
                : "Live on the blog once saved."
              : "Draft — invisible to visitors and search engines."}
          </p>
          <Button type="submit" variant="gold" size="md" disabled={saving}>
            {saving ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <Save aria-hidden />
            )}
            {saving ? "Saving…" : "Save article"}
          </Button>
        </div>
      </div>
    </form>
  );
}
