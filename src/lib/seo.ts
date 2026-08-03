import type { Metadata } from "next";

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
