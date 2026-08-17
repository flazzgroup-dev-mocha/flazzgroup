import type { MetadataRoute } from "next";

import { getSettings } from "@/lib/queries";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSettings();
  const base = settings.siteUrl.replace(/\/$/, "");

  return {
    /**
     * One group, and only two things closed off.
     *
     * `Disallow` is a prefix match, so `/admin` covers `/admin/login` and every
     * panel screen beneath it, and `/api` covers every handler. Neither is a
     * security control and neither is pretending to be one: the panel is behind
     * a session and the API answers 401 without one. This is about crawl budget
     * — a crawler that walks 50 admin routes to collect 50 redirects is
     * spending requests that should have gone to the blog.
     *
     * Everything else stays open on purpose, including `/_next/static`. Google
     * renders pages before indexing them, and a site that blocks its own CSS
     * and JavaScript gets judged on a broken render.
     *
     * Drafts and scheduled posts never reach a URL, so nothing extra to block.
     */
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] },
    sitemap: `${base}/sitemap.xml`,
    /**
     * No `Host:`.
     *
     * It was never part of the robots.txt standard. Yandex invented it to
     * nominate a preferred mirror, deprecated it in March 2018 in favour of
     * 301s, and now ignores it; Google, Bing and everyone else never read it at
     * all. So it did nothing here — the canonical host is already stated by the
     * apex→www redirect, by every `<link rel="canonical">`, and by the absolute
     * URLs in this file's own `Sitemap:` line.
     *
     * Doing nothing would be reason enough to drop it. The reason it is worth
     * actively removing is that RFC 9309 tells a parser to ignore lines it does
     * not recognise, and the stricter validators report them instead — so the
     * one genuinely load-bearing line in this file, `Sitemap:`, was sitting
     * directly beneath a line that makes some tools flag the document.
     */
  };
}
