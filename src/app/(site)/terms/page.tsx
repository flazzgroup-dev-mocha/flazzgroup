import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { getSettings } from "@/lib/queries";
import { staticPageMetadata } from "@/lib/seo";
import { staticPageDateLabel } from "@/lib/static-pages";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/PageShell";
import { PageHero } from "@/components/common/PageHero";
import { PageSchema } from "@/components/common/PageSchema";
import { Reveal } from "@/components/common/Reveal";
import {
  LegalDocument,
  type LegalSection,
} from "@/components/legal/LegalDocument";

/**
 * Static terms. Deliberately conservative: where this project does not define a
 * policy — refunds, warranties, governing law, a legal entity — the text says
 * what actually happens (report it to customer service, it is handled case by
 * case) rather than inventing an obligation nobody agreed to.
 */
export const revalidate = 86400;

const DESCRIPTION =
  "Terms & Conditions FLAZZ GROUP: ketentuan penggunaan website, alur pemesanan top up, tanggung jawab data transaksi, pembayaran, dan batasan tanggung jawab.";

/**
 * The date shown to readers is the same one the sitemap reports as `lastmod`.
 * Two hand-maintained copies of "when did this policy last change" is one copy
 * too many — see lib/static-pages.ts.
 */
const LAST_UPDATED = staticPageDateLabel("/terms");

export async function generateMetadata(): Promise<Metadata> {
  return staticPageMetadata({
    title: "Terms & Conditions | FLAZZ GROUP",
    description: DESCRIPTION,
    path: "/terms",
  });
}

const SECTIONS: LegalSection[] = [
  {
    id: "penerimaan",
    title: "Penerimaan ketentuan",
    body: (
      <>
        <p>
          Dengan mengakses dan menggunakan website FLAZZ GROUP, kamu dianggap
          telah membaca, memahami, dan menyetujui ketentuan pada halaman ini.
          Jika ada bagian yang tidak kamu setujui, sebaiknya jangan menggunakan
          website maupun layanan ini.
        </p>
        <p>
          Ketentuan ini berlaku bersama{" "}
          <Link href="/privacy-policy">Privacy Policy</Link>, yang menjelaskan
          bagaimana data pengunjung diperlakukan.
        </p>
      </>
    ),
  },
  {
    id: "penggunaan",
    title: "Penggunaan website dan layanan",
    body: (
      <>
        <p>
          Website ini menampilkan informasi layanan top up Royal Dream, daftar
          harga, brand yang berada di bawah FLAZZ GROUP, serta kanal resmi untuk
          menghubungi kami. Website ini ditujukan untuk penggunaan pribadi dan
          non-komersial, kecuali disepakati lain dengan kami.
        </p>
        <p>
          Isi halaman — termasuk harga, ketersediaan produk, dan promo — dapat
          berubah sewaktu-waktu. Informasi yang berlaku adalah informasi yang
          dikonfirmasi melalui kanal resmi pada saat pesanan diproses.
        </p>
      </>
    ),
  },
  {
    id: "akun",
    title: "Tanggung jawab atas akun",
    body: (
      <>
        <p>
          Website ini tidak menyediakan pendaftaran akun bagi pengunjung. Akun
          yang relevan dalam layanan ini adalah akun game milik kamu dan akun
          platform perpesanan yang kamu gunakan untuk menghubungi kami.
        </p>
        <p>
          Menjaga keamanan akun tersebut sepenuhnya menjadi tanggung jawab kamu.
          Kami tidak pernah meminta kata sandi, kode OTP, atau PIN pembayaran,
          dan tidak bertanggung jawab atas kerugian yang timbul karena informasi
          tersebut diserahkan kepada pihak lain.
        </p>
      </>
    ),
  },
  {
    id: "pesanan",
    title: "Proses top up dan pesanan",
    body: (
      <>
        <p>
          Website ini berfungsi sebagai etalase informasi. Pemesanan diselesaikan
          melalui kanal resmi FLAZZ GROUP: toko brand yang tertaut dari halaman
          produk, atau customer service di WhatsApp dan Telegram yang tercantum
          pada <Link href="/contact">halaman kontak</Link>.
        </p>
        <p>Alur umumnya:</p>
        <ul>
          <li>kamu memilih nominal top up yang diinginkan;</li>
          <li>
            kamu menyampaikan data yang dibutuhkan, termasuk User ID atau
            identitas akun tujuan;
          </li>
          <li>kamu menyelesaikan pembayaran sesuai instruksi yang diberikan;</li>
          <li>
            pesanan diproses setelah pembayaran terkonfirmasi, dan status
            pesanan diinformasikan melalui kanal yang sama.
          </li>
        </ul>
        <p>
          Waktu pemrosesan dapat berbeda-beda tergantung antrean, metode
          pembayaran, dan kondisi sistem pihak ketiga yang terlibat.
        </p>
      </>
    ),
  },
  {
    id: "data-transaksi",
    title: "Ketepatan User ID dan data pesanan",
    body: (
      <>
        <p>
          Data yang kamu berikan — User ID, server, nama akun, nominal, dan
          keterangan lain — dipakai apa adanya untuk memproses pesanan.
          Memastikan data tersebut benar sebelum pembayaran adalah tanggung jawab
          kamu.
        </p>
        <p>
          Pesanan yang sudah diproses ke tujuan yang salah karena data yang keliru
          umumnya tidak dapat ditarik kembali, karena pengiriman terjadi di sistem
          pihak lain. Jika kamu menyadari ada kesalahan, hubungi customer service
          secepat mungkin: selama pesanan belum diproses, perbaikan biasanya masih
          memungkinkan.
        </p>
        <p>
          Setiap laporan kendala akan kami tinjau berdasarkan bukti transaksi
          yang tersedia, dan hasil peninjauan disampaikan melalui kanal resmi.
        </p>
      </>
    ),
  },
  {
    id: "transaksi",
    title: "Tanggung jawab atas transaksi",
    body: (
      <>
        <p>
          Transaksi hanya kami akui apabila dilakukan melalui kanal resmi FLAZZ
          GROUP yang tercantum di website ini. Pembayaran yang dikirim ke pihak,
          nomor, atau tautan di luar kanal resmi berada di luar tanggung jawab
          kami.
        </p>
        <p>
          Simpan bukti pembayaran dan riwayat percakapan sampai pesanan selesai.
          Keduanya adalah dasar utama saat sebuah pesanan perlu ditelusuri.
        </p>
      </>
    ),
  },
  {
    id: "pembayaran",
    title: "Pembayaran dan penyedia pembayaran pihak ketiga",
    body: (
      <>
        <p>
          Pembayaran dilakukan melalui metode yang tersedia, seperti transfer
          bank, dompet digital, atau QRIS. Metode tersebut dioperasikan oleh
          penyedia pihak ketiga, dan proses pembayaran tunduk pada ketentuan
          serta biaya yang mereka tetapkan.
        </p>
        <p>
          Website ini tidak memproses dan tidak menyimpan data kartu maupun
          kredensial pembayaran kamu. Keterlambatan, kegagalan, atau gangguan
          pada sistem penyedia pembayaran berada di luar kendali kami, meskipun
          kami akan membantu menelusurinya sejauh yang kami bisa.
        </p>
        <p>
          Pastikan nominal yang kamu bayarkan sesuai instruksi. Nominal yang
          tidak sesuai dapat menunda verifikasi pesanan.
        </p>
      </>
    ),
  },
  {
    id: "ketersediaan",
    title: "Ketersediaan layanan",
    body: (
      <>
        <p>
          Kami berupaya menjaga website dan layanan tetap dapat diakses. Meski
          begitu, akses dapat terganggu karena pemeliharaan, pembaruan, kendala
          teknis, atau gangguan pada layanan pihak ketiga yang kami gunakan.
        </p>
        <p>
          Ketersediaan produk, harga, dan promo dapat berubah atau dihentikan
          sewaktu-waktu tanpa pemberitahuan terlebih dahulu.
        </p>
      </>
    ),
  },
  {
    id: "larangan",
    title: "Penggunaan yang dilarang",
    body: (
      <>
        <p>Saat menggunakan website dan layanan ini, kamu setuju untuk tidak:</p>
        <ul>
          <li>
            menggunakan layanan untuk tujuan melanggar hukum atau merugikan pihak
            lain;
          </li>
          <li>
            memakai metode pembayaran yang bukan milik kamu atau diperoleh secara
            tidak sah;
          </li>
          <li>
            memberikan data palsu atau menyamar sebagai orang lain dalam sebuah
            pesanan;
          </li>
          <li>
            mengaku sebagai perwakilan, admin, atau reseller resmi FLAZZ GROUP
            tanpa persetujuan kami;
          </li>
          <li>
            mengganggu operasional website, termasuk upaya akses tidak sah,
            pengambilan data secara otomatis dalam jumlah berlebihan, atau
            tindakan yang membebani server;
          </li>
          <li>
            menyalahgunakan kanal komunitas untuk penipuan, spam, atau promosi
            pihak lain tanpa izin.
          </li>
        </ul>
        <p>
          Kami dapat menolak atau menghentikan pelayanan atas pesanan yang
          terindikasi melanggar ketentuan ini.
        </p>
      </>
    ),
  },
  {
    id: "kekayaan-intelektual",
    title: "Hak kekayaan intelektual",
    body: (
      <>
        <p>
          Nama, logo, tata letak, teks, dan materi visual yang dibuat untuk
          website FLAZZ GROUP merupakan milik FLAZZ GROUP dan tidak boleh
          digunakan ulang untuk kepentingan komersial tanpa izin tertulis.
        </p>
        <p>
          Nama produk, merek dagang, dan aset milik pihak lain yang disebut di
          website ini tetap menjadi milik pemiliknya masing-masing, dan disebut
          semata-mata untuk keperluan identifikasi layanan. FLAZZ GROUP bukan
          pengembang maupun penerbit game yang bersangkutan.
        </p>
      </>
    ),
  },
  {
    id: "tautan",
    title: "Tautan ke situs pihak ketiga",
    body: (
      <>
        <p>
          Website ini memuat tautan ke situs lain, termasuk toko brand di bawah
          FLAZZ GROUP, platform perpesanan, dan media sosial. Tautan tersebut
          disediakan untuk memudahkan kamu.
        </p>
        <p>
          Isi, ketentuan, dan praktik pengelolaan data pada situs tujuan berada
          di luar kendali kami, dan penggunaannya tunduk pada ketentuan situs
          masing-masing.
        </p>
      </>
    ),
  },
  {
    id: "batasan",
    title: "Batasan tanggung jawab",
    body: (
      <>
        <p>
          Website dan layanan disediakan sebagaimana adanya. Kami tidak
          menjanjikan bahwa website akan selalu bebas dari kesalahan atau
          gangguan.
        </p>
        <p>
          Sepanjang diizinkan ketentuan yang berlaku, FLAZZ GROUP tidak
          bertanggung jawab atas kerugian yang timbul dari:
        </p>
        <ul>
          <li>
            data pesanan yang keliru atau tidak lengkap yang diberikan oleh
            pengguna;
          </li>
          <li>
            transaksi yang dilakukan di luar kanal resmi yang tercantum di
            website ini;
          </li>
          <li>
            gangguan, perubahan kebijakan, atau tindakan dari penyedia
            pembayaran, platform perpesanan, maupun penerbit game;
          </li>
          <li>
            kelalaian pengguna dalam menjaga keamanan akun dan kredensial
            miliknya.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "perubahan",
    title: "Perubahan ketentuan",
    body: (
      <>
        <p>
          Ketentuan ini dapat diperbarui sewaktu-waktu untuk mengikuti perubahan
          layanan. Versi terbaru selalu tersedia di halaman ini, dengan tanggal
          pembaruan tercantum di bagian atas.
        </p>
        <p>
          Perubahan berlaku sejak dipublikasikan. Penggunaan website setelah
          pembaruan berarti kamu mengikuti versi yang berlaku saat itu.
        </p>
      </>
    ),
  },
  {
    id: "kontak",
    title: "Kontak",
    body: (
      <>
        <p>
          Pertanyaan mengenai ketentuan ini, atau kendala pada sebuah pesanan,
          dapat kamu sampaikan melalui kanal resmi di{" "}
          <Link href="/contact">halaman kontak FLAZZ GROUP</Link>. Hanya kanal
          yang tercantum di sana yang kami akui sebagai kanal resmi.
        </p>
      </>
    ),
  },
];

export default async function TermsPage() {
  const settings = await getSettings();

  return (
    <PageShell>
      <PageSchema
        settings={settings}
        type="WebPage"
        path="/terms"
        name="Terms & Conditions"
        description={DESCRIPTION}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-96 w-[46rem] max-w-full rounded-full bg-volt/12 blur-[130px]"
        />

        <PageHero
          eyebrow="Ketentuan"
          title={
            <>
              Terms &amp; <span className="text-royal">Conditions</span>
            </>
          }
          lead="Ketentuan penggunaan website dan layanan FLAZZ GROUP: bagaimana pesanan diproses, apa yang menjadi tanggung jawab kamu, dan apa yang menjadi tanggung jawab kami."
          meta={`Terakhir diperbarui: ${LAST_UPDATED}`}
        />

        <LegalDocument sections={SECTIONS} />

        <Reveal className="my-14 sm:my-16">
          <div className="glass seam rounded-[1.5rem] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-foam sm:text-2xl">
              Ada bagian yang perlu dijelaskan?
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-mist sm:text-base">
              Tanyakan langsung ke customer service sebelum kamu melakukan
              pemesanan. Cara kami memperlakukan data pengunjung dijelaskan
              terpisah di halaman Privacy Policy.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button variant="gold" size="lg" asChild>
                <Link href="/contact">
                  Hubungi customer service
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button variant="glass" size="lg" asChild>
                <Link href="/privacy-policy">Baca Privacy Policy</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </PageShell>
  );
}
