import { getSettings } from "@/lib/queries";
import { getAllPublishedPosts } from "@/lib/blog/queries";

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
      const image = post.featuredImage
        ? post.featuredImage.startsWith("http")
          ? post.featuredImage
          : `${base}${post.featuredImage}`
        : null;

      return `    <item>
      <title>${xml(post.title)}</title>
      <link>${xml(url)}</link>
      <guid isPermaLink="true">${xml(url)}</guid>
      <description>${xml(post.excerpt)}</description>
      <pubDate>${(post.publishedAt ?? new Date()).toUTCString()}</pubDate>
${post.category ? `      <category>${xml(post.category.name)}</category>\n` : ""}${post.author ? `      <dc:creator>${xml(post.author.name)}</dc:creator>\n` : ""}${image ? `      <enclosure url="${xml(image)}" type="image/*" />\n` : ""}    </item>`;
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
