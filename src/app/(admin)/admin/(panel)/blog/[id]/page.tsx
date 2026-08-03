import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/PageHeader";
import { PostEditor } from "@/components/admin/blog/PostEditor";

export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [post, categories, tags, authors] = await Promise.all([
    prisma.blogPost.findUnique({
      where: { id },
      include: { tags: { select: { id: true } } },
    }),
    prisma.blogCategory.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.blogTag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.author.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!post) notFound();

  return (
    <>
      <PageHeader eyebrow="Content" title="Edit article" description={post.title} />
      <PostEditor
        postId={post.id}
        // Optimistic-concurrency stamp; the save is refused if the article
        // has changed since this page rendered.
        version={post.updatedAt.toISOString()}
        categories={categories}
        tags={tags}
        authors={authors}
        initial={{
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          featuredImage: post.featuredImage,
          featuredImageAlt: post.featuredImageAlt,
          seoTitle: post.seoTitle,
          seoDescription: post.seoDescription,
          focusKeyword: post.focusKeyword,
          canonicalUrl: post.canonicalUrl,
          noIndex: post.noIndex,
          status: post.status,
          // A timezone-neutral instant. The editor renders it as wall-clock
          // time in the browser's zone, which only the browser knows.
          publishedAt: post.publishedAt?.toISOString() ?? "",
          authorId: post.authorId ?? "",
          categoryId: post.categoryId ?? "",
          tagIds: post.tags.map((tag) => tag.id),
        }}
      />
    </>
  );
}
