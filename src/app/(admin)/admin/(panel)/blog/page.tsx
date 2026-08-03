import Link from "next/link";
import { Plus } from "lucide-react";

import { prisma } from "@/lib/prisma";
import type { PostStatus } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/PageHeader";
import { PostFilters } from "@/components/admin/blog/PostFilters";
import { PostTable } from "@/components/admin/blog/PostTable";

export const dynamic = "force-dynamic";

const PER_PAGE = 15;

const SORTS = {
  newest: { updatedAt: "desc" },
  oldest: { updatedAt: "asc" },
  published: { publishedAt: "desc" },
  title: { title: "asc" },
} as const;

export type SortKey = keyof typeof SORTS;

type SearchParams = Promise<{
  q?: string;
  status?: string;
  category?: string;
  sort?: string;
  page?: string;
}>;

export default async function BlogAdminPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const query = (params.q ?? "").trim();
  const status = params.status === "DRAFT" || params.status === "PUBLISHED"
    ? (params.status as PostStatus)
    : undefined;
  const categoryId = params.category || undefined;
  const sort = (params.sort && params.sort in SORTS ? params.sort : "newest") as SortKey;
  const page = Math.max(1, Number(params.page) || 1);

  // Filtering happens in the database, not the browser: an archive of a few
  // thousand articles must never be shipped to the client just to be searched.
  const where = {
    ...(status ? { status } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            { slug: { contains: query, mode: "insensitive" as const } },
            { excerpt: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [posts, total, categories] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: SORTS[sort],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        publishedAt: true,
        updatedAt: true,
        readingMinutes: true,
        featuredImage: true,
        category: { select: { name: true } },
        author: { select: { name: true } },
      },
    }),
    prisma.blogPost.count({ where }),
    prisma.blogCategory.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Blog"
        description="Write, schedule and publish articles. Everything here is indexed by search engines the moment it goes live."
        action={
          <Button variant="gold" size="sm" asChild>
            <Link href="/admin/blog/new">
              <Plus aria-hidden />
              New article
            </Link>
          </Button>
        }
      />

      <PostFilters categories={categories} total={total} />

      <PostTable posts={posts} page={page} pageCount={pageCount} total={total} />
    </>
  );
}
