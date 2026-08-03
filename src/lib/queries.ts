import "server-only";

import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import { CACHE_TAGS } from "@/lib/cache";

/**
 * Read side of the homepage. Each fetcher is cached under its own tag, so an
 * admin edit to (say) the FAQ only invalidates the FAQ query.
 */

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
  { tags: [CACHE_TAGS.settings] }
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
  { tags: [CACHE_TAGS.banners] }
);

export const getHeroStats = unstable_cache(
  async () => prisma.heroStat.findMany({ where: activeOrder, orderBy: byOrder }),
  ["hero-stats"],
  { tags: [CACHE_TAGS.heroStats] }
);

export const getPopularServices = unstable_cache(
  async () =>
    prisma.popularService.findMany({ where: activeOrder, orderBy: byOrder }),
  ["popular-services"],
  { tags: [CACHE_TAGS.popular] }
);

export const getProducts = unstable_cache(
  async () => prisma.product.findMany({ where: activeOrder, orderBy: byOrder }),
  ["products"],
  { tags: [CACHE_TAGS.products] }
);

export const getBrands = unstable_cache(
  async () =>
    prisma.brand.findMany({
      where: { showOnHomepage: true },
      orderBy: byOrder,
    }),
  ["brands"],
  { tags: [CACHE_TAGS.brands] }
);

export const getFeatures = unstable_cache(
  async () => prisma.feature.findMany({ where: activeOrder, orderBy: byOrder }),
  ["features"],
  { tags: [CACHE_TAGS.features] }
);

export const getPaymentMethods = unstable_cache(
  async () =>
    prisma.paymentMethod.findMany({ where: activeOrder, orderBy: byOrder }),
  ["payment-methods"],
  { tags: [CACHE_TAGS.payments] }
);

export const getCommunityLinks = unstable_cache(
  async () =>
    prisma.communityLink.findMany({ where: activeOrder, orderBy: byOrder }),
  ["community-links"],
  { tags: [CACHE_TAGS.community] }
);

export const getFaqs = unstable_cache(
  async () => prisma.faq.findMany({ where: activeOrder, orderBy: byOrder }),
  ["faqs"],
  { tags: [CACHE_TAGS.faq] }
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
