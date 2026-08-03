import "server-only";

import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import { CACHE_TAGS } from "@/lib/cache";

/**
 * Read side of the blog.
 *
 * Every public query filters on `status = PUBLISHED AND publishedAt <= now()`,
 * so a draft or a future-dated post can never leak — including into the
 * sitemap, the RSS feed or a related-posts strip.
 */

export const POSTS_PER_PAGE = 9;

/** Columns the listing cards need. Bodies are never loaded for a list. */
const cardSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  featuredImage: true,
  featuredImageAlt: true,
  publishedAt: true,
  readingMinutes: true,
  category: { select: { name: true, slug: true } },
  author: { select: { name: true, avatarUrl: true, slug: true } },
} as const;

export type PostCard = Awaited<ReturnType<typeof listPosts>>["posts"][number];

function publishedWhere() {
  return {
    status: "PUBLISHED" as const,
    publishedAt: { not: null, lte: new Date() },
  };
}

/**
 * `unstable_cache` stores its value as JSON, so a Date written on a cache miss
 * comes back as an ISO string on every later hit. Anything that then calls
 * `.toISOString()` or hands the value to Intl throws "Invalid time value" —
 * and only after the cache warms, which makes it look intermittent.
 *
 * Every cached read is therefore passed through one of these before it leaves
 * this module, so callers can rely on real Date objects.
 */
type MaybeDate = Date | string | null | undefined;

const toDate = (value: MaybeDate) => (value ? new Date(value) : null);

function reviveCard<T extends { publishedAt: MaybeDate }>(post: T) {
  return { ...post, publishedAt: toDate(post.publishedAt) };
}

/**
 * Blog-only routes are time-bounded as well as tagged, so a scheduled post
 * becomes visible without anyone touching the admin panel. The homepage is
 * deliberately excluded — see getLatestPosts.
 */
const REVALIDATE_SECONDS = 300;

export async function listPosts(options: {
  page?: number;
  categorySlug?: string;
  tagSlug?: string;
  perPage?: number;
} = {}) {
  const perPage = options.perPage ?? POSTS_PER_PAGE;
  const page = Math.max(1, options.page ?? 1);

  const where = {
    ...publishedWhere(),
    ...(options.categorySlug ? { category: { slug: options.categorySlug } } : {}),
    ...(options.tagSlug ? { tags: { some: { slug: options.tagSlug } } } : {}),
  };

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      select: cardSelect,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.blogPost.count({ where }),
  ]);

  return {
    posts: posts.map(reviveCard),
    total,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
  };
}

const fetchLatestPosts = unstable_cache(
  async (take = 3) =>
    prisma.blogPost.findMany({
      where: publishedWhere(),
      select: cardSelect,
      orderBy: { publishedAt: "desc" },
      take,
    }),
  ["blog-latest"],
  /**
   * Time-bounded as well as tagged, and it has to be.
   *
   * `publishedWhere()` evaluates `new Date()` *inside* the cached function, so
   * whatever "now" was on the cache miss is frozen into the entry. With tags as
   * the only invalidation, a post scheduled for Friday never appears on the
   * homepage on Friday — it appears whenever somebody next happens to save an
   * unrelated article. That is a publishing feature that silently does not
   * work, which is worse than a five-minute delay.
   *
   * An admin edit still shows up immediately: `revalidateTag` purges the entry
   * regardless of how much of its window is left.
   */
  { tags: [CACHE_TAGS.blog], revalidate: REVALIDATE_SECONDS }
);

export async function getLatestPosts(take = 3) {
  return (await fetchLatestPosts(take)).map(reviveCard);
}

const fetchPostBySlug = unstable_cache(
  async (slug: string) =>
    prisma.blogPost.findFirst({
      where: { slug, ...publishedWhere() },
      include: {
        category: { select: { name: true, slug: true, description: true } },
        author: {
          select: { name: true, slug: true, avatarUrl: true, bio: true, websiteUrl: true },
        },
        tags: { select: { name: true, slug: true }, orderBy: { name: "asc" } },
      },
    }),
  ["blog-post"],
  { tags: [CACHE_TAGS.blog], revalidate: REVALIDATE_SECONDS }
);

export async function getPostBySlug(slug: string) {
  const post = await fetchPostBySlug(slug);
  if (!post) return null;

  return {
    ...post,
    publishedAt: toDate(post.publishedAt),
    createdAt: new Date(post.createdAt),
    updatedAt: new Date(post.updatedAt),
  };
}

export type FullPost = NonNullable<Awaited<ReturnType<typeof getPostBySlug>>>;

/** Same category, newest first, excluding the article being read. */
const fetchRelatedPosts = unstable_cache(
  async (postId: string, categoryId: string | null, take = 3) => {
    const related = categoryId
      ? await prisma.blogPost.findMany({
          where: { ...publishedWhere(), categoryId, id: { not: postId } },
          select: cardSelect,
          orderBy: { publishedAt: "desc" },
          take,
        })
      : [];

    if (related.length >= take) return related;

    // Top up from the rest of the archive so the strip is never half empty.
    const filler = await prisma.blogPost.findMany({
      where: {
        ...publishedWhere(),
        id: { not: postId, notIn: related.map((p) => p.id) },
      },
      select: cardSelect,
      orderBy: { publishedAt: "desc" },
      take: take - related.length,
    });

    return [...related, ...filler];
  },
  ["blog-related"],
  { tags: [CACHE_TAGS.blog], revalidate: REVALIDATE_SECONDS }
);

export async function getRelatedPosts(
  postId: string,
  categoryId: string | null,
  take = 3
) {
  return (await fetchRelatedPosts(postId, categoryId, take)).map(reviveCard);
}

/** Neighbours by publish date, for the prev/next control. */
export const getAdjacentPosts = unstable_cache(
  async (publishedAt: Date) => {
    const [previous, next] = await Promise.all([
      prisma.blogPost.findFirst({
        where: { ...publishedWhere(), publishedAt: { lt: publishedAt } },
        select: { title: true, slug: true },
        orderBy: { publishedAt: "desc" },
      }),
      prisma.blogPost.findFirst({
        where: {
          status: "PUBLISHED" as const,
          publishedAt: { gt: publishedAt, lte: new Date() },
        },
        select: { title: true, slug: true },
        orderBy: { publishedAt: "asc" },
      }),
    ]);

    return { previous, next };
  },
  ["blog-adjacent"],
  { tags: [CACHE_TAGS.blog], revalidate: REVALIDATE_SECONDS }
);

export const getCategories = unstable_cache(
  async () =>
    prisma.blogCategory.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        _count: { select: { posts: { where: publishedWhere() } } },
      },
    }),
  ["blog-categories"],
  {
    tags: [CACHE_TAGS.blog, CACHE_TAGS.blogTaxonomy],
    revalidate: REVALIDATE_SECONDS,
  }
);

/**
 * Full-text search against the generated tsvector.
 *
 * Ranked by weight (title > excerpt > body) and recency. `websearch_to_tsquery`
 * accepts what people actually type — quoted phrases, `or`, leading minus —
 * without throwing on syntax the way `to_tsquery` does.
 */
export async function searchPosts(term: string, take = 20) {
  /**
   * Sanitised here as well as in the route's parameter parsing.
   *
   * `term` becomes a bound parameter in the raw query below, and Postgres
   * refuses a NUL byte in text at any encoding — `22021 invalid byte sequence
   * for encoding "UTF8"` — which surfaced as an unauthenticated 500 on /blog.
   * The route now strips it before calling, and this strips it again, because a
   * function that hands strings to `$queryRaw` should not depend on every
   * caller having remembered.
   */
  let cleaned = "";
  for (const character of term) {
    const code = character.codePointAt(0) ?? 0;
    if (code >= 0x20 && code !== 0x7f) cleaned += character;
  }

  const query = cleaned.trim().slice(0, 200);
  if (!query) return [];

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "blog_posts"
    WHERE "status" = 'PUBLISHED'
      AND "publishedAt" IS NOT NULL
      AND "publishedAt" <= now()
      AND (
        "searchVector" @@ websearch_to_tsquery('simple', ${query})
        OR "title" ILIKE ${"%" + query + "%"}
      )
    ORDER BY
      ts_rank("searchVector", websearch_to_tsquery('simple', ${query})) DESC,
      "publishedAt" DESC
    LIMIT ${take}
  `;

  if (rows.length === 0) return [];

  const posts = await prisma.blogPost.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    select: cardSelect,
  });

  // Preserve the ranking the database produced.
  const order = new Map(rows.map((r, index) => [r.id, index]));
  return posts.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

/**
 * Every published article, for the sitemap and the RSS feed.
 *
 * Tagged rather than left uncached on purpose. Both callers are statically
 * rendered routes, and a route only inherits the tags of the cache entries it
 * reads — an untagged query gives Next nothing to invalidate, so `feed.xml`
 * would keep serving the pre-publish list until its own hourly window expired.
 */
const fetchAllPublishedPosts = unstable_cache(
  async () =>
    prisma.blogPost.findMany({
      where: { ...publishedWhere(), noIndex: false },
      select: {
        slug: true,
        title: true,
        excerpt: true,
        publishedAt: true,
        updatedAt: true,
        featuredImage: true,
        category: { select: { name: true } },
        author: { select: { name: true } },
      },
      orderBy: { publishedAt: "desc" },
    }),
  ["blog-all-published"],
  { tags: [CACHE_TAGS.blog], revalidate: REVALIDATE_SECONDS }
);

export async function getAllPublishedPosts() {
  // Both dates are formatted by the callers, so they must survive the cache's
  // JSON round trip as Dates rather than strings — see reviveCard above.
  return (await fetchAllPublishedPosts()).map((post) => ({
    ...post,
    publishedAt: toDate(post.publishedAt),
    updatedAt: new Date(post.updatedAt),
  }));
}
