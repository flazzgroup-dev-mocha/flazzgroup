import type { MetadataRoute } from "next";

import { getSettings } from "@/lib/queries";
import { getAllPublishedPosts, getCategories } from "@/lib/blog/queries";

/**
 * Every published article is listed automatically. Drafts, scheduled posts and
 * anything flagged noIndex are excluded by the query itself, so the sitemap
 * can never advertise a page that returns 404 or noindex.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, posts, categories] = await Promise.all([
    getSettings(),
    getAllPublishedPosts(),
    getCategories(),
  ]);

  const base = settings.siteUrl.replace(/\/$/, "");

  return [
    {
      url: base,
      lastModified: settings.updatedAt,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${base}/blog`,
      lastModified: posts[0]?.publishedAt ?? settings.updatedAt,
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...categories
      .filter((category) => category._count.posts > 0)
      .map((category) => ({
        url: `${base}/blog?kategori=${category.slug}`,
        lastModified: posts[0]?.publishedAt ?? settings.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
    ...posts.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
