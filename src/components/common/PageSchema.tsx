import type { Settings } from "@/lib/queries";
import { JsonLd } from "@/components/common/JsonLd";

/**
 * JSON-LD for a standalone page: the page itself, plus its breadcrumb.
 *
 * The Organization and WebSite nodes are **not** repeated here. They are
 * declared once, on the homepage (see StructuredData), and referenced by `@id`
 * — a second definition with a different shape is how a site ends up with two
 * competing organisations in Google's graph. Nothing in this component is
 * invented: the name, the URL and the description are the page's own.
 */
export function PageSchema({
  settings,
  type,
  path,
  name,
  description,
}: {
  settings: Settings;
  /** The most specific schema.org page type that actually applies. */
  type: "AboutPage" | "ContactPage" | "WebPage";
  /** Root-absolute, e.g. "/about". */
  path: string;
  name: string;
  description: string;
}) {
  const base = settings.siteUrl.replace(/\/$/, "");
  const url = `${base}${path}`;

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": type,
            "@id": `${url}#page`,
            url,
            name,
            description,
            inLanguage: "id-ID",
            isPartOf: { "@id": `${base}/#website` },
            publisher: { "@id": `${base}/#organization` },
          },
          {
            "@type": "BreadcrumbList",
            "@id": `${url}#breadcrumb`,
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: settings.siteName,
                item: base,
              },
              { "@type": "ListItem", position: 2, name, item: url },
            ],
          },
        ],
      }}
    />
  );
}
