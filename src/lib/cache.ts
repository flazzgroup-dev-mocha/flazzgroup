/**
 * Cache tags for the homepage data. Admin writes call `revalidateResource`,
 * which drops the matching tag so the next request re-renders with fresh
 * content — no full-site rebuild, no manual revalidate window.
 */
export const CACHE_TAGS = {
  settings: "settings",
  banners: "banners",
  heroStats: "hero-stats",
  games: "games",
  popular: "popular",
  products: "products",
  brands: "brands",
  features: "features",
  payments: "payments",
  community: "community",
  faq: "faq",
  blog: "blog",
  blogTaxonomy: "blog-taxonomy",
} as const;

export type ResourceKey = keyof typeof CACHE_TAGS;

/**
 * Resources whose change also invalidates another resource's cache.
 *
 * Taxonomy is the one entry that needs this: a category rename, a new tag or an
 * edited author byline changes what every cached article, card and listing
 * renders, and all of those are stored under the `blog` tag. Without the
 * cascade the panel would report a successful save while the public site kept
 * serving the old name until the timed revalidate happened to expire.
 */
const CASCADES: Partial<Record<ResourceKey, ResourceKey[]>> = {
  blogTaxonomy: ["blog"],
};

/** Every cache tag that must be dropped when `resource` changes. */
export function tagsFor(resource: ResourceKey) {
  return [
    CACHE_TAGS[resource],
    ...(CASCADES[resource] ?? []).map((key) => CACHE_TAGS[key]),
  ];
}

/** Route segment under /admin for each resource, used by activity links. */
export const RESOURCE_ROUTES: Record<ResourceKey, string> = {
  settings: "settings",
  banners: "banners",
  heroStats: "hero-stats",
  games: "games",
  popular: "popular",
  products: "products",
  brands: "brands",
  features: "features",
  payments: "payments",
  community: "community",
  faq: "faq",
  blog: "blog",
  blogTaxonomy: "blog-taxonomy",
};

export const RESOURCE_LABELS: Record<ResourceKey, string> = {
  settings: "Settings",
  banners: "Hero banner",
  heroStats: "Hero stat",
  games: "Game",
  popular: "Popular service",
  products: "Product",
  brands: "Brand",
  features: "Feature",
  payments: "Payment method",
  community: "Community link",
  faq: "FAQ",
  blog: "Article",
  blogTaxonomy: "Blog taxonomy",
};
