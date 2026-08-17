import { getSettings } from "@/lib/queries";
import { getAllPublishedPosts } from "@/lib/blog/queries";
import { isCloudinaryUrl, isVector, socialImageUrl } from "@/lib/media/url";

export const revalidate = 3600;

/** Escapes the five characters that are not legal as XML character data. */
function xml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * The `<enclosure>` for an article's featured image, or nothing.
 *
 * Two things were wrong with the previous one-liner.
 *
 * `type="image/*"` is not a MIME type. RSS 2.0 requires a real one, and a
 * wildcard is not something any reader can match against — the attribute exists
 * precisely so a client can decide whether it can render the thing before
 * fetching it. The transform settles it: every Cloudinary image goes out as
 * `f_jpg`, so the type is known rather than guessed.
 *
 * And the URL was the stored original — the 2 MB PNGs this site's featured
 * images actually are. A feed reader building a thumbnail strip would fetch all
 * of them at full size. `socialImageUrl` is the same helper the Open Graph card
 * uses, for the same reason: one predictable JPEG, capped at 1200px, under
 * 200 KB, and `c_limit` never upscales a smaller original.
 *
 * Vectors are skipped. A feed reader's thumbnail slot is a raster slot, and the
 * only SVGs here are the default author avatar and the bundled section art.
 *
 * `length` stays absent. The spec asks for it, every reader tolerates its
 * absence, and the only honest value would require fetching the transformed
 * image to measure it — a byte count invented here would be worse than none.
 */
function enclosure(featuredImage: string, base: string) {
  if (!featuredImage) return "";

  const absolute = featuredImage.startsWith("http")
    ? featuredImage
    : `${base}${featuredImage}`;

  if (isVector(absolute)) return "";

  // Anything not on Cloudinary is passed through untransformed, so its type has
  // to come from the extension; an unrecognised one is omitted rather than
  // labelled with a guess.
  if (!isCloudinaryUrl(absolute)) {
    const extension = absolute.toLowerCase().split("?")[0].split(".").pop() ?? "";
    const type = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", avif: "image/avif" }[extension];

    return type
      ? `      <enclosure url="${xml(absolute)}" type="${type}" />\n`
      : "";
  }

  return `      <enclosure url="${xml(socialImageUrl(absolute))}" type="image/jpeg" />\n`;
}

export async function GET() {
  const [settings, posts] = await Promise.all([
    getSettings(),
    getAllPublishedPosts(),
  ]);

  const base = settings.siteUrl.replace(/\/$/, "");
  const updated = posts[0]?.publishedAt ?? new Date();

  const items = posts
    .map((post) => {
      const url = `${base}/blog/${post.slug}`;

      return `    <item>
      <title>${xml(post.title)}</title>
      <link>${xml(url)}</link>
      <guid isPermaLink="true">${xml(url)}</guid>
      <description>${xml(post.excerpt)}</description>
      <pubDate>${(post.publishedAt ?? new Date()).toUTCString()}</pubDate>
${post.category ? `      <category>${xml(post.category.name)}</category>\n` : ""}${post.author ? `      <dc:creator>${xml(post.author.name)}</dc:creator>\n` : ""}${enclosure(post.featuredImage, base)}    </item>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${xml(settings.siteName)} — Blog</title>
    <link>${xml(`${base}/blog`)}</link>
    <description>${xml(settings.seoDescription || settings.siteDescription)}</description>
    <language>id-ID</language>
    <lastBuildDate>${updated.toUTCString()}</lastBuildDate>
    <atom:link href="${xml(`${base}/feed.xml`)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
