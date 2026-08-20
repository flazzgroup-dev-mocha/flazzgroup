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
 * Static policy text. Nothing on this page is editable from /admin, and it
 * describes only what this codebase actually does — the analytics integrations
 * that exist in the settings row, the consent gate in front of them, the admin
 * accounts and security logs the schema actually holds, and the media host
 * uploads are served from. No legal entity, address, registration number or
 * retention period is asserted, because the project does not have one to
 * assert.
 *
 * Every claim below was checked against the code before it was written. There
 * is no visitor account model, no order table and no checkout on this site, so
 * the sections say so rather than describing the transaction data a top-up
 * site is usually assumed to hold. Each named third party corresponds to a
 * real integration: GA4 and GTM (lib/analytics/config.ts), Meta Pixel and the
 * Conversions API relay (app/api/track/route.ts), Google Ads, Microsoft
 * Clarity, and Cloudinary (lib/media/*). Nothing is listed that the code does
 * not do.
 */
export const revalidate = 86400;

const DESCRIPTION =
  "Privacy Policy FLAZZ GROUP: informasi apa yang dikumpulkan website ini, data pesanan, cookie dan analitik, layanan pihak ketiga yang terlibat, keamanan data, dan hak kamu atas data.";

/**
 * The date shown to readers is the same one the sitemap reports as `lastmod`.
 * Two hand-maintained copies of "when did this policy last change" is one copy
 * too many — see lib/static-pages.ts.
 */
const LAST_UPDATED = staticPageDateLabel("/privacy-policy");

export async function generateMetadata(): Promise<Metadata> {
  return staticPageMetadata({
    title: "Privacy Policy | FLAZZ GROUP",
    description: DESCRIPTION,
    path: "/privacy-policy",
  });
}

const SECTIONS: LegalSection[] = [
  {
    id: "informasi",
    title: "Informasi yang dapat kami kumpulkan",
    body: (
      <>
        <p>
          Website FLAZZ GROUP tidak memiliki fitur pendaftaran akun untuk
          pengunjung, dan tidak meminta kamu mengisi data pribadi untuk sekadar
          melihat halaman. Informasi yang dapat terkumpul dibagi menjadi tiga
          jenis:
        </p>
        <ul>
          <li>
            <strong>Data teknis.</strong> Saat kamu membuka halaman, browser dan
            server bertukar informasi standar seperti alamat IP, jenis
            perangkat, jenis dan versi browser, sistem operasi, halaman yang
            dibuka, serta halaman rujukan. Data ini muncul dari cara internet
            bekerja, bukan dari isian yang kamu kirim.
          </li>
          <li>
            <strong>Data penggunaan.</strong> Jika kamu menyetujui cookie
            analitik, kami dapat mengetahui halaman mana yang dibuka, berapa lama
            dibaca, tautan mana yang diklik, dan dari mana kunjungan berasal.
            Data ini dikumpulkan dalam bentuk agregat dan tidak kami gunakan
            untuk mengidentifikasi individu.
          </li>
          <li>
            <strong>Informasi yang kamu kirim sendiri.</strong> Ketika kamu
            menghubungi kami lewat WhatsApp atau Telegram, isi percakapan dan
            informasi yang kamu sampaikan di sana — misalnya nomor kontak atau
            data pesanan — kami terima sebagaimana kamu kirimkan. Percakapan itu
            berlangsung di platform pihak ketiga dan tunduk pada kebijakan
            privasi platform tersebut.
          </li>
        </ul>
        <p>
          Kami tidak meminta kata sandi akun game, kode OTP, atau PIN
          pembayaran, dan tidak pernah membutuhkannya untuk memproses pesanan.
        </p>
      </>
    ),
  },
  {
    id: "pesanan",
    title: "Data pesanan dan transaksi",
    body: (
      <>
        <p>
          Bagian ini perlu dijelaskan terpisah karena sering diasumsikan
          sebaliknya:{" "}
          <strong>
            website ini tidak memproses pesanan dan tidak menyimpan data
            transaksi.
          </strong>{" "}
          Tidak ada formulir pemesanan, tidak ada halaman pembayaran, dan tidak
          ada basis data pesanan di website ini.
        </p>
        <p>
          Halaman nominal menampilkan pilihan dan harga; tombolnya membawa kamu
          ke kanal resmi FLAZZ GROUP. Data pesanan — User ID atau identitas akun
          game tujuan, nominal yang dipilih, dan bukti pembayaran — kamu
          serahkan di kanal tersebut, bukan di sini, dan tersimpan di platform
          yang bersangkutan.
        </p>
        <p>
          Kami juga tidak memproses dan tidak menyimpan nomor kartu, saldo
          dompet digital, maupun kredensial pembayaran apa pun. Kami tidak
          pernah meminta kata sandi akun game, kode OTP, atau PIN pembayaran,
          dan tidak membutuhkannya untuk memproses pesanan.
        </p>
      </>
    ),
  },
  {
    id: "tujuan",
    title: "Tujuan penggunaan informasi",
    body: (
      <>
        <p>Informasi di atas digunakan untuk keperluan berikut:</p>
        <ul>
          <li>menjalankan dan menampilkan website beserta isinya;</li>
          <li>
            menjawab pertanyaan dan menindaklanjuti pesanan yang kamu sampaikan
            lewat kanal customer service;
          </li>
          <li>
            memahami halaman mana yang berguna, sehingga isi website bisa
            diperbaiki;
          </li>
          <li>
            mengukur efektivitas kampanye pemasaran, jika kampanye tersebut
            sedang berjalan;
          </li>
          <li>
            menjaga keamanan layanan, termasuk membatasi permintaan otomatis yang
            berlebihan ke server kami.
          </li>
        </ul>
        <p>
          Kami tidak memperjualbelikan data pengunjung kepada pihak lain.
        </p>
      </>
    ),
  },
  {
    id: "cookie",
    title: "Cookie dan teknologi serupa",
    body: (
      <>
        <p>
          Cookie adalah berkas kecil yang disimpan browser. Website ini juga
          memakai penyimpanan lokal browser (<em>local storage</em>) untuk
          mengingat satu hal: pilihan kamu terhadap banner persetujuan cookie.
        </p>
        <ul>
          <li>
            <strong>Cookie yang diperlukan.</strong> Dibutuhkan agar website
            berfungsi, termasuk cookie sesi untuk panel administrasi yang hanya
            berlaku bagi pengelola website, bukan pengunjung.
          </li>
          <li>
            <strong>Cookie analitik dan pemasaran.</strong> Dipasang oleh layanan
            pihak ketiga yang dijelaskan di bawah. Cookie jenis ini{" "}
            <strong>tidak dimuat sebelum kamu menekan &ldquo;Terima&rdquo;</strong>{" "}
            pada banner persetujuan. Jika kamu menolak, skrip terkait tidak
            dijalankan sama sekali dan seluruh isi website tetap bisa diakses.
          </li>
        </ul>
        <p>
          Kamu juga dapat menghapus atau memblokir cookie lewat pengaturan
          browser. Menghapus penyimpanan lokal akan menghapus jawaban kamu
          sebelumnya, sehingga banner persetujuan muncul kembali.
        </p>
      </>
    ),
  },
  {
    id: "analitik",
    title: "Analitik: Google Analytics & Google Tag Manager",
    body: (
      <>
        <p>
          Website ini dapat menggunakan Google Analytics 4 dan Google Tag
          Manager, keduanya layanan milik Google. Google Tag Manager berfungsi
          sebagai wadah yang memuat skrip pengukuran; Google Analytics mencatat
          kunjungan halaman dan interaksi seperti klik pada tombol kontak.
        </p>
        <p>
          Keduanya hanya dimuat setelah kamu memberi persetujuan. Data yang
          terkirim mencakup data teknis dan data penggunaan yang disebut di
          bagian pertama, dan diproses oleh Google sesuai kebijakan privasi
          mereka.
        </p>
      </>
    ),
  },
  {
    id: "meta",
    title: "Meta Pixel dan Meta Conversions API",
    body: (
      <>
        <p>
          Website ini dapat menggunakan Meta Pixel untuk mengukur hasil iklan di
          platform Meta (Facebook dan Instagram). Pixel dimuat di browser dan
          hanya aktif setelah kamu menyetujui cookie.
        </p>
        <p>
          Sebagian peristiwa yang sama juga dapat dikirim dari server kami ke
          Meta melalui Meta Conversions API, agar pengukuran tetap akurat ketika
          skrip di browser terhalang. Peristiwa yang dikirim berisi jenis
          interaksi (misalnya klik menuju WhatsApp), alamat halaman terkait,
          alamat IP, dan identitas browser (<em>user agent</em>), beserta
          pengenal cookie milik Meta bila cookie tersebut ada. Pengiriman dari
          server ini mengikuti persetujuan yang sama: bila kamu menolak, tidak
          ada peristiwa yang dikirim.
        </p>
      </>
    ),
  },
  {
    id: "periklanan",
    title: "Teknologi periklanan dan pengukuran lain",
    body: (
      <>
        <p>
          Selain yang di atas, website ini menyediakan dukungan untuk layanan
          pengukuran berikut, yang dapat diaktifkan atau dinonaktifkan oleh
          pengelola:
        </p>
        <ul>
          <li>
            <strong>Google Ads.</strong> Digunakan untuk mencatat konversi dari
            iklan, misalnya ketika pengunjung mengklik tombol menuju customer
            service.
          </li>
          <li>
            <strong>Microsoft Clarity.</strong> Digunakan untuk melihat pola
            penggunaan halaman secara agregat, seperti bagian mana yang paling
            sering dibaca.
          </li>
        </ul>
        <p>
          Semua layanan tersebut termasuk kategori cookie analitik dan
          pemasaran, sehingga tunduk pada persetujuan yang sama.
        </p>
      </>
    ),
  },
  {
    id: "pihak-ketiga",
    title: "Layanan pihak ketiga",
    body: (
      <>
        <p>
          Agar website dan layanan ini berjalan, sebagian pekerjaan ditangani
          penyedia lain. Ketika kamu berinteraksi dengan mereka, kebijakan
          privasi mereka yang berlaku:
        </p>
        <ul>
          <li>
            <strong>Penyedia hosting dan infrastruktur.</strong> Menjalankan
            website dan basis data yang menyimpan isi halaman.
          </li>
          <li>
            <strong>WhatsApp dan Telegram.</strong> Kanal percakapan dengan
            customer service kami. Isi percakapan tersimpan di platform
            masing-masing.
          </li>
          <li>
            <strong>Penyedia pembayaran.</strong> Ketika pembayaran dilakukan
            melalui bank, dompet digital, atau QRIS, data transaksi diproses oleh
            penyedia yang bersangkutan, bukan oleh website ini. Website ini tidak
            memproses dan tidak menyimpan data kartu.
          </li>
          <li>
            <strong>Penyedia analitik dan periklanan.</strong> Sebagaimana
            dijelaskan pada bagian sebelumnya.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "media",
    title: "Media dan penyimpanan gambar",
    body: (
      <>
        <p>
          Gambar yang tampil di website ini — logo brand, banner, ilustrasi
          produk, dan gambar artikel — dapat disimpan serta disajikan melalui
          Cloudinary, layanan penyimpanan dan pengoptimalan media pihak ketiga.
        </p>
        <p>
          Karena gambar dimuat langsung dari server Cloudinary, permintaan
          tersebut mengungkap data teknis standar seperti alamat IP dan jenis
          browser kepada penyedia tersebut, sebagaimana berlaku pada setiap
          gambar yang dimuat dari internet. Kami tidak mengunggah data pribadi
          pengunjung ke layanan ini.
        </p>
      </>
    ),
  },
  {
    id: "pengelola",
    title: "Akun pengelola dan catatan keamanan",
    body: (
      <>
        <p>
          Website ini memiliki panel administrasi yang hanya bisa diakses
          pengelola FLAZZ GROUP. Bagian ini menyangkut mereka, bukan pengunjung
          — tetapi dicantumkan agar gambaran data yang kami simpan lengkap.
        </p>
        <ul>
          <li>
            <strong>Akun pengelola.</strong> Nama, alamat email, peran, dan kata
            sandi yang disimpan dalam bentuk hash — kata sandi aslinya tidak
            tersimpan dan tidak dapat dibaca kembali oleh siapa pun, termasuk
            oleh kami.
          </li>
          <li>
            <strong>Catatan aktivitas.</strong> Perubahan isi website —
            siapa mengubah apa dan kapan — untuk keperluan pengelolaan
            redaksional.
          </li>
          <li>
            <strong>Catatan keamanan.</strong> Peristiwa masuk, upaya masuk yang
            gagal, perubahan peran, dan penolakan akses, beserta alamat IP dan
            identitas browser saat peristiwa itu terjadi. Catatan ini dibuat
            untuk mendeteksi penyalahgunaan akses, dan disimpan terpisah dari
            catatan aktivitas biasa justru agar tidak mudah terhapus.
          </li>
        </ul>
        <p>
          Pengunjung website tidak memiliki akun, tidak dapat mendaftar, dan
          tidak tercatat dalam sistem ini.
        </p>
      </>
    ),
  },
  {
    id: "keamanan",
    title: "Keamanan data",
    body: (
      <>
        <p>
          Website ini disajikan melalui koneksi terenkripsi (HTTPS). Akses ke
          panel administrasi dibatasi pada akun pengelola yang terautentikasi,
          kata sandinya disimpan dalam bentuk hash, dan permintaan otomatis yang
          berlebihan dibatasi untuk mencegah penyalahgunaan.
        </p>
        <p>
          Kami berupaya menjaga keamanan sistem dengan langkah-langkah teknis
          yang wajar. Meskipun demikian, tidak ada metode pengiriman data melalui
          internet yang dapat dijamin aman sepenuhnya.
        </p>
      </>
    ),
  },
  {
    id: "penyimpanan",
    title: "Penyimpanan data",
    body: (
      <>
        <p>
          Data disimpan selama masih diperlukan untuk tujuan yang dijelaskan di
          halaman ini, atau selama diwajibkan oleh ketentuan yang berlaku.
        </p>
        <p>
          Data yang dikumpulkan layanan analitik dan periklanan disimpan pada
          sistem penyedia masing-masing dan mengikuti masa penyimpanan yang
          mereka tetapkan. Percakapan customer service tersimpan pada platform
          perpesanan yang digunakan.
        </p>
        <p>
          Catatan aktivitas redaksional pada panel administrasi dipangkas
          otomatis dan hanya menyimpan entri terbaru. Catatan keamanan disimpan
          lebih lama, karena catatan upaya masuk yang gagal tidak ada gunanya
          jika sudah tergeser oleh perubahan isi halaman yang biasa.
        </p>
      </>
    ),
  },
  {
    id: "hak",
    title: "Hak kamu atas data",
    body: (
      <>
        <p>Sejauh data tersebut ada pada kami, kamu dapat:</p>
        <ul>
          <li>menanyakan informasi apa yang kami miliki tentang kamu;</li>
          <li>meminta koreksi atas informasi yang tidak akurat;</li>
          <li>
            meminta penghapusan informasi yang tidak lagi diperlukan untuk
            memproses pesanan atau menjawab pertanyaan kamu;
          </li>
          <li>
            menarik persetujuan cookie kapan saja, dengan menghapus penyimpanan
            lokal website ini melalui pengaturan browser lalu memilih ulang pada
            banner persetujuan.
          </li>
        </ul>
        <p>
          Untuk mengajukan permintaan tersebut, hubungi kami melalui{" "}
          <Link href="/contact">halaman kontak</Link>. Kami dapat meminta
          informasi tambahan secukupnya untuk memastikan permintaan benar-benar
          berasal dari kamu.
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
          Website ini memuat tautan ke situs lain, termasuk situs brand yang
          berada di bawah FLAZZ GROUP, platform perpesanan, dan media sosial.
          Setelah kamu meninggalkan website ini, kebijakan privasi situs tujuan
          yang berlaku, dan kami tidak mengendalikan isi maupun praktik
          pengelolaan data di sana.
        </p>
        <p>
          Kami menyarankan kamu membaca kebijakan privasi setiap situs yang kamu
          kunjungi melalui tautan dari sini.
        </p>
      </>
    ),
  },
  {
    id: "perubahan",
    title: "Perubahan Privacy Policy",
    body: (
      <>
        <p>
          Kebijakan ini dapat diperbarui, misalnya ketika ada layanan pihak
          ketiga yang ditambahkan atau dihentikan. Versi terbaru selalu tersedia
          di halaman ini, dengan tanggal pembaruan tercantum di bagian atas.
        </p>
        <p>
          Perubahan berlaku sejak dipublikasikan. Dengan terus menggunakan
          website ini setelah pembaruan, kamu dianggap memahami versi yang
          berlaku.
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
          Pertanyaan mengenai Privacy Policy ini dapat kamu sampaikan melalui
          kanal resmi yang tercantum di{" "}
          <Link href="/contact">halaman kontak FLAZZ GROUP</Link>. Kanal tersebut
          adalah satu-satunya jalur resmi kami.
        </p>
      </>
    ),
  },
];

export default async function PrivacyPolicyPage() {
  const settings = await getSettings();

  return (
    <PageShell>
      <PageSchema
        settings={settings}
        type="WebPage"
        path="/privacy-policy"
        name="Privacy Policy"
        description={DESCRIPTION}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-96 w-[46rem] max-w-full rounded-full bg-volt/12 blur-[130px]"
        />

        <PageHero
          eyebrow="Kebijakan"
          title={
            <>
              Privacy <span className="text-royal">Policy</span>
            </>
          }
          lead="Halaman ini menjelaskan informasi apa yang dapat dikumpulkan saat kamu membuka website FLAZZ GROUP, untuk apa informasi itu digunakan, dan pilihan apa yang kamu miliki. Ditulis sesingkat mungkin tanpa menghilangkan hal yang penting."
          meta={`Terakhir diperbarui: ${LAST_UPDATED}`}
        />

        <LegalDocument sections={SECTIONS} />

        <Reveal className="my-14 sm:my-16">
          <div className="glass seam rounded-[1.5rem] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-foam sm:text-2xl">
              Masih ada yang ingin ditanyakan?
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-mist sm:text-base">
              Sampaikan langsung ke customer service kami. Ketentuan penggunaan
              layanan dijelaskan terpisah di halaman Terms &amp; Conditions.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button variant="gold" size="lg" asChild>
                <Link href="/contact">
                  Hubungi kami
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button variant="glass" size="lg" asChild>
                <Link href="/terms">Baca Terms &amp; Conditions</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </PageShell>
  );
}
