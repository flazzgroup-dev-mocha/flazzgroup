import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/PageHeader";
import { TaxonomyManager } from "@/components/admin/blog/TaxonomyManager";

export const dynamic = "force-dynamic";

/**
 * The route segment matches RESOURCE_ROUTES.blogTaxonomy, so activity-log
 * entries for this resource point at a page that exists.
 */
export default async function BlogTaxonomyPage() {
  const [categories, tags, authors] = await Promise.all([
    prisma.blogCategory.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: { _count: { select: { posts: true } } },
    }),
    prisma.blogTag.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { posts: true } } },
    }),
    prisma.author.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { posts: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Blog taxonomy"
        description="Categories, tags and author bylines. Deleting one leaves its articles in place — they simply lose that label."
      />
      <TaxonomyManager categories={categories} tags={tags} authors={authors} />
    </>
  );
}
