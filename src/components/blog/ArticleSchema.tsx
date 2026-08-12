import type { Settings } from "@/lib/queries";
import type { FullPost } from "@/lib/blog/queries";
import { JsonLd } from "@/components/common/JsonLd";
import { cloudinaryUrl, isVector } from "@/lib/media/url";

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

  /**
   * The delivery URL for an image named in structured data.
   *
   * Same rule as the image sitemap: quote the URL the page actually renders,
   * not the stored original. `next/image` puts `f_auto,q_auto,w_…,c_limit`
   * variants in the `srcset`, so naming the bare original here pointed Google
   * at a 2 MB PNG that appears nowhere in the markup.
   */
  const deliverable = (path: string) =>
    cloudinaryUrl(absolute(path), { width: 1200 });

  const organizationId = `${base}/#organization`;

  /**
   * The author's identifier is a fragment on the About page, not on a
   * `/blog/penulis/<slug>` archive.
   *
   * That archive route does not exist — it was never built — so the previous
   * `@id` was a URL that answers 404. An `@id` is nominally just a name, but
   * consumers do dereference them, and naming an entity after a dead URL is
   * the kind of small inconsistency that costs trust in the rest of the graph
   * for nothing. /about is where this site actually describes who writes it.
   *
   * The slug still varies per author, so two authors stay two entities.
   */
  const authorId = post.author ? `${base}/about#author-${post.author.slug}` : null;

  const graph: Record<string, unknown>[] = [
    {
      "@type": "Organization",
      "@id": organizationId,
      name: settings.siteName,
      url: base,
      logo: deliverable(settings.logoUrl),
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
              url: deliverable(post.featuredImage),
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
      /**
       * A vector avatar is omitted rather than quoted. Google cannot use an
       * SVG for an entity image, and the default author avatar on this site is
       * the SVG logo — so the property was always present and never usable.
       */
      ...(post.author.avatarUrl && !isVector(post.author.avatarUrl)
        ? { image: deliverable(post.author.avatarUrl) }
        : {}),
      ...(post.author.websiteUrl ? { sameAs: [post.author.websiteUrl] } : {}),
      worksFor: { "@id": organizationId },
    });
  }

  return <JsonLd data={{ "@context": "https://schema.org", "@graph": graph }} />;
}
