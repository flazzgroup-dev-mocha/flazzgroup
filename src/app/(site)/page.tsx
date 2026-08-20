import type { Metadata } from "next";

import { getHomepageData, getSettings } from "@/lib/queries";
import { RSS_ALTERNATE, resolveSocialImage } from "@/lib/seo";
import { getLatestPosts } from "@/lib/blog/queries";
import { buildHeaderLinks, buildNavLinks, primaryTargetId } from "@/lib/site-nav";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { GamesSection } from "@/components/sections/GamesSection";
import { ProductsSection } from "@/components/sections/ProductsSection";
import { PopularSection } from "@/components/sections/PopularSection";
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
 * Title and description come from the root layout, which reads them out of the
 * settings row. The canonical and the social card are declared here.
 */

/**
 * The homepage's own card, stated rather than inherited.
 *
 * Inheriting it did not work, and the reason is a Next rule that is easy to
 * miss: a file-based `opengraph-image.tsx` **outranks** whatever
 * `openGraph.images` the metadata sets for the same route segment. So the root
 * layout's image was overruled here by `app/opengraph-image.tsx` — but only for
 * Open Graph. `twitter:image` has no file convention competing with it, so it
 * kept the layout's value.
 *
 * The homepage therefore advertised two different pictures: a generated
 * 1200×630 card to Facebook and WhatsApp, and the brand PNG to X. Declaring
 * both here from one `resolveSocialImage` call is what makes the two agree.
 *
 * Everything the root sets on `openGraph` is repeated, because a route that
 * declares the object replaces the parent's outright — omitting `siteName` or
 * `locale` deletes them rather than inheriting them.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const title = settings.seoTitle || settings.siteName;
  const description = settings.seoDescription || settings.siteDescription;
  const image = resolveSocialImage(settings);

  return {
    alternates: { canonical: "/", ...RSS_ALTERNATE },
    openGraph: {
      type: "website",
      locale: "id_ID",
      url: settings.siteUrl,
      siteName: settings.siteName,
      title,
      description,
      images: [{ url: image, alt: settings.siteName }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

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
    games,
    topUpGame,
    popular,
    products,
    brands,
    features,
    payments,
    community,
    faqs,
  } = await getHomepageData();

  /**
   * One slot, one mode.
   *
   * The homepage's main section is either the game picker or the top-up
   * catalogue, never both and never neither. It used to be two independent
   * switches, and production had reached the state that proves why that was
   * wrong: `showGames` was off and the catalogue had already moved to its own
   * page, so the middle of the homepage rendered nothing at all.
   *
   * TOP_UP falls back to the picker when no game owns the catalogue, because
   * "show the catalogue" is not a request anything can honour when there is no
   * game to show one for — and an empty middle is how this started.
   */
  const catalogueGame =
    settings.homepageMode === "TOP_UP" && products.length > 0 ? topUpGame : null;

  const latestPosts = await getLatestPosts(3);

  const navLinks = buildNavLinks(settings, topUpGame);

  return (
    <>
      <StructuredData
        settings={settings}
        brands={settings.showBrands ? brands : []}
        faqs={settings.showFaq ? faqs : []}
      />

      {/* The skip link now lives in the (site) layout, which puts one on every
          public page instead of only this one. */}
      <Navbar
        siteName={settings.siteName}
        logoUrl={settings.logoUrl}
        tickerEnabled={settings.tickerEnabled}
        tickerText={settings.tickerText}
        links={buildHeaderLinks(settings, topUpGame)}
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
        {catalogueGame ? (
          /*
            TOP_UP mode: the catalogue itself, from the same component and the
            same rows the game page renders. `ProductsSection` carries the
            `#royal-dream` anchor, which is why the standalone span below is
            rendered only in the other mode — two elements with one id is an
            invalid document and the fragment would resolve to whichever the
            browser saw first.
          */
          <ProductsSection products={products} gameName={catalogueGame.name} />
        ) : (
          <>
            {/*
              Legacy anchor.

              Brand rows, community links and hero slides written before the
              game picker existed point at `#royal-dream`, which used to be the
              coin grid on this page. Those rows are production data and cannot
              be rewritten from here, so the fragment keeps resolving — to the
              picker, which is now the way into the same top-up.
            */}
            <span id="royal-dream" aria-hidden className="block scroll-mt-28" />
            <GamesSection games={games} />
          </>
        )}
        {settings.showPopular ? <PopularSection services={popular} /> : null}
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
