import type { Settings } from "@/lib/queries";
import type { PostCard } from "@/lib/blog/queries";
import { JsonLd } from "@/components/common/JsonLd";

/**
 * Structured data for the blog archive and its category views.
 *
 * The archive was the one indexable route with no JSON-LD at all: the homepage
 * declares Organization and WebSite, an article declares its full graph, and
 * `/blog` — which sits between them and is what links to every article —
 * declared nothing. A crawler had no statement of what the page is or where it
 * belongs.
 *
 * Three nodes, no more:
 *
 *   `CollectionPage` is what this page literally is — a list of links to other
 *   pages, not an Article. Using Blog/BlogPosting here would claim the archive
 *   is itself a piece of writing.
 *
 *   `ItemList` names the articles currently listed, in the order shown. Only
 *   `url` per item: repeating each headline here would restate what the article
 *   pages already say, and mismatches between the two are worse than silence.
 *
 *   `BreadcrumbList` mirrors the visible breadcrumb trail.
 *
 * Organization and WebSite are referenced by `@id`, never redefined — one
 * entity, declared once on the homepage. Nothing here is generated for a search
 * result or an empty archive: those carry `noindex`, and structured data on a
 * page that asks not to be indexed is noise at best.
 */
export function ArchiveSchema({
  settings,
  posts,
  path,
  title,
  description,
  category,
}: {
  settings: Settings;
  posts: PostCard[];
  /** Root-absolute, including the category parameter when there is one. */
  path: string;
  title: string;
  description: string;
  category?: { name: string; slug: string };
}) {
  const base = settings.siteUrl.replace(/\/$/, "");
  const url = `${base}${path}`;

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "CollectionPage",
            "@id": `${url}#page`,
            url,
            name: title,
            description,
            inLanguage: "id-ID",
            isPartOf: { "@id": `${base}/#website` },
            publisher: { "@id": `${base}/#organization` },
            breadcrumb: { "@id": `${url}#breadcrumb` },
            ...(posts.length > 0
              ? { mainEntity: { "@id": `${url}#list` } }
              : {}),
          },
          ...(posts.length > 0
            ? [
                {
                  "@type": "ItemList",
                  "@id": `${url}#list`,
                  itemListOrder: "https://schema.org/ItemListOrderDescending",
                  numberOfItems: posts.length,
                  itemListElement: posts.map((post, index) => ({
                    "@type": "ListItem",
                    position: index + 1,
                    url: `${base}/blog/${post.slug}`,
                  })),
                },
              ]
            : []),
          {
            "@type": "BreadcrumbList",
            "@id": `${url}#breadcrumb`,
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Beranda", item: base },
              {
                "@type": "ListItem",
                position: 2,
                name: "Blog",
                item: `${base}/blog`,
              },
              ...(category
                ? [
                    {
                      "@type": "ListItem",
                      position: 3,
                      name: category.name,
                      item: `${base}/blog?kategori=${category.slug}`,
                    },
                  ]
                : []),
            ],
          },
        ],
      }}
    />
  );
}
