import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

import { getSettings } from "@/lib/queries";
import { RSS_ALTERNATE, resolveSocialImage } from "@/lib/seo";
import { buildBlogPath, parseBlogParams, requestedBlogPath } from "@/lib/blog/params";
import { buildHeaderLinks, buildNavLinks, primaryTargetId } from "@/lib/site-nav";
import {
  getCategories,
  getLatestPosts,
  listPosts,
  searchPosts,
  type PostCard as PostCardData,
} from "@/lib/blog/queries";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PostCard } from "@/components/blog/PostCard";
import { ArchiveSchema } from "@/components/blog/ArchiveSchema";
import { SearchTracker } from "@/components/analytics/SearchTracker";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { getBrands, getCommunityLinks } from "@/lib/queries";

/** ISR: the archive rebuilds on demand via tags, and hourly regardless. */
export const revalidate = 3600;

type SearchParams = Promise<{ page?: string; q?: string; kategori?: string }>;

/**
 * Category archives are real, indexable pages — the sitemap lists them — so
 * each one has to carry its own title, description and self-referencing
 * canonical. Pointing every variant at a bare `/blog` (which is what a single
 * hard-coded canonical did) tells Google the category URLs it was just handed
 * are duplicates, and it drops them from the index.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const [settings, categories, params, latest] = await Promise.all([
    getSettings(),
    getCategories(),
    searchParams,
    // Cached and already read by the page body — this costs no extra query.
    getLatestPosts(1),
  ]);

  const { page, query, categorySlug } = parseBlogParams(params);
  const category = categorySlug
    ? categories.find((item) => item.slug === categorySlug)
    : undefined;

  const base = category
    ? `${category.name} — Blog`
    : "Blog — Panduan & Tips Top Up Game";
  const title = page > 1 ? `${base} — Halaman ${page}` : base;

  /**
   * A category with no description of its own still gets a description of its
   * own.
   *
   * Falling straight through to the archive's generic sentence meant
   * `/blog?kategori=chip-and-koin` and `/blog` shipped byte-identical
   * `<meta name="description">` while both claimed to be canonical, indexable
   * pages — the textbook shape of a duplicate that Google resolves by picking
   * one and dropping the other. Naming the category makes each archive
   * describe itself, and costs nothing when an editor later writes a real
   * description in the admin panel, because that still wins.
   */
  const description =
    category?.description ||
    (category
      ? `Kumpulan artikel ${category.name} dari FLAZZ GROUP: panduan top up Royal Dream, tips bermain, dan penjelasan metode pembayaran.`
      : "Panduan top up Royal Dream, tips bermain, dan penjelasan metode pembayaran. Ditulis oleh tim yang menangani ribuan transaksi setiap bulan.");

  const path = buildBlogPath(page, category ? category.slug : "", "");

  /**
   * An archive with nothing in it must not be indexed.
   *
   * Out-of-range pages now 404 outright, so the only way to reach an empty
   * page-one is a blog with no published articles at all — a real state on a
   * fresh deploy, and one Google would file as a soft 404. The count is free
   * here: `getCategories` already carries it.
   */
  const publishedCount = category
    ? category._count.posts
    : categories.reduce((total, item) => total + item._count.posts, 0);

  /**
   * The archive's social card.
   *
   * Declaring `openGraph` here replaces the root's object outright rather than
   * merging into it, so leaving the image out did not inherit the site card —
   * it removed it. `/blog` and every category archive were shipping `og:title`
   * and `og:description` with no `og:image` at all, which is why a link to the
   * blog previewed as a bare line of text on WhatsApp and Telegram. The article
   * page already had this right; the archive did not.
   *
   * The newest post's featured image is used when there is one — it is the
   * picture a reader sees at the top of the archive — falling back to the
   * site-wide card.
   */
  const image = resolveSocialImage(settings, latest[0]?.featuredImage);

  return {
    title,
    description,
    alternates: { canonical: path, ...RSS_ALTERNATE },
    openGraph: {
      type: "website",
      title: `${title} | ${settings.siteName}`,
      description,
      url: `${settings.siteUrl.replace(/\/$/, "")}${path}`,
      siteName: settings.siteName,
      locale: "id_ID",
      images: [{ url: image, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
    /**
     * Search results are thin and unbounded, and an empty archive has nothing
     * to rank. `follow` stays on in both cases so the links out are still
     * crawled.
     */
    robots:
      query || publishedCount === 0
        ? { index: false, follow: true }
        : { index: true, follow: true },
  };
}

function Pagination({
  page,
  pageCount,
  query,
}: {
  page: number;
  pageCount: number;
  query: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;

  const href = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) search.set(key, value);
    }
    if (target > 1) search.set("page", String(target));
    const qs = search.toString();
    return qs ? `/blog?${qs}` : "/blog";
  };

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === pageCount || Math.abs(n - page) <= 1
  );

  return (
    <nav aria-label="Navigasi halaman" className="mt-12 flex items-center justify-center gap-2">
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          rel="prev"
          aria-label="Halaman sebelumnya"
          className="glass-soft grid size-10 place-items-center rounded-full text-mist transition-colors hover:border-gold/45 hover:text-gold"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Link>
      ) : null}

      {pages.map((n, index) => {
        const previous = pages[index - 1];
        const gap = previous && n - previous > 1;

        return (
          <span key={n} className="flex items-center gap-2">
            {gap ? <span className="text-fog">…</span> : null}
            <Link
              href={href(n)}
              aria-current={n === page ? "page" : undefined}
              className={cn(
                "grid size-10 place-items-center rounded-full font-mono text-sm transition-colors",
                n === page
                  ? "bg-gold font-bold text-ink"
                  : "glass-soft text-mist hover:border-gold/45 hover:text-gold"
              )}
            >
              {n}
            </Link>
          </span>
        );
      })}

      {page < pageCount ? (
        <Link
          href={href(page + 1)}
          rel="next"
          aria-label="Halaman berikutnya"
          className="glass-soft grid size-10 place-items-center rounded-full text-mist transition-colors hover:border-gold/45 hover:text-gold"
        >
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : null}
    </nav>
  );
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const parsedParams = parseBlogParams(params);
  const { page, query, categorySlug } = parsedParams;

  /**
   * A URL that says the same thing as a shorter one is redirected to it.
   *
   * `?page=1`, `?page=abc`, `?page=0`, `?q=` and a mistyped category all
   * normalise away here, which is what stops them existing as separate
   * indexable URLs — and, for the malformed page numbers, what stops them
   * reaching Prisma's `skip` at all. Permanent, because none of these forms
   * will ever be the right address for this content.
   */
  if (parsedParams.canonicalPath !== requestedBlogPath(params)) {
    permanentRedirect(parsedParams.canonicalPath);
  }

  // Syntactically valid but past anything that could exist. Answered without
  // touching the database, so a crawler walking page numbers costs nothing.
  if (parsedParams.beyondLimit) notFound();

  const [settings, categories, brands, community] = await Promise.all([
    getSettings(),
    getCategories(),
    getBrands(),
    getCommunityLinks(),
  ]);

  if (categorySlug && !categories.some((c) => c.slug === categorySlug)) {
    notFound();
  }

  let posts: PostCardData[];
  let pageCount = 1;
  let total = 0;

  if (query) {
    posts = await searchPosts(query);
    total = posts.length;
  } else {
    const result = await listPosts({ page, categorySlug });
    posts = result.posts;
    pageCount = result.pageCount;
    total = result.total;
  }

  /**
   * Past the end of the archive is a 404, not an empty page.
   *
   * Serving 200 with "no articles" gave every page number its own indexable,
   * self-canonicalising URL — an unbounded set of soft 404s, which Google
   * treats as a quality signal against the whole site. Page 1 is exempt: an
   * archive that is genuinely empty is still the archive.
   */
  if (!query && page > 1 && page > pageCount) notFound();

  const navLinks = buildNavLinks(settings);
  const activeCategory = categories.find((c) => c.slug === categorySlug);

  /**
   * Structured data is emitted for the real archive only. A search result and
   * an empty archive both carry `noindex` (see generateMetadata), and
   * describing a page to a crawler that has been asked not to index it is
   * noise — it also risks an ItemList of search hits being read as the site's
   * own collection.
   */
  const describable = !query && posts.length > 0;

  return (
    <>
      {describable ? (
        <ArchiveSchema
          settings={settings}
          posts={posts}
          path={buildBlogPath(page, categorySlug, "")}
          title={activeCategory ? activeCategory.name : "Blog FLAZZ GROUP"}
          // Kept in step with the `<meta name="description">` built in
          // generateMetadata — structured data that contradicts the metadata on
          // the same page is worse than structured data that is absent.
          description={
            activeCategory?.description ||
            (activeCategory
              ? `Kumpulan artikel ${activeCategory.name} dari FLAZZ GROUP: panduan top up Royal Dream, tips bermain, dan penjelasan metode pembayaran.`
              : "Panduan top up Royal Dream, tips bermain, dan penjelasan metode pembayaran. Ditulis oleh tim yang menangani ribuan transaksi setiap bulan.")
          }
          category={
            activeCategory
              ? { name: activeCategory.name, slug: activeCategory.slug }
              : undefined
          }
        />
      ) : null}

      <Navbar
        siteName={settings.siteName}
        logoUrl={settings.logoUrl}
        tickerEnabled={settings.tickerEnabled}
        tickerText={settings.tickerText}
        links={buildHeaderLinks(settings)}
        searchTargetId={primaryTargetId(settings)}
      />

      <main id="main" className="relative pt-28 pb-8 sm:pt-32">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-96 w-[46rem] max-w-full rounded-full bg-volt/12 blur-[130px]"
        />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <header className="max-w-3xl">
            <span className="eyebrow">
              <span className="size-1.5 rounded-full bg-gold shadow-[0_0_10px_#FFD54A]" />
              Blog
            </span>
            <h1 className="mt-3 text-3xl leading-[1.08] font-bold sm:text-4xl lg:text-5xl">
              {activeCategory ? (
                <>
                  {activeCategory.name}
                </>
              ) : (
                <>
                  Panduan &amp; tips <span className="text-royal">top up game</span>
                </>
              )}
            </h1>
            <p className="mt-4 text-sm text-mist sm:text-base">
              {activeCategory?.description ||
                "Ditulis oleh tim yang menangani ribuan transaksi Royal Dream setiap bulan."}
            </p>
          </header>

          {/* Search + category filter */}
          <div className="mt-8 flex flex-col gap-4">
            <form action="/blog" role="search" className="relative max-w-md">
              <label htmlFor="blog-search" className="sr-only">
                Cari artikel
              </label>
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-fog"
              />
              <input
                id="blog-search"
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Cari artikel…"
                className="glass-soft h-12 w-full rounded-full pr-4 pl-11 text-sm text-foam placeholder:text-fog focus:border-volt/60 focus:outline-none"
              />
            </form>

            <ul className="flex flex-wrap gap-2">
              <li>
                <Link
                  href="/blog"
                  aria-current={!categorySlug && !query ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-9 items-center rounded-full px-4 text-sm font-medium transition-colors",
                    !categorySlug && !query
                      ? "bg-gold text-ink"
                      : "glass-soft text-mist hover:border-gold/45 hover:text-gold"
                  )}
                >
                  Semua
                </Link>
              </li>
              {categories
                .filter((category) => category._count.posts > 0)
                .map((category) => (
                  <li key={category.id}>
                    <TrackedLink
                      href={`/blog?kategori=${category.slug}`}
                      aria-current={categorySlug === category.slug ? "page" : undefined}
                      event="blog_category_click"
                      params={{
                        item_id: category.slug,
                        item_name: category.name,
                        location: "blog_filter",
                      }}
                      className={cn(
                        "inline-flex min-h-9 items-center rounded-full px-4 text-sm font-medium transition-colors",
                        categorySlug === category.slug
                          ? "bg-gold text-ink"
                          : "glass-soft text-mist hover:border-gold/45 hover:text-gold"
                      )}
                    >
                      {category.name}
                      <span className="ml-2 font-mono text-[.62rem] opacity-70">
                        {category._count.posts}
                      </span>
                    </TrackedLink>
                  </li>
                ))}
            </ul>
          </div>

          {/* Results */}
          {posts.length === 0 ? (
            <div className="glass mt-10 grid place-items-center gap-3 rounded-3xl px-6 py-20 text-center">
              <p className="text-lg font-bold text-foam">Belum ada artikel</p>
              <p className="max-w-md text-sm text-mist">
                {query
                  ? `Tidak ada artikel yang cocok dengan “${query}”. Coba kata kunci lain.`
                  : "Artikel baru akan muncul di sini."}
              </p>
              {query ? (
                <Link
                  href="/blog"
                  className="mt-2 text-sm font-semibold text-gold hover:underline"
                >
                  Lihat semua artikel
                </Link>
              ) : null}
            </div>
          ) : (
            <>
              {query ? <SearchTracker term={query} resultsCount={total} /> : null}

              {query ? (
                <p className="mt-8 font-mono text-[.7rem] tracking-wide text-fog uppercase">
                  {total} hasil untuk “{query}”
                </p>
              ) : null}

              <h2 className="sr-only">
                {query ? "Hasil pencarian" : activeCategory ? activeCategory.name : "Semua artikel"}
              </h2>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((post, index) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    priority={index < 3}
                    trackAs={
                      query
                        ? {
                            event: "search_result_click",
                            params: {
                              search_term: query,
                              item_id: post.id,
                              item_name: post.title,
                              position: index + 1,
                            },
                          }
                        : undefined
                    }
                  />
                ))}
              </div>

              {!query ? (
                <Pagination
                  page={page}
                  pageCount={pageCount}
                  query={{ kategori: categorySlug }}
                />
              ) : null}
            </>
          )}
        </div>
      </main>

      <Footer
        settings={settings}
        navLinks={navLinks}
        brands={brands}
        community={community}
      />
    </>
  );
}
