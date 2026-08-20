import type { Settings } from "@/lib/queries";
import type { Brand, Faq } from "@/lib/models";
import { JsonLd } from "@/components/common/JsonLd";
import { schemaImageUrl } from "@/lib/media/url";

/**
 * JSON-LD for the homepage: the organisation, the website and the FAQ block.
 * Every value comes from the database, so structured data can never drift from
 * what visitors see.
 *
 * The product `ItemList` that used to live here went with the coin grid, to
 * CatalogSchema on /top-up/royal-dream. Leaving it behind would have been the
 * exact failure this file is written to avoid: a homepage that lists no price
 * anywhere still telling Google it is a catalogue of eight offers.
 */
export function StructuredData({
  settings,
  brands,
  faqs,
}: {
  settings: Settings;
  brands: Brand[];
  faqs: Faq[];
}) {
  const base = settings.siteUrl.replace(/\/$/, "");

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
      logo: schemaImageUrl(base, settings.logoUrl),
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
