import type { Settings } from "@/lib/queries";
import type { FullPost } from "@/lib/blog/queries";
import { JsonLd } from "@/components/common/JsonLd";

/**
 * Structured data for a single article.
 *
 * Emits Article, BreadcrumbList, Person (author) and Organization (publisher)
 * in one graph so the nodes can reference each other by @id rather than being
 * repeated — which is what Google's parser prefers.
 */
export function ArticleSchema({
  post,
  settings,
  url,
}: {
  post: FullPost;
  settings: Settings;
  url: string;
}) {
  // A no-indexed article should not advertise itself in structured data.
  if (post.noIndex) return null;

  const base = settings.siteUrl.replace(/\/$/, "");
  const absolute = (path: string) =>
    path.startsWith("http") ? path : `${base}${path}`;

  const organizationId = `${base}/#organization`;
  const authorId = post.author ? `${base}/blog/penulis/${post.author.slug}#person` : null;

  const graph: Record<string, unknown>[] = [
    {
      "@type": "Organization",
      "@id": organizationId,
      name: settings.siteName,
      url: base,
      logo: absolute(settings.logoUrl),
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Beranda", item: base },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${base}/blog` },
        ...(post.category
          ? [
              {
                "@type": "ListItem",
                position: 3,
                name: post.category.name,
                item: `${base}/blog?kategori=${post.category.slug}`,
              },
            ]
          : []),
        {
          "@type": "ListItem",
          position: post.category ? 4 : 3,
          name: post.title,
          item: url,
        },
      ],
    },
    {
      "@type": "BlogPosting",
      "@id": `${url}#article`,
      isPartOf: { "@id": `${url}#webpage` },
      headline: post.seoTitle || post.title,
      name: post.title,
      description: post.seoDescription || post.excerpt,
      inLanguage: "id-ID",
      mainEntityOfPage: url,
      url,
      wordCount: post.contentText.split(/\s+/).filter(Boolean).length,
      timeRequired: `PT${post.readingMinutes}M`,
      datePublished: post.publishedAt?.toISOString(),
      dateModified: post.updatedAt.toISOString(),
      publisher: { "@id": organizationId },
      ...(authorId ? { author: { "@id": authorId } } : {}),
      ...(post.category ? { articleSection: post.category.name } : {}),
      ...(post.tags.length > 0
        ? { keywords: post.tags.map((tag) => tag.name).join(", ") }
        : {}),
      ...(post.featuredImage
        ? {
            image: {
              "@type": "ImageObject",
              url: absolute(post.featuredImage),
              caption: post.featuredImageAlt || post.title,
            },
          }
        : {}),
    },
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: post.seoTitle || post.title,
      isPartOf: { "@id": `${base}/#website` },
      breadcrumb: { "@id": `${url}#breadcrumb` },
      inLanguage: "id-ID",
    },
  ];

  if (post.author && authorId) {
    graph.push({
      "@type": "Person",
      "@id": authorId,
      name: post.author.name,
      ...(post.author.bio ? { description: post.author.bio } : {}),
      ...(post.author.avatarUrl
        ? { image: absolute(post.author.avatarUrl) }
        : {}),
      ...(post.author.websiteUrl ? { sameAs: [post.author.websiteUrl] } : {}),
      worksFor: { "@id": organizationId },
    });
  }

  return <JsonLd data={{ "@context": "https://schema.org", "@graph": graph }} />;
}
