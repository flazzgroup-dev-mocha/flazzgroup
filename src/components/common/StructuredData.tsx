import type { Settings } from "@/lib/queries";
import type { Brand, Faq, Product } from "@/lib/models";
import { JsonLd } from "@/components/common/JsonLd";
import { cloudinaryUrl, isVector } from "@/lib/media/url";

/**
 * JSON-LD for the homepage: organisation, site search, product catalogue and
 * the FAQ block. Every value comes from the database, so structured data can
 * never drift from what visitors see.
 */
export function StructuredData({
  settings,
  brands,
  products,
  faqs,
}: {
  settings: Settings;
  brands: Brand[];
  products: Product[];
  faqs: Faq[];
}) {
  const base = settings.siteUrl.replace(/\/$/, "");

  /**
   * Structured data is read by a crawler that has no page to resolve against,
   * so every URL in it has to be absolute. Uploads already arrive as full
   * Cloudinary URLs; anything served from /public does not.
   */
  const absolute = (url: string) =>
    url.startsWith("http") ? url : `${base}${url}`;

  /**
   * An image URL a crawler should actually fetch.
   *
   * Same reasoning as the image sitemap and the article graph: name the
   * delivery URL the page renders, not the stored original. Without the
   * transform Cloudinary ignores the crawler's `Accept` header and returns the
   * full-size PNG — for the product tiles that is a 2 MB file standing in for a
   * thumbnail, and it is not a URL that appears anywhere in the markup.
   *
   * Vectors pass through untouched: `f_auto` would rasterise them, and the
   * width cap is meaningless for a format that has no pixels.
   */
  const deliverable = (url: string, width?: number) => {
    const full = absolute(url);
    return isVector(full) ? full : cloudinaryUrl(full, { width });
  };

  const sameAs = [
    settings.telegramUrl,
    settings.whatsappUrl,
    settings.instagramUrl,
    settings.tiktokUrl,
    settings.youtubeUrl,
  ].filter((url) => url.trim().length > 0);

  const graph: Record<string, unknown>[] = [
    {
      "@type": "Organization",
      "@id": `${base}/#organization`,
      name: settings.siteName,
      url: base,
      // No width cap: a logo is small already, and Google reads its intrinsic
      // dimensions. `f_auto` alone is the win here.
      logo: deliverable(settings.logoUrl),
      description: settings.siteDescription,
      ...(sameAs.length > 0 ? { sameAs } : {}),
      ...(settings.telegramUrl
        ? {
            contactPoint: {
              "@type": "ContactPoint",
              contactType: "customer support",
              availableLanguage: ["id", "en"],
              url: settings.telegramUrl,
              hoursAvailable: {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: [
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ],
                opens: "00:00",
                closes: "23:59",
              },
            },
          }
        : {}),
      ...(brands.length > 0
        ? {
            subOrganization: brands.map((brand) => ({
              "@type": "Organization",
              name: brand.name,
              description: brand.description,
            })),
          }
        : {}),
    },
    {
      "@type": "WebSite",
      "@id": `${base}/#website`,
      url: base,
      name: settings.siteName,
      inLanguage: "id-ID",
      publisher: { "@id": `${base}/#organization` },
    },
  ];

  if (products.length > 0) {
    graph.push({
      "@type": "ItemList",
      "@id": `${base}/#catalog`,
      name: "Top up Royal Dream",
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          name: `${product.title} ${product.unit}`.trim(),
          /**
           * Required for a merchant listing, and the reason Search Console
           * reported all eight products as invalid. The column is NOT NULL, so
           * there is always something to send; it is only omitted here if an
           * older row predates the field being filled in.
           */
          ...(product.imageUrl
            ? { image: deliverable(product.imageUrl, 1200) }
            : {}),
          ...(product.description ? { description: product.description } : {}),
          brand: { "@type": "Brand", name: settings.siteName },
          offers: {
            "@type": "Offer",
            price: product.price,
            priceCurrency: "IDR",
            availability: "https://schema.org/InStock",
            url: `${base}/#royal-dream`,
          },
        },
      })),
    });
  }

  if (faqs.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${base}/#faq`,
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    });
  }

  return <JsonLd data={{ "@context": "https://schema.org", "@graph": graph }} />;
}
