import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { getBrands, getSettings, getTopUpGame } from "@/lib/queries";
import { staticPageMetadata } from "@/lib/seo";
import { topUpHref } from "@/lib/games";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/PageShell";
import { PageHero } from "@/components/common/PageHero";
import { PageSchema } from "@/components/common/PageSchema";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Reveal, RevealItem } from "@/components/common/Reveal";
import { BrandsSection } from "@/components/sections/BrandsSection";

/**
 * A static page: nothing here is editable from the admin panel, and it is not
 * meant to be. Only the brand list and the site chrome come from the database,
 * through the same cached queries the homepage uses — so this page can never
 * advertise a brand that has been switched off.
 *
 * The revalidate window is the floor under tag invalidation, exactly as on the
 * homepage: a brand edit purges this render immediately, and the copyright year
 * in the footer still turns over on its own.
 */
export const revalidate = 3600;

const DESCRIPTION =
  "FLAZZ GROUP adalah platform top up Royal Dream yang menaungi beberapa brand resmi. Kenali layanan, cara kerja, dan brand yang ada di bawah FLAZZ GROUP.";

export async function generateMetadata(): Promise<Metadata> {
  return staticPageMetadata({
    title: "Tentang FLAZZ GROUP | Top Up Royal Dream",
    description: DESCRIPTION,
    path: "/about",
  });
}

/**
 * The four service values, written here rather than read from the `features`
 * table on purpose: that table is the homepage's marketing strip and an admin
 * can reorder or retire any row in it. This page describes what the service is,
 * which should not change because somebody rearranged a section.
 */
const VALUES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Zap,
    title: "Cepat",
    body: "Pesanan diproses begitu pembayaran diterima, tanpa antre panjang dan tanpa proses manual yang berlarut-larut.",
  },
  {
    icon: ShieldCheck,
    title: "Aman",
    body: "Transaksi berjalan lewat kanal resmi FLAZZ GROUP dan metode pembayaran yang sudah dikenal, sehingga setiap langkahnya bisa kamu lacak.",
  },
  {
    icon: Sparkles,
    title: "Terpercaya",
    body: "Harga dan ketentuan disampaikan di depan. Kalau ada kendala, admin yang sama yang menangani pesananmu sampai selesai.",
  },
  {
    icon: Clock,
    title: "24/7",
    body: "Kanal customer service terbuka setiap hari, termasuk akhir pekan dan hari libur.",
  },
];

export default async function AboutPage() {
  const [settings, brands, topUpGame] = await Promise.all([
    getSettings(),
    getBrands(),
    getTopUpGame(),
  ]);

  // These buttons say "see the price list" and "start a top up", so they open
  // the top-up page itself rather than the homepage game picker — and they
  // follow whichever game owns the catalogue, so moving it in the panel moves
  // them too.
  const catalogHref = topUpHref(topUpGame);

  return (
    <PageShell>
      <PageSchema
        settings={settings}
        type="AboutPage"
        path="/about"
        name="Tentang FLAZZ GROUP"
        description={DESCRIPTION}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-96 w-[46rem] max-w-full rounded-full bg-volt/12 blur-[130px]"
        />

        <PageHero
          eyebrow="Tentang Kami"
          title={
            <>
              Tentang <span className="text-royal">FLAZZ GROUP</span>
            </>
          }
          lead={
            <>
              FLAZZ GROUP adalah platform top up <strong className="font-semibold text-foam">Royal Dream</strong>{" "}
              yang menaungi beberapa brand resmi dalam satu manajemen. Satu tim,
              satu standar harga, dan satu alur layanan — di mana pun kamu masuk.
            </>
          }
          actions={
            <>
              <Button variant="gold" size="lg" asChild>
                <Link href={catalogHref}>
                  Lihat layanan top up
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button variant="glass" size="lg" asChild>
                <Link href="/contact">
                  <MessageCircleMore aria-hidden />
                  Hubungi kami
                </Link>
              </Button>
            </>
          }
        />

        {/* ------------------------------------------------ who we are */}
        <section
          aria-labelledby="who-title"
          className="relative scroll-mt-28 py-12 sm:py-16"
        >
          <SectionHeading
            eyebrow="Siapa kami"
            title={
              <span id="who-title">
                Satu pintu untuk <span className="text-volt">Royal Dream</span>
              </span>
            }
            note="Bukan sekadar halaman harga — ini tempat pesananmu ditangani orang."
          />

          <Reveal
            stagger={0.09}
            className="grid gap-3 sm:gap-4 lg:grid-cols-3"
          >
            <RevealItem className="lg:col-span-2">
              <article className="glass seam h-full rounded-[1.5rem] p-6 sm:p-8">
                <div className="article-body text-[.95rem] sm:text-base">
                  <p>
                    FLAZZ GROUP berperan sebagai <strong>platform dan penyedia
                    layanan</strong> top up Royal Dream. Kami menghubungkan
                    pemain dengan produk yang dibutuhkan — koin dan layanan
                    terkait — lalu memproses pesanan tersebut melalui brand
                    resmi yang ada di bawah grup ini.
                  </p>
                  <p>
                    Artinya kami bukan pengembang atau penerbit game. Yang kami
                    kerjakan adalah bagian setelah kamu memutuskan untuk
                    membeli: memastikan nominalnya benar, pembayarannya jelas,
                    dan pesanannya sampai. Semua brand di bawah FLAZZ GROUP
                    memakai standar layanan yang sama, jadi pengalaman yang kamu
                    dapat tidak berubah-ubah tergantung pintu masuknya.
                  </p>
                  <p>
                    Setiap pesanan ditangani lewat kanal resmi yang tercantum di{" "}
                    <Link href="/contact">halaman kontak</Link>. Kami tidak
                    pernah meminta kata sandi akun, kode OTP, atau data pribadi
                    yang tidak diperlukan untuk memproses pesanan.
                  </p>
                </div>
              </article>
            </RevealItem>

            <RevealItem>
              <article className="glass seam flex h-full flex-col justify-between gap-6 rounded-[1.5rem] p-6 sm:p-8">
                <div>
                  <h3 className="text-lg font-bold text-foam">
                    Apa yang kami sediakan
                  </h3>
                  <ul className="mt-4 grid gap-3 text-sm text-mist">
                    {[
                      "Katalog top up Royal Dream dengan harga yang tertera jelas",
                      "Beberapa metode pembayaran umum di Indonesia",
                      "Customer service yang bisa dihubungi lewat WhatsApp dan Telegram",
                      "Channel resmi untuk info promo dan perubahan harga",
                    ].map((item) => (
                      <li key={item} className="flex gap-2.5">
                        <span
                          aria-hidden
                          className="mt-2 size-1.5 shrink-0 rounded-full bg-gold"
                        />
                        <span className="min-w-0">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button variant="glass" size="md" asChild className="w-full">
                  <Link href={catalogHref}>
                    Lihat daftar harga
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </article>
            </RevealItem>
          </Reveal>
        </section>

        {/* --------------------------------------------------- values */}
        <section
          aria-labelledby="values-title"
          className="relative scroll-mt-28 py-12 sm:py-16"
        >
          <SectionHeading
            eyebrow="Nilai layanan"
            title={
              <span id="values-title">
                Empat hal yang kami <span className="text-royal">pegang</span>
              </span>
            }
            align="center"
          />

          <Reveal
            stagger={0.08}
            className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4"
          >
            {VALUES.map(({ icon: Icon, title, body }) => (
              <RevealItem key={title}>
                <div className="glass seam lift group relative h-full overflow-hidden rounded-[1.35rem] p-5 sm:p-6">
                  <span className="relative z-10 grid size-12 place-items-center rounded-2xl border border-gold/25 bg-gold/10 text-gold transition-all duration-400 group-hover:border-gold/60 group-hover:bg-gold/18">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="relative z-10 mt-5 text-base font-bold text-foam">
                    {title}
                  </h3>
                  <p className="relative z-10 mt-2 text-sm leading-relaxed text-mist">
                    {body}
                  </p>
                </div>
              </RevealItem>
            ))}
          </Reveal>
        </section>
      </div>

      {/* Reused verbatim from the homepage — same cards, same data, same
          statuses. A brand switched off in the admin panel disappears from
          both pages at once. */}
      <BrandsSection brands={brands} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ------------------------------------------ purpose + closing */}
        <section
          aria-labelledby="purpose-title"
          className="relative scroll-mt-28 py-12 sm:py-16"
        >
          <SectionHeading
            eyebrow="Tujuan website"
            title={
              <span id="purpose-title">
                Kenapa website ini <span className="text-volt">ada</span>
              </span>
            }
          />

          <Reveal>
            <div className="glass seam rounded-[1.5rem] p-6 sm:p-8 lg:p-10">
              <div className="article-body max-w-3xl text-[.95rem] sm:text-base">
                <p>
                  Website ini adalah rumah resmi FLAZZ GROUP. Fungsinya
                  sederhana: menunjukkan layanan dan harga yang tersedia,
                  menjelaskan cara memesan, dan memastikan kamu bisa memverifikasi
                  mana kanal yang benar-benar milik kami sebelum mengirim uang ke
                  siapa pun.
                </p>
                <p>
                  Halaman ini juga menjadi tempat kami mengumpulkan brand yang
                  berada di bawah satu manajemen, supaya tidak ada kebingungan
                  soal siapa yang melayani pesananmu. Panduan dan penjelasan yang
                  lebih panjang kami tulis di{" "}
                  <Link href="/blog">blog FLAZZ GROUP</Link>. Untuk pertanyaan
                  yang butuh jawaban langsung, gunakan{" "}
                  <Link href="/contact">kanal customer service</Link>.
                </p>
                <p>
                  Ketentuan penggunaan layanan ini dijelaskan di{" "}
                  <Link href="/terms">Terms &amp; Conditions</Link>, dan cara kami
                  memperlakukan data pengunjung dijelaskan di{" "}
                  <Link href="/privacy-policy">Privacy Policy</Link>.
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 border-t border-white/8 pt-8 sm:flex-row">
                <Button variant="gold" size="lg" asChild>
                  <Link href={catalogHref}>
                    Mulai top up
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
                <Button variant="glass" size="lg" asChild>
                  <Link href="/contact">
                    <MessageCircleMore aria-hidden />
                    Tanya customer service
                  </Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </section>
      </div>
    </PageShell>
  );
}
