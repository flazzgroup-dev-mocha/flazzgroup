import type { Settings } from "@/lib/queries";
import type { Product } from "@/lib/models";
import { schemaImageUrl } from "@/lib/media/url";
import { JsonLd } from "@/components/common/JsonLd";

/**
 * JSON-LD for a page that *is* a catalogue.
 *
 * The product `ItemList` used to be declared on the homepage, because that is
 * where the coin grid was rendered. It moved with the grid, and the move is
 * the point: structured data has to describe the page it sits on, and a
 * homepage that no longer lists a single price must not keep telling Google it
 * lists eight.
 *
 * Organization and WebSite are **not** repeated here. They are declared once,
 * on the homepage, and referenced by `@id` — a second definition with a
 * different shape is how a site ends up with two competing organisations in
 * Google's graph.
 *
 * Nothing here is invented. Every name, price and picture is the row the page
 * renders directly above it; there is no rating, no review and no availability
 * claim that the page does not actually make.
 */
export function CatalogSchema({
  settings,
  products,
  path,
  name,
  description,
}: {
  settings: Settings;
  products: Product[];
  /** Root-absolute, e.g. "/top-up/royal-dream". */
  path: string;
  name: string;
  description: string;
}) {
  const base = settings.siteUrl.replace(/\/$/, "");
  const url = `${base}${path}`;

  const graph: Record<string, unknown>[] = [
    {
      "@type": "CollectionPage",
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
  ];

  if (products.length > 0) {
    graph.push({
      "@type": "ItemList",
      "@id": `${url}#catalog`,
      name,
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          name: `${product.title} ${product.unit}`.trim(),
          /**
           * Required for a merchant listing, and the reason Search Console
           * once reported every product as invalid. The column is NOT NULL, so
           * there is always something to send; it is only omitted here if an
           * older row predates the field being filled in.
           */
          ...(product.imageUrl
            ? { image: schemaImageUrl(base, product.imageUrl, 1200) }
            : {}),
          ...(product.description ? { description: product.description } : {}),
          brand: { "@type": "Brand", name: settings.siteName },
          offers: {
            "@type": "Offer",
            price: product.price,
            priceCurrency: "IDR",
            availability: "https://schema.org/InStock",
            // The page the offer is actually made on — this one.
            url,
          },
        },
      })),
    });
  }

  return <JsonLd data={{ "@context": "https://schema.org", "@graph": graph }} />;
}
