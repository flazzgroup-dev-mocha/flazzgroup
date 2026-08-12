import type { Metadata } from "next";

import { getSettings } from "@/lib/queries";
import { isVector, socialImageUrl } from "@/lib/media/url";

/**
 * The RSS `<link rel="alternate">`, repeated on every page that declares its
 * own canonical.
 *
 * It has to be repeated. Next merges metadata per top-level field, and
 * `alternates` is one field: a page that sets `alternates: { canonical }`
 * replaces the parent's `alternates` wholesale rather than merging into it. So
 * declaring the feed once in the root layout put it on exactly the pages that
 * set no canonical of their own — which, on this site, is none of them.
 *
 * Spread this alongside `canonical` instead of hand-writing the object, so the
 * feed URL exists in one place.
 */
export const RSS_ALTERNATE = {
  types: {
    "application/rss+xml": [{ url: "/feed.xml", title: "Blog" }],
  },
} satisfies NonNullable<Metadata["alternates"]>;

/**
 * The social card for any page, resolved by one rule.
 *
 * Three things have to be true of an `og:image` and they were being decided
 * separately on each route:
 *
 *   1. It is never an SVG. Every scraper refuses `image/svg+xml`, and the logo
 *      on this site is one — so a vector `ogImageUrl` is the same as no image.
 *   2. It is absolute. Scrapers have no page to resolve a relative path
 *      against.
 *   3. It is not the 2 MB original. See `socialImageUrl`.
 *
 * And there is always one: the generated 1200×630 route is the last resort, so
 * no page can ship a card with no picture. That matters more than it sounds,
 * because Next replaces the root's `openGraph` object entirely when a route
 * declares its own — omitting the image does not inherit it, it deletes it.
 *
 * @param preferred The page's own image, if it has one — an article's featured
 *   image. Falls back to the site-wide social image from settings.
 */
export function resolveSocialImage(
  settings: Awaited<ReturnType<typeof getSettings>>,
  preferred?: string | null
) {
  const base = settings.siteUrl.replace(/\/$/, "");

  const candidate = [preferred, settings.ogImageUrl].find(
    (value): value is string => Boolean(value?.trim()) && !isVector(value!)
  );

  if (!candidate) return `${base}/opengraph-image`;

  const absolute = candidate.startsWith("http")
    ? candidate
    : `${base}${candidate}`;

  return socialImageUrl(absolute);
}

/**
 * Metadata for a standalone page — About, Contact, and the two policies.
 *
 * These four differ from each other only in title, description and path, so
 * the parts that must not vary live here: a self-referencing canonical, an
 * explicit index/follow, and an Open Graph card that is complete.
 *
 * "Complete" is the reason this exists rather than four inline objects. Next
 * merges metadata per top-level field, so a page that declares `openGraph`
 * replaces the root's wholesale — `siteName`, `locale` and the image included.
 * A page that spelled out only title and description would ship a card with no
 * picture, which is what WhatsApp and Telegram previews are made of.
 *
 * The domain is never written down: it comes from `settings.siteUrl`, the same
 * value the sitemap, robots.txt and `metadataBase` read.
 */
export async function staticPageMetadata({
  title,
  description,
  path,
}: {
  /** Used verbatim — the root's `%s | FLAZZ GROUP` template is bypassed. */
  title: string;
  description: string;
  /** Root-absolute, e.g. "/about". */
  path: string;
}): Promise<Metadata> {
  const settings = await getSettings();
  const base = settings.siteUrl.replace(/\/$/, "");
  const image = resolveSocialImage(settings);

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path, ...RSS_ALTERNATE },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    openGraph: {
      type: "website",
      url: `${base}${path}`,
      title,
      description,
      siteName: settings.siteName,
      locale: "id_ID",
      images: [{ url: image, alt: settings.siteName }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
