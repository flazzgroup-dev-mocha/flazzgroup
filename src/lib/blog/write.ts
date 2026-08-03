import "server-only";

import { revalidateTag } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { CACHE_TAGS } from "@/lib/cache";
import {
  deriveExcerpt,
  htmlToText,
  readingMinutes,
  sanitizeArticleHtml,
} from "@/lib/blog/content";
import type { blogPostSchema } from "@/lib/validators";

type PostInput = z.output<typeof blogPostSchema>;

/**
 * Turns validated form input into the row we actually store.
 *
 * Three things are derived here rather than trusted from the client:
 * the sanitised HTML, its plain-text mirror (which feeds search and reading
 * time), and the publish timestamp.
 */
function toRow(input: PostInput) {
  const content = sanitizeArticleHtml(input.content);
  const contentText = htmlToText(content);

  return {
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt || deriveExcerpt(contentText),
    content,
    contentText,
    featuredImage: input.featuredImage,
    featuredImageAlt: input.featuredImageAlt,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    focusKeyword: input.focusKeyword,
    canonicalUrl: input.canonicalUrl,
    noIndex: input.noIndex,
    status: input.status,
    readingMinutes: readingMinutes(contentText),
    authorId: input.authorId,
    categoryId: input.categoryId,
  };
}

/**
 * A published post always ends up with a date. An explicit one is honoured —
 * that is how scheduling works — otherwise publishing stamps "now". Moving a
 * post back to draft keeps the date, so re-publishing does not lose it.
 */
function resolvePublishedAt(input: PostInput, existing?: Date | null) {
  if (input.publishedAt) return input.publishedAt;
  if (input.status === "PUBLISHED") return existing ?? new Date();
  return existing ?? null;
}

export function revalidateBlog() {
  revalidateTag(CACHE_TAGS.blog);
  revalidateTag(CACHE_TAGS.blogTaxonomy);
}

export async function createPost(input: PostInput) {
  const post = await prisma.blogPost.create({
    data: {
      ...toRow(input),
      publishedAt: resolvePublishedAt(input),
      tags: { connect: input.tagIds.map((id) => ({ id })) },
    },
    select: { id: true, title: true, slug: true, updatedAt: true },
  });

  revalidateBlog();
  return post;
}

export async function updatePost(
  id: string,
  input: PostInput,
  /**
   * Optimistic concurrency. Spread into the `where` clause so the version check
   * and the write are one statement — checking separately would leave a gap
   * between them, which is the race it exists to close. No match raises P2025,
   * which the route turns into 409.
   */
  guard?: { updatedAt: Date }
) {
  const existing = await prisma.blogPost.findUnique({
    where: { id },
    select: { publishedAt: true, slug: true },
  });

  const post = await prisma.blogPost.update({
    where: { id, ...guard },
    data: {
      ...toRow(input),
      publishedAt: resolvePublishedAt(input, existing?.publishedAt),
      // `set` rather than `connect` so removing a tag actually removes it.
      tags: { set: input.tagIds.map((tagId) => ({ id: tagId })) },
    },
    select: { id: true, title: true, slug: true, updatedAt: true },
  });

  revalidateBlog();
  return post;
}

export async function deletePost(id: string) {
  const post = await prisma.blogPost.delete({
    where: { id },
    select: { id: true, title: true, featuredImage: true },
  });

  revalidateBlog();
  return post;
}
