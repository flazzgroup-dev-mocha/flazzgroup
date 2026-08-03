import type { Metadata } from "next";

import { getHomepageData } from "@/lib/queries";
import { RSS_ALTERNATE } from "@/lib/seo";
import { getLatestPosts } from "@/lib/blog/queries";
import { buildNavLinks, primaryTargetId } from "@/lib/site-nav";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { PopularSection } from "@/components/sections/PopularSection";
import { ProductsSection } from "@/components/sections/ProductsSection";
import { BrandsSection } from "@/components/sections/BrandsSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { PaymentSection } from "@/components/sections/PaymentSection";
import { CommunitySection } from "@/components/sections/CommunitySection";
import { FAQSection } from "@/components/sections/FAQSection";
import { BlogSection } from "@/components/sections/BlogSection";
import { StructuredData } from "@/components/common/StructuredData";

/**
 * Cached HTML, invalidated by tag.
 *
 * Every query in lib/queries.ts is tagged, and each admin write calls
 * revalidateTag, so a saved change drops the cached render and the next
 * request rebuilds it. Keeping the page cacheable also means metadata is
 * emitted into <head> rather than streamed into the body, which is what
 * link-preview scrapers and auditing tools read.
 *
 * Title, description and social cards come from the root layout, which reads
 * them out of the settings row. Only the canonical is declared here.
 */
export const metadata: Metadata = {
  alternates: { canonical: "/", ...RSS_ALTERNATE },
};

/**
 * Tag invalidation is the fast path; this is the floor underneath it.
 *
 * Two things on this page depend on the clock rather than on an admin action:
 * the latest-articles strip, which must start showing a post the moment its
 * scheduled time passes, and the copyright year in the footer. Neither fires a
 * `revalidateTag`, so without a time bound they stay frozen at whatever the
 * last build or last content edit produced — a scheduled post would appear
 * only when somebody happened to save something unrelated.
 *
 * Admin edits are unaffected: `revalidateTag` purges the entry immediately,
 * whatever is left of this window.
 */
export const revalidate = 300;

export default async function HomePage() {
  const {
    settings,
    banners,
    bannerAspectRatio,
    heroStats,
    popular,
    products,
    brands,
    features,
    payments,
    community,
    faqs,
  } = await getHomepageData();

  const latestPosts = await getLatestPosts(3);

  const navLinks = buildNavLinks(settings);

  return (
    <>
      <StructuredData
        settings={settings}
        brands={settings.showBrands ? brands : []}
        products={settings.showProducts ? products : []}
        faqs={settings.showFaq ? faqs : []}
      />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:rounded-full focus:bg-gold focus:px-5 focus:py-3 focus:text-sm focus:font-bold focus:text-ink"
      >
        Lewati ke konten utama
      </a>

      <Navbar
        siteName={settings.siteName}
        logoUrl={settings.logoUrl}
        tickerEnabled={settings.tickerEnabled}
        tickerText={settings.tickerText}
        links={navLinks}
        searchTargetId={primaryTargetId(settings)}
      />

      <main id="main" className="relative">
        {/* The hero is artwork now, so the page's only heading has to be
            written here — an <img> alt is not a heading, and a homepage with
            no <h1> is a real gap for search engines and for anyone navigating
            by headings. */}
        <h1 className="sr-only">{settings.seoTitle || settings.siteName}</h1>

        {settings.showHero ? (
          <Hero
            banners={banners}
            stats={heroStats}
            aspectRatio={bannerAspectRatio}
          />
        ) : null}
        {settings.showPopular ? <PopularSection services={popular} /> : null}
        {settings.showProducts ? <ProductsSection products={products} /> : null}
        {settings.showBrands ? <BrandsSection brands={brands} /> : null}
        {settings.showFeatures ? <FeaturesSection features={features} /> : null}
        {settings.showPayment ? <PaymentSection methods={payments} /> : null}
        {settings.showCommunity ? <CommunitySection links={community} /> : null}
        <BlogSection posts={latestPosts} />
        {settings.showFaq ? (
          <FAQSection faqs={faqs} supportUrl={settings.telegramUrl} />
        ) : null}
      </main>

      <Footer
        settings={settings}
        navLinks={navLinks}
        brands={settings.showBrands ? brands : []}
        community={settings.showCommunity ? community : []}
      />
    </>
  );
}
