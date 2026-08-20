import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Info } from "lucide-react";

import {
  getGameBySlug,
  getProducts,
  getSettings,
  getTopUpGame,
  type GameCard,
  type Settings,
} from "@/lib/queries";
import { listPosts } from "@/lib/blog/queries";
import { staticPageMetadata } from "@/lib/seo";
import { ROYAL_DREAM_SLUG, topUpPath } from "@/lib/games";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/PageShell";
import { PageHero } from "@/components/common/PageHero";
import { PageSchema } from "@/components/common/PageSchema";
import { CatalogSchema } from "@/components/common/CatalogSchema";
import { ProductsSection } from "@/components/sections/ProductsSection";
import { PostCard } from "@/components/blog/PostCard";
import { Reveal } from "@/components/common/Reveal";

/**
 * A game's page.
 *
 * One route for every game, and the row decides which of two pages it is:
 *
 *   topUpEnabled  the top-up catalogue — the same section, the same component
 *                 and the same rows the site has always served at
 *                 /top-up/royal-dream. Nothing about the amounts, the prices,
 *                 the badges or the buttons is different; only the file that
 *                 renders them moved.
 *
 *   otherwise     an information page that says, in as many words, that
 *                 ordering for this game is not open here yet. No amounts, no
 *                 prices and no button that behaves like a checkout — a page
 *                 that mimicked one would describe a service that does not
 *                 exist.
 *
 * The page answers for a hidden game too. Hiding a game takes it out of the
 * picker; it does not un-publish a URL that ads and bookmarks already point
 * at, and a 404 there is a broken ad rather than a tidy site. Such a page is
 * marked `noindex` instead — see `isIndexable`.
 */

/**
 * The floor under tag invalidation, as everywhere else: a product or game edit
 * purges this render immediately through its tag, and the copyright year in
 * the footer still turns over on its own.
 */
export const revalidate = 3600;

type Params = { params: Promise<{ slug: string }> };

/**
 * The game behind a URL, or the fallback that keeps the launch URL alive.
 *
 * `/top-up/royal-dream` has been in ads, in the sitemap and in bookmarks. If
 * that row is ever renamed or deleted the URL must still serve the catalogue
 * rather than a 404, so this one slug falls back to whichever game owns the
 * top-up. Every other slug is its row or nothing — the fallback is a promise
 * about one published URL, not a licence to special-case Royal Dream.
 */
async function resolveGame(slug: string) {
  const game = await getGameBySlug(slug);
  if (game) return game;
  if (slug === ROYAL_DREAM_SLUG) return getTopUpGame();
  return null;
}

/**
 * Whether this page is worth putting in the index.
 *
 * A catalogue page has real content by construction. An information page has
 * it only once somebody has written the "about" copy — without it the page is
 * a name, a picture and a notice, which is what a thin doorway page is, and
 * asking Google to index a shelf of those is how a site's good pages get
 * dragged down with them.
 *
 * A hidden game is excluded whatever it says: the site has stopped linking to
 * it, so recommending it would be recommending a page with no way in.
 */
function isIndexable(game: Pick<GameCard, "isActive" | "topUpEnabled" | "about">) {
  if (!game.isActive) return false;
  return game.topUpEnabled || game.about.trim().length > 0;
}

/** Written once, because the page and its metadata must not disagree. */
function catalogDescription(name: string) {
  return `Halaman top up ${name} FLAZZ GROUP. Pilih nominal yang kamu butuhkan, lanjutkan ke kanal resmi, dan pesanan diproses setelah pembayaran diterima.`;
}

function infoDescription(name: string) {
  return `Informasi dan panduan top up ${name} dari FLAZZ GROUP. Halaman pemesanan untuk game ini belum tersedia — di sini kamu bisa membaca informasinya lebih dulu.`;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const game = await resolveGame(slug);

  if (!game) return { title: "Halaman tidak ditemukan" };

  /**
   * The title states what the page is, not what we would like it to be. A game
   * with no ordering here gets "Informasi Top Up …": writing "Top Up Mobile
   * Legends" over a page that cannot take an order is exactly the claim this
   * release exists to stop making.
   */
  const title = game.topUpEnabled
    ? `Top Up ${game.name} | FLAZZ GROUP`
    : `Informasi Top Up ${game.name} | FLAZZ GROUP`;

  const description = game.topUpEnabled
    ? catalogDescription(game.name)
    : infoDescription(game.name);

  const base = await staticPageMetadata({
    title,
    description,
    path: topUpPath(game.slug),
  });

  // Canonical, Open Graph and the rest are unchanged; only the index directive
  // differs, so the thin page still has a complete, self-referencing head.
  if (isIndexable(game)) return base;

  return { ...base, robots: { index: false, follow: true } };
}

export default async function GamePage({ params }: Params) {
  const { slug } = await params;
  const game = await resolveGame(slug);

  if (!game) notFound();

  const settings = await getSettings();
  const path = topUpPath(game.slug);

  if (game.topUpEnabled) {
    const products = await getProducts();

    return (
      <PageShell>
        <CatalogSchema
          settings={settings}
          products={products}
          path={path}
          name={`Top up ${game.name}`}
          description={catalogDescription(game.name)}
        />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <PageHero
            eyebrow={game.name}
            title={
              <>
                Top Up <span className="text-royal">{game.name}</span>
              </>
            }
            lead="Pilih nominal yang kamu butuhkan, lalu lanjutkan ke kanal resmi FLAZZ GROUP untuk memasukkan User ID dan menyelesaikan pembayaran. Pesanan diproses setelah pembayaran diterima."
            actions={
              <Button variant="glass" size="md" asChild>
                <Link href="/#games">
                  <ArrowLeft aria-hidden />
                  Pilih game lain
                </Link>
              </Button>
            }
          />
        </div>

        {/*
          The catalogue section, mounted verbatim. Reused rather than
          reimplemented: the cards, the badge colours, the price formatting and
          the button links are all behaviour the panel already controls, and a
          second copy here would be a second place for them to drift.
        */}
        <ProductsSection products={products} gameName={game.name} />
      </PageShell>
    );
  }

  return <GameInfoPage game={game} settings={settings} path={path} />;
}

/**
 * A game the site covers but cannot yet take an order for.
 *
 * Everything here is either true or absent. There is no amount, no price, no
 * order form and no button that behaves like one — the page's job is to say
 * what the game is, what FLAZZ GROUP can and cannot do for it today, and where
 * to go instead.
 */
async function GameInfoPage({
  game,
  settings,
  path,
}: {
  game: GameCard;
  settings: Settings;
  path: string;
}) {
  /**
   * Articles for this game, but only if there are any.
   *
   * The link this replaces was stored per row and pointed at
   * `/blog?kategori=<slug>` unconditionally, so three of the four live cards
   * led to an empty archive for a category nobody had created. Asking the
   * database first means the link appears when there is something behind it,
   * and simply does not when there is not.
   */
  const articles = game.articleCategorySlug
    ? (await listPosts({ categorySlug: game.articleCategorySlug, perPage: 2 }))
        .posts
    : [];

  const topUpGame = await getTopUpGame();

  /** Blank lines separate paragraphs; that is all the formatting this needs. */
  const paragraphs = game.about
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <PageShell>
      <PageSchema
        settings={settings}
        type="WebPage"
        path={path}
        name={`Informasi Top Up ${game.name}`}
        description={infoDescription(game.name)}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-96 w-[46rem] max-w-full rounded-full bg-volt/12 blur-[130px]"
        />

        <PageHero
          eyebrow="Informasi game"
          title={
            <>
              Informasi Top Up <span className="text-royal">{game.name}</span>
            </>
          }
          lead={game.description || `Informasi seputar ${game.name} di FLAZZ GROUP.`}
          actions={
            <Button variant="glass" size="md" asChild>
              <Link href="/#games">
                <ArrowLeft aria-hidden />
                Pilih game lain
              </Link>
            </Button>
          }
        />

        {/*
          Stated plainly and within the first screen, because somebody who
          arrived from a search for "top up <game>" needs to know before they
          scroll that they cannot order here yet.
        */}
        <Reveal className="mt-10 sm:mt-12">
          <div className="glass seam flex gap-4 rounded-[1.35rem] p-5 sm:p-6">
            <Info className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden />
            <div className="min-w-0">
              <h2 className="text-base font-bold text-foam sm:text-lg">
                Pemesanan {game.name} belum tersedia di FLAZZ GROUP
              </h2>
              <p className="mt-1.5 text-sm text-mist">
                Halaman ini berisi informasi saja. Kami belum membuka layanan
                pemesanan untuk {game.name}, jadi tidak ada daftar nominal,
                harga, maupun proses pembayaran di sini.
              </p>
            </div>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-10 lg:mt-14 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-14">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <div className="glass seam overflow-hidden rounded-[1.35rem]">
              <div className="relative aspect-square">
                <Image
                  src={game.imageUrl}
                  alt={`Artwork ${game.name}`}
                  fill
                  sizes="(max-width: 1024px) 92vw, 18rem"
                  unoptimized={game.imageUrl.endsWith(".svg")}
                  className="object-cover"
                />
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-sm font-bold text-foam">{game.name}</p>
                <p className="mt-1 font-mono text-[.68rem] tracking-[.14em] text-fog uppercase">
                  Informasi &amp; panduan
                </p>
              </div>
            </div>
          </Reveal>

          <div className="min-w-0">
            <section aria-labelledby="tentang-title">
              <h2
                id="tentang-title"
                className="text-xl font-bold text-foam sm:text-2xl"
              >
                Tentang {game.name}
              </h2>

              {paragraphs.length > 0 ? (
                <div className="article-body mt-4 text-[.95rem] sm:text-base">
                  {paragraphs.map((text, index) => (
                    <p key={index}>{text}</p>
                  ))}
                </div>
              ) : (
                /*
                  No copy written yet. The page still answers — the URL has to
                  — but it says only what is true, and `generateMetadata` has
                  already marked it noindex so nobody is invited to it.
                */
                <p className="mt-4 text-sm text-mist sm:text-base">
                  Informasi lengkap untuk {game.name} sedang kami siapkan. Untuk
                  pertanyaan seputar layanan FLAZZ GROUP, customer service kami
                  bisa dihubungi kapan saja.
                </p>
              )}
            </section>

            {articles.length > 0 ? (
              <section aria-labelledby="artikel-title" className="mt-12 sm:mt-14">
                <h2
                  id="artikel-title"
                  className="text-xl font-bold text-foam sm:text-2xl"
                >
                  Artikel {game.name}
                </h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {articles.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
                <div className="mt-6">
                  <Button variant="glass" size="md" asChild>
                    <Link
                      href={`/blog?kategori=${encodeURIComponent(game.articleCategorySlug)}`}
                    >
                      Lihat semua artikel
                      <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                </div>
              </section>
            ) : null}

            {/*
              The four questions this page's own situation raises, answered
              where the visitor is rather than on a separate FAQ page.

              Deliberately not FAQPage structured data. The answers are the
              same substance on every information page — they describe a
              status, not a product — and five pages emitting near-identical
              FAQ rich results is how a site gets its structured data ignored.
              The unique value on these pages is the copy above.
            */}
            <section aria-labelledby="faq-title" className="mt-12 sm:mt-14">
              <h2
                id="faq-title"
                className="text-xl font-bold text-foam sm:text-2xl"
              >
                Pertanyaan yang sering diajukan
              </h2>
              <dl className="mt-6 grid gap-5">
                {[
                  {
                    q: `Apakah saya bisa top up ${game.name} di FLAZZ GROUP sekarang?`,
                    a: `Belum. Kami belum membuka pemesanan untuk ${game.name}, jadi halaman ini tidak memuat daftar nominal, harga, maupun proses pembayaran. Halaman ini murni informasi.`,
                  },
                  {
                    q: "Kenapa harganya tidak ditampilkan?",
                    a: `Kami hanya menampilkan harga untuk layanan yang benar benar bisa kami proses. Menampilkan daftar harga ${game.name} sekarang berarti menjanjikan sesuatu yang belum bisa kami penuhi.`,
                  },
                  {
                    q: "Kapan layanannya dibuka?",
                    a: "Belum ada tanggal yang bisa kami pastikan. Kalau kamu ingin dikabari, sampaikan lewat customer service resmi kami dan kami akan menghubungimu lewat kanal yang sama.",
                  },
                  {
                    q: `Ada yang menawarkan top up ${game.name} atas nama FLAZZ GROUP. Apakah itu resmi?`,
                    a: "Selama layanannya belum dibuka, tidak ada pihak mana pun yang berhak menerima pembayaran untuk game ini atas nama kami. Konfirmasikan dulu ke kanal resmi yang tercantum di halaman kontak sebelum mengirim apa pun.",
                  },
                ].map((item) => (
                  <div key={item.q}>
                    <dt className="text-sm font-bold text-foam sm:text-base">
                      {item.q}
                    </dt>
                    <dd className="mt-1.5 text-sm text-mist">{item.a}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <Reveal className="mt-12 sm:mt-14">
              <div className="glass seam rounded-[1.35rem] p-6 sm:p-8">
                <h2 className="text-lg font-bold text-foam sm:text-xl">
                  Yang bisa kamu lakukan sekarang
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-mist">
                  {topUpGame
                    ? `Layanan top up yang sudah berjalan di FLAZZ GROUP saat ini adalah ${topUpGame.name}. Untuk ${game.name}, hubungi customer service kami supaya kamu tahu begitu layanannya dibuka.`
                    : `Hubungi customer service kami supaya kamu tahu begitu layanan ${game.name} dibuka.`}
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  {topUpGame ? (
                    <Button variant="gold" size="lg" asChild>
                      <Link href={topUpPath(topUpGame.slug)}>
                        Top up {topUpGame.name}
                        <ArrowRight aria-hidden />
                      </Link>
                    </Button>
                  ) : null}
                  <Button variant="glass" size="lg" asChild>
                    <Link href="/contact">Hubungi customer service</Link>
                  </Button>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
