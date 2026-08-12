import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock3, Tag as TagIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getBrands, getCommunityLinks, getSettings } from "@/lib/queries";
import { buildHeaderLinks, buildNavLinks, primaryTargetId } from "@/lib/site-nav";
import {
  getAdjacentPosts,
  getPostBySlug,
  getRelatedPosts,
} from "@/lib/blog/queries";
import { withHeadingAnchors } from "@/lib/blog/content";
import { RSS_ALTERNATE, resolveSocialImage } from "@/lib/seo";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/blog/PostCard";
import { ReadingProgress } from "@/components/blog/ReadingProgress";
import { ShareBar } from "@/components/blog/ShareBar";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { ArticleSchema } from "@/components/blog/ArticleSchema";
import { ArticleEngagement } from "@/components/analytics/ArticleEngagement";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { SITE_TIME_ZONE } from "@/lib/utils";

export const revalidate = 3600;

/**
 * Pre-renders the published archive at build time. New articles are still
 * served — Next renders them on first request and caches the result.
 */
export async function generateStaticParams() {
  const posts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED", publishedAt: { not: null, lte: new Date() } },
    select: { slug: true },
    orderBy: { publishedAt: "desc" },
    take: 200,
  });

  return posts.map((post) => ({ slug: post.slug }));
}

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  timeZone: SITE_TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [post, settings] = await Promise.all([getPostBySlug(slug), getSettings()]);

  if (!post) {
    return { title: "Artikel tidak ditemukan", robots: { index: false, follow: true } };
  }

  const base = settings.siteUrl.replace(/\/$/, "");
  const url = `${base}/blog/${post.slug}`;
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;

  /**
   * The social card, which is never an SVG, never absent, and never the 2 MB
   * original — the three rules now live in `resolveSocialImage`, because the
   * archive and the static pages need exactly the same ones and each had been
   * getting a different subset right. See lib/seo.ts.
   */
  const image = resolveSocialImage(settings, post.featuredImage);

  return {
    title,
    description,
    // A canonical set by the author wins; otherwise this URL is the original.
    alternates: {
      canonical: post.canonicalUrl || `/blog/${post.slug}`,
      ...RSS_ALTERNATE,
    },
    ...(post.focusKeyword ? { keywords: [post.focusKeyword] } : {}),
    authors: post.author ? [{ name: post.author.name }] : undefined,
    robots: post.noIndex
      ? { index: false, follow: true }
      : { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      siteName: settings.siteName,
      locale: "id_ID",
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: post.author ? [post.author.name] : undefined,
      section: post.category?.name,
      tags: post.tags.map((tag) => tag.name),
      images: [{ url: image, alt: post.featuredImageAlt || post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  // A draft, a scheduled post or a bad slug all land here identically —
  // nothing reveals that an unpublished article exists.
  if (!post) notFound();

  const [settings, brands, community, related, adjacent] = await Promise.all([
    getSettings(),
    getBrands(),
    getCommunityLinks(),
    getRelatedPosts(post.id, post.categoryId),
    post.publishedAt ? getAdjacentPosts(post.publishedAt) : { previous: null, next: null },
  ]);

  const navLinks = buildNavLinks(settings);
  const base = settings.siteUrl.replace(/\/$/, "");
  const url = `${base}/blog/${post.slug}`;

  // Heading ids are injected here rather than stored, so renaming a heading
  // never leaves a stale anchor in the database.
  const { html, toc } = withHeadingAnchors(post.content);

  return (
    <>
      <ReadingProgress />

      <Navbar
        siteName={settings.siteName}
        logoUrl={settings.logoUrl}
        tickerEnabled={settings.tickerEnabled}
        tickerText={settings.tickerText}
        links={buildHeaderLinks(settings)}
        searchTargetId={primaryTargetId(settings)}
      />

      <ArticleSchema post={post} settings={settings} url={url} />

      {/* blog_view, scroll depth and engaged time. Renders nothing. */}
      <ArticleEngagement
        itemId={post.id}
        itemName={post.title}
        readingMinutes={post.readingMinutes}
        category={post.category?.name}
        author={post.author?.name}
      />

      <main id="main" className="relative pt-24 pb-8 sm:pt-28">
        <article>
          {/* ------------------------------------------------------- hero */}
          <header className="mx-auto mt-10 max-w-6xl px-4 sm:px-6 lg:mt-14">
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex flex-wrap items-center gap-2 font-mono text-[.62rem] tracking-[.14em] text-fog uppercase">
                <li>
                  <Link href="/" className="hover:text-gold">
                    Beranda
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li>
                  <Link href="/blog" className="hover:text-gold">
                    Blog
                  </Link>
                </li>
                {post.category ? (
                  <>
                    <li aria-hidden>/</li>
                    <li>
                      <TrackedLink
                        href={`/blog?kategori=${post.category.slug}`}
                        className="hover:text-gold"
                        event="blog_category_click"
                        params={{
                          item_id: post.category.slug,
                          item_name: post.category.name,
                          location: "article_breadcrumb",
                        }}
                      >
                        {post.category.name}
                      </TrackedLink>
                    </li>
                  </>
                ) : null}
              </ol>
            </nav>

            {post.category ? (
              <TrackedLink
                href={`/blog?kategori=${post.category.slug}`}
                className="inline-flex rounded-full bg-gold/90 px-3.5 py-1.5 font-mono text-[.62rem] font-bold tracking-[.16em] text-ink uppercase transition-transform hover:-translate-y-0.5"
                event="blog_category_click"
                params={{
                  item_id: post.category.slug,
                  item_name: post.category.name,
                  location: "article_header",
                }}
              >
                {post.category.name}
              </TrackedLink>
            ) : null}

            <h1 className="mt-5 text-3xl leading-[1.12] font-bold sm:text-4xl lg:text-[2.85rem]">
              {post.title}
            </h1>

            {post.excerpt ? (
              <p className="mt-5 text-base leading-relaxed text-mist sm:text-lg">
                {post.excerpt}
              </p>
            ) : null}

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 border-y border-white/8 py-4">
              {post.author ? (
                <span className="flex items-center gap-2.5">
                  {post.author.avatarUrl ? (
                    <Image
                      src={post.author.avatarUrl}
                      alt=""
                      aria-hidden
                      width={36}
                      height={36}
                      unoptimized={post.author.avatarUrl.endsWith(".svg")}
                      className="size-9 rounded-full border border-white/10"
                    />
                  ) : null}
                  <span className="text-sm font-semibold text-foam">
                    {post.author.name}
                  </span>
                </span>
              ) : null}

              {post.publishedAt ? (
                <time
                  dateTime={post.publishedAt.toISOString()}
                  className="font-mono text-[.68rem] tracking-wide text-fog uppercase"
                >
                  {dateFormat.format(post.publishedAt)}
                </time>
              ) : null}

              <span className="inline-flex items-center gap-1.5 font-mono text-[.68rem] tracking-wide text-fog uppercase">
                <Clock3 className="size-3.5" aria-hidden />
                {post.readingMinutes} menit baca
              </span>

              <div className="ml-auto">
                <ShareBar url={url} title={post.title} postId={post.id} />
              </div>
            </div>
          </header>

          {post.featuredImage ? (
            <div className="mx-auto mt-10 max-w-6xl px-4 sm:px-6 lg:mt-14">
              <div className="glass seam relative aspect-16/9 overflow-hidden rounded-[1.5rem]">
                <Image
                  src={post.featuredImage}
                  alt={post.featuredImageAlt || post.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 896px"
                  unoptimized={post.featuredImage.endsWith(".svg")}
                  className="object-cover"
                />
              </div>
            </div>
          ) : null}

          {/* ---------------------------------------------------- content */}
          <div className="mx-auto mt-10 max-w-6xl px-4 sm:px-6 lg:mt-14">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-12">
              <div className="min-w-0 lg:order-1">
                {/* Sanitised on write and again by the schema on save, so this
                    HTML is never raw editor output. */}
                <div
                  className="article-body"
                  dangerouslySetInnerHTML={{ __html: html }}
                />

                {post.tags.length > 0 ? (
                  <div className="mt-12 flex flex-wrap items-center gap-2 border-t border-white/8 pt-6">
                    <TagIcon className="size-4 text-fog" aria-hidden />
                    {post.tags.map((tag) => (
                      <span
                        key={tag.slug}
                        className="glass-soft rounded-full px-3 py-1.5 text-xs text-mist"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                ) : null}

                {/* Author bio — feeds the Person schema and E-E-A-T signals */}
                {post.author?.bio ? (
                  <aside className="glass seam mt-8 flex flex-wrap items-start gap-4 rounded-[1.35rem] p-5 sm:p-6">
                    {post.author.avatarUrl ? (
                      <Image
                        src={post.author.avatarUrl}
                        alt=""
                        aria-hidden
                        width={56}
                        height={56}
                        unoptimized={post.author.avatarUrl.endsWith(".svg")}
                        className="size-14 rounded-2xl border border-white/10"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[.6rem] tracking-[.18em] text-gold uppercase">
                        Ditulis oleh
                      </p>
                      <p className="mt-1 text-base font-bold text-foam">
                        {post.author.name}
                      </p>
                      <p className="mt-1.5 text-sm text-mist">{post.author.bio}</p>
                    </div>
                  </aside>
                ) : null}

                {/* CTA back into the product */}
                {/* `relative` matters: .glass sets no position, so without it
                    the blur below resolves against <main> and the glow lands at
                    the top of the article instead of behind this card. */}
                <aside className="glass seam relative mt-6 overflow-hidden rounded-[1.35rem] p-6 text-center sm:p-8">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 -top-16 mx-auto h-40 w-72 rounded-full bg-gold/15 blur-[70px]"
                  />
                  <p className="relative z-10 text-lg font-bold text-foam sm:text-xl">
                    Siap top up Royal Dream?
                  </p>
                  <p className="relative z-10 mx-auto mt-2 max-w-md text-sm text-mist">
                    Proses instan, harga transparan, admin aktif 24 jam.
                  </p>
                  <div className="relative z-10 mt-5 flex flex-wrap justify-center gap-3">
                    <Button variant="gold" size="lg" asChild>
                      <Link href="/#royal-dream">
                        Lihat harga koin
                        <ArrowRight aria-hidden />
                      </Link>
                    </Button>
                    {settings.telegramUrl ? (
                      <Button variant="glass" size="lg" asChild>
                        {/* Tracked: this is the article's conversion, and
                            without it the blog reads as traffic that never
                            contacts anyone. */}
                        <TrackedLink
                          href={settings.telegramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          event="contact_telegram"
                          params={{
                            location: "article_cta",
                            destination: settings.telegramUrl,
                            item_name: post.title,
                          }}
                        >
                          Tanya admin
                        </TrackedLink>
                      </Button>
                    ) : null}
                  </div>
                </aside>

                {/* Previous / next */}
                {adjacent.previous || adjacent.next ? (
                  <nav
                    aria-label="Artikel lain"
                    className="mt-6 grid gap-3 sm:grid-cols-2"
                  >
                    {adjacent.previous ? (
                      <Link
                        href={`/blog/${adjacent.previous.slug}`}
                        rel="prev"
                        className="glass seam lift group rounded-2xl p-5"
                      >
                        <span className="flex items-center gap-2 font-mono text-[.6rem] tracking-[.18em] text-fog uppercase">
                          <ArrowLeft className="size-3" aria-hidden />
                          Sebelumnya
                        </span>
                        <span className="mt-2 block text-sm font-semibold text-foam group-hover:text-gold">
                          {adjacent.previous.title}
                        </span>
                      </Link>
                    ) : (
                      <span />
                    )}

                    {adjacent.next ? (
                      <Link
                        href={`/blog/${adjacent.next.slug}`}
                        rel="next"
                        className="glass seam lift group rounded-2xl p-5 sm:text-right"
                      >
                        <span className="flex items-center gap-2 font-mono text-[.6rem] tracking-[.18em] text-fog uppercase sm:justify-end">
                          Berikutnya
                          <ArrowRight className="size-3" aria-hidden />
                        </span>
                        <span className="mt-2 block text-sm font-semibold text-foam group-hover:text-gold">
                          {adjacent.next.title}
                        </span>
                      </Link>
                    ) : null}
                  </nav>
                ) : null}
              </div>

              {/* Sticky sidebar */}
              <aside className="lg:order-2">
                <div className="lg:sticky lg:top-28 lg:grid lg:gap-4">
                  <TableOfContents entries={toc} />

                  <Button variant="glass" size="sm" asChild className="w-full">
                    <Link href="/blog">
                      <ArrowLeft aria-hidden />
                      Kembali ke blog
                    </Link>
                  </Button>
                </div>
              </aside>
            </div>
          </div>
        </article>

        {/* -------------------------------------------------------- related */}
        {related.length > 0 ? (
          <section
            aria-labelledby="related-heading"
            className="mx-auto mt-16 max-w-7xl px-4 sm:mt-20 sm:px-6 lg:px-8"
          >
            <div className="rule-gold mb-10 opacity-60" />
            <h2 id="related-heading" className="text-2xl font-bold sm:text-3xl">
              Artikel <span className="text-royal">terkait</span>
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item, index) => (
                <PostCard
                  key={item.id}
                  post={item}
                  trackAs={{
                    event: "related_article_click",
                    params: {
                      from_item_id: post.id,
                      item_id: item.id,
                      item_name: item.title,
                      position: index + 1,
                    },
                  }}
                />
              ))}
            </div>
          </section>
        ) : null}
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
