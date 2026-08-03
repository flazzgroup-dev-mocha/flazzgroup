import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/PageHeader";
import { PostEditor } from "@/components/admin/blog/PostEditor";

export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  const [categories, tags, authors] = await Promise.all([
    prisma.blogCategory.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.blogTag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.author.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Content" title="New article" />
      <PostEditor
        categories={categories}
        tags={tags}
        authors={authors}
        initial={{
          title: "",
          slug: "",
          excerpt: "",
          content: "",
          featuredImage: "",
          featuredImageAlt: "",
          seoTitle: "",
          seoDescription: "",
          focusKeyword: "",
          canonicalUrl: "",
          noIndex: false,
          status: "DRAFT",
          publishedAt: "",
          authorId: authors[0]?.id ?? "",
          categoryId: "",
          tagIds: [],
        }}
      />
    </>
  );
}
