import type { MetadataRoute } from "next";

import { getSettings } from "@/lib/queries";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSettings();
  const base = settings.siteUrl.replace(/\/$/, "");

  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] },
    sitemap: `${base}/sitemap.xml`,
    // Drafts and scheduled posts never reach a URL, so nothing extra to block.
    host: base,
  };
}
