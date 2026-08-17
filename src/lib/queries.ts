import "server-only";

import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import { CACHE_TAGS } from "@/lib/cache";

/**
 * Read side of the homepage. Each fetcher is cached under its own tag, so an
 * admin edit to (say) the FAQ only invalidates the FAQ query.
 */

/**
 * The ceiling under tag invalidation.
 *
 * `unstable_cache` with no `revalidate` does not mean "until the tag is
 * dropped". It means one year — Next writes `revalidate: 31536000` into the
 * entry — and those entries live on disk under `.next/cache`, which a rebuild
 * deliberately preserves. So without a value here an entry only ever expires
 * because some admin action happened to call `revalidateTag` on the process
 * holding it.
 *
 * That is not theoretical. Building this project from a clean checkout and
 * starting it served a homepage and footer listing two brands that had been
 * deleted from the database — linking out to their sites, and naming them in
 * the Organization schema as `subOrganization`. The entry was tagged `brands`
 * and eleven months from expiring; the rows behind it were long gone.
 *
 * Anything that changes the database without going through the panel — a
 * restored backup, a hand-run SQL fix, a second instance, a migration that
 * rewrites content — is invisible to tag invalidation, and that is the gap
 * this closes.
 *
 * ------------------------------------------------------------ why an hour
 *
 * Deliberately not the 300s that lib/blog/queries.ts uses. That number is
 * short because it is doing a *job*: `publishedWhere()` freezes "now" into the
 * cached value, so the window is what makes a scheduled post appear on time.
 * Nothing here is time-dependent — brands, products and FAQs change when
 * somebody edits them, and that fires `revalidateTag` immediately.
 *
 * So this is only a safety net, and an hour catches what a year does not just
 * as decisively. It also matters that Next takes the *minimum* of a route's
 * own `revalidate` and the TTL of every cache entry it reads: at 300s these
 * queries would quietly drag /privacy-policy and /terms from a daily
 * regeneration to one every five minutes, because they render a footer.
 */
const REVALIDATE_SECONDS = 3600;

const activeOrder = { isActive: true } as const;
const byOrder = [{ order: "asc" as const }, { createdAt: "asc" as const }];

export const getSettings = unstable_cache(
  async () => {
    // Read first. The previous version used upsert, which issues a write on
    // every cache miss — it takes a row lock, dirties a page, and would fail
    // outright against a read replica. The create only runs on a database that
    // has never been seeded.
    const existing = await prisma.websiteSettings.findUnique({
      where: { id: "settings" },
    });

    if (existing) return existing;

    return prisma.websiteSettings.upsert({
      where: { id: "settings" },
      update: {},
      create: { id: "settings" },
    });
  },
  ["settings"],
  { tags: [CACHE_TAGS.settings], revalidate: REVALIDATE_SECONDS }
);

export type Settings = Awaited<ReturnType<typeof getSettings>>;

/** Exactly the columns a hero slide renders. */
export type HeroSlide = {
  id: string;
  imageUrl: string;
  mobileImageUrl: string;
  imageAlt: string;
  destinationUrl: string;
};

/**
 * Hero slides, with the artwork's real dimensions attached.
 *
 * The slider needs one aspect ratio for every slide — a fade transition
 * between differently-shaped boxes would jump — and it has to know that ratio
 * before the first image loads, or the hero collapses and then snaps open,
 * which is the largest layout shift on the page. The first banner's stored
 * dimensions set it; the rest are covered into the same frame.
 */
export const getHeroBanners = unstable_cache(
  async () => {
    const banners = await prisma.heroBanner.findMany({
      where: activeOrder,
      orderBy: byOrder,
      // Explicit, because the Hero is a client component: anything selected
      // here is serialised into the RSC payload and downloaded by every
      // visitor. `findMany` with no select was shipping all eleven deprecated
      // copy columns to the browser on every page load.
      select: {
        id: true,
        imageUrl: true,
        mobileImageUrl: true,
        imageAlt: true,
        destinationUrl: true,
      },
    });

    if (banners.length === 0) return { banners, aspectRatio: null };

    const asset = await prisma.mediaAsset.findUnique({
      where: { secureUrl: banners[0].imageUrl },
      select: { width: true, height: true },
    });

    return {
      banners,
      aspectRatio:
        asset?.width && asset.height ? asset.width / asset.height : null,
    };
  },
  ["hero-banners"],
  { tags: [CACHE_TAGS.banners], revalidate: REVALIDATE_SECONDS }
);

export const getHeroStats = unstable_cache(
  async () => prisma.heroStat.findMany({ where: activeOrder, orderBy: byOrder }),
  ["hero-stats"],
  { tags: [CACHE_TAGS.heroStats], revalidate: REVALIDATE_SECONDS }
);

export const getPopularServices = unstable_cache(
  async () =>
    prisma.popularService.findMany({ where: activeOrder, orderBy: byOrder }),
  ["popular-services"],
  { tags: [CACHE_TAGS.popular], revalidate: REVALIDATE_SECONDS }
);

export const getProducts = unstable_cache(
  async () => prisma.product.findMany({ where: activeOrder, orderBy: byOrder }),
  ["products"],
  { tags: [CACHE_TAGS.products], revalidate: REVALIDATE_SECONDS }
);

export const getBrands = unstable_cache(
  async () =>
    prisma.brand.findMany({
      where: { showOnHomepage: true },
      orderBy: byOrder,
    }),
  ["brands"],
  { tags: [CACHE_TAGS.brands], revalidate: REVALIDATE_SECONDS }
);

export const getFeatures = unstable_cache(
  async () => prisma.feature.findMany({ where: activeOrder, orderBy: byOrder }),
  ["features"],
  { tags: [CACHE_TAGS.features], revalidate: REVALIDATE_SECONDS }
);

export const getPaymentMethods = unstable_cache(
  async () =>
    prisma.paymentMethod.findMany({ where: activeOrder, orderBy: byOrder }),
  ["payment-methods"],
  { tags: [CACHE_TAGS.payments], revalidate: REVALIDATE_SECONDS }
);

export const getCommunityLinks = unstable_cache(
  async () =>
    prisma.communityLink.findMany({ where: activeOrder, orderBy: byOrder }),
  ["community-links"],
  { tags: [CACHE_TAGS.community], revalidate: REVALIDATE_SECONDS }
);

export const getFaqs = unstable_cache(
  async () => prisma.faq.findMany({ where: activeOrder, orderBy: byOrder }),
  ["faqs"],
  { tags: [CACHE_TAGS.faq], revalidate: REVALIDATE_SECONDS }
);

/** Everything the homepage needs, in one round of parallel queries. */
export async function getHomepageData() {
  const [
    settings,
    banners,
    heroStats,
    popular,
    products,
    brands,
    features,
    payments,
    community,
    faqs,
  ] = await Promise.all([
    getSettings(),
    getHeroBanners(),
    getHeroStats(),
    getPopularServices(),
    getProducts(),
    getBrands(),
    getFeatures(),
    getPaymentMethods(),
    getCommunityLinks(),
    getFaqs(),
  ]);

  return {
    settings,
    banners: banners.banners,
    bannerAspectRatio: banners.aspectRatio,
    heroStats,
    popular,
    products,
    brands,
    features,
    payments,
    community,
    faqs,
  };
}

export type HomepageData = Awaited<ReturnType<typeof getHomepageData>>;
