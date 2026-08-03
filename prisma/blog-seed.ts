import sanitizeHtml from "sanitize-html";

/**
 * Starter blog content.
 *
 * Written as real articles rather than lorem ipsum: each one targets a search
 * intent the store actually wants to rank for, and each is long enough that
 * the table of contents, reading time and related-posts strip all have
 * something honest to work with.
 */

export const blogCategories = [
  {
    name: "Panduan Top Up",
    slug: "panduan-top-up",
    description: "Langkah demi langkah mengisi koin Royal Dream.",
    order: 0,
  },
  {
    name: "Tips & Strategi",
    slug: "tips-strategi",
    description: "Cara main lebih hemat dan lebih efektif.",
    order: 1,
  },
  {
    name: "Pembayaran",
    slug: "pembayaran",
    description: "QRIS, e-wallet dan transfer bank.",
    order: 2,
  },
];

export const blogTags = [
  { name: "Royal Dream", slug: "royal-dream" },
  { name: "QRIS", slug: "qris" },
  { name: "E-Wallet", slug: "e-wallet" },
  { name: "Pemula", slug: "pemula" },
  { name: "Hemat", slug: "hemat" },
  { name: "Keamanan", slug: "keamanan" },
];

export const blogAuthors = [
  {
    name: "Tim FLAZZ GROUP",
    slug: "tim-flazz-group",
    bio: "Tim admin FLAZZ GROUP yang menangani ribuan transaksi top up Royal Dream setiap bulan.",
    avatarUrl: "/logo.svg",
    websiteUrl: "",
  },
];

type SeedPost = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  featuredImageAlt: string;
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  categorySlug: string;
  tagSlugs: string[];
  /** Days before "now" the article was published. */
  daysAgo: number;
};

export const blogPosts: SeedPost[] = [
  {
    title: "Cara Top Up Royal Dream Pakai QRIS dalam 60 Detik",
    slug: "top-up-royal-dream-qris",
    excerpt:
      "Panduan lengkap membayar top up Royal Dream dengan QRIS — berlaku untuk semua e-wallet dan mobile banking, tanpa biaya tambahan.",
    seoTitle: "Cara Top Up Royal Dream Pakai QRIS (Panduan 2026)",
    seoDescription:
      "Langkah demi langkah top up Royal Dream dengan QRIS. Bisa dari DANA, GoPay, OVO, ShopeePay dan mobile banking. Koin masuk rata-rata 30 detik.",
    focusKeyword: "top up royal dream qris",
    featuredImage: "/art/service-topup.svg",
    featuredImageAlt: "Ilustrasi pembayaran QRIS untuk top up Royal Dream",
    categorySlug: "pembayaran",
    tagSlugs: ["royal-dream", "qris", "e-wallet"],
    daysAgo: 2,
    content: `
<p>QRIS adalah cara paling cepat membayar top up Royal Dream. Satu kode bisa dibaca semua e-wallet dan aplikasi mobile banking di Indonesia, jadi kamu tidak perlu punya aplikasi tertentu.</p>

<h2>Kenapa QRIS jadi pilihan utama</h2>
<p>Berbeda dengan transfer bank yang perlu pencocokan manual, pembayaran QRIS terkonfirmasi otomatis. Begitu statusnya masuk, sistem langsung memproses pesanan tanpa menunggu admin.</p>
<ul>
  <li>Terkonfirmasi otomatis, rata-rata di bawah 30 detik</li>
  <li>Tidak ada biaya admin tambahan dari kami</li>
  <li>Bisa dibayar dari aplikasi apa pun yang mendukung QRIS</li>
</ul>

<h2>Langkah top up dengan QRIS</h2>
<h3>1. Siapkan User ID</h3>
<p>Buka Royal Dream, masuk ke menu profil, lalu salin User ID kamu. Ini satu-satunya data yang kami butuhkan. Kami tidak pernah meminta password, PIN, atau kode OTP.</p>

<h3>2. Pilih nominal koin</h3>
<p>Pilih paket koin yang kamu inginkan di halaman utama. Nominal yang lebih besar punya harga per koin yang lebih murah.</p>

<h3>3. Bayar dengan QRIS</h3>
<p>Pindai kode QRIS yang muncul memakai aplikasi pembayaran favoritmu. Pastikan nominalnya sama persis sebelum menekan bayar.</p>

<h3>4. Tunggu koin masuk</h3>
<p>Setelah pembayaran terkonfirmasi, koin dikirim otomatis ke User ID yang kamu masukkan. Kalau antrean sedang padat, prosesnya paling lama 10 menit dan admin akan mengabari lewat chat.</p>

<blockquote><p>Simpan bukti pembayaran sampai koin benar-benar masuk. Kalau ada kendala, satu tangkapan layar sudah cukup untuk admin menelusuri transaksinya.</p></blockquote>

<h2>Kesalahan yang paling sering terjadi</h2>
<table>
  <thead><tr><th>Kesalahan</th><th>Akibat</th><th>Solusi</th></tr></thead>
  <tbody>
    <tr><td>Salah User ID</td><td>Koin masuk ke akun lain</td><td>Cek ulang sebelum bayar</td></tr>
    <tr><td>Nominal tidak sama</td><td>Pembayaran tertahan</td><td>Bayar sesuai angka yang tertera</td></tr>
    <tr><td>Menutup halaman terlalu cepat</td><td>Status tidak terbaca</td><td>Tunggu sampai muncul konfirmasi</td></tr>
  </tbody>
</table>

<h2>Pertanyaan yang sering muncul</h2>
<h3>Apakah QRIS kena biaya tambahan?</h3>
<p>Tidak dari sisi kami. Beberapa penerbit e-wallet menerapkan biaya sendiri untuk transaksi di atas nominal tertentu — cek aplikasi masing-masing.</p>

<h3>Berapa lama koin masuk?</h3>
<p>Rata-rata 30 detik. Maksimal 10 menit saat antrean padat.</p>
`,
  },
  {
    title: "Cara Isi Koin Royal Dream untuk Pemula",
    slug: "cara-isi-koin-royal-dream",
    excerpt:
      "Baru pertama kali mengisi koin Royal Dream? Panduan ini menjelaskan semuanya dari nol, termasuk cara menemukan User ID dan memilih nominal.",
    seoTitle: "Cara Isi Koin Royal Dream untuk Pemula (Lengkap)",
    seoDescription:
      "Panduan pemula mengisi koin Royal Dream: menemukan User ID, memilih nominal, memilih metode pembayaran, dan memastikan koin masuk dengan aman.",
    focusKeyword: "cara isi koin royal dream",
    featuredImage: "/art/coin-2.svg",
    featuredImageAlt: "Tumpukan koin Royal Dream",
    categorySlug: "panduan-top-up",
    tagSlugs: ["royal-dream", "pemula"],
    daysAgo: 6,
    content: `
<p>Mengisi koin Royal Dream sebenarnya cuma tiga langkah: siapkan User ID, pilih nominal, lalu bayar. Artikel ini membahas ketiganya secara detail supaya transaksi pertamamu berjalan lancar.</p>

<h2>Menemukan User ID Royal Dream</h2>
<p>User ID adalah nomor unik akunmu. Buka aplikasi, ketuk foto profil di pojok kiri atas, lalu lihat deretan angka di bawah nama. Ketuk untuk menyalinnya.</p>
<p>Pastikan kamu menyalin User ID, bukan nickname. Nickname bisa sama antar pemain, User ID tidak.</p>

<h2>Memilih nominal yang tepat</h2>
<p>Kalau baru mencoba, ambil nominal terkecil dulu untuk memastikan alurnya cocok. Setelah yakin, nominal besar memberi harga per koin yang lebih murah.</p>
<ol>
  <li><strong>10.000 koin</strong> — cocok untuk mencoba</li>
  <li><strong>50.000 koin</strong> — paling sering dibeli</li>
  <li><strong>500.000 koin</strong> — harga per koin termurah</li>
</ol>

<h2>Memilih metode pembayaran</h2>
<p>Tersedia QRIS, DANA, GoPay, OVO, ShopeePay, serta transfer BCA, Mandiri, BNI dan BRI. QRIS paling cepat karena terkonfirmasi otomatis.</p>

<h2>Memastikan transaksi aman</h2>
<p>Ada tiga hal yang tidak boleh kamu berikan ke siapa pun, termasuk ke orang yang mengaku admin:</p>
<ul>
  <li>Password akun</li>
  <li>PIN aplikasi pembayaran</li>
  <li>Kode OTP</li>
</ul>
<p>Kami hanya butuh User ID dan nominal. Tidak pernah lebih dari itu.</p>

<h2>Kalau koin belum masuk</h2>
<p>Kirim bukti bayar ke admin lewat Telegram atau WhatsApp. Pesanan yang gagal akan diproses ulang atau dananya dikembalikan penuh.</p>
`,
  },
  {
    title: "7 Tips Bermain Royal Dream Supaya Koin Lebih Awet",
    slug: "tips-bermain-royal-dream",
    excerpt:
      "Koin cepat habis? Tujuh kebiasaan sederhana ini membuat setiap top up Royal Dream bertahan jauh lebih lama.",
    seoTitle: "7 Tips Bermain Royal Dream Agar Koin Lebih Awet",
    seoDescription:
      "Tips menghemat koin Royal Dream: atur budget harian, manfaatkan promo mingguan, pilih nominal besar, dan hindari kesalahan yang menguras koin.",
    focusKeyword: "tips bermain royal dream",
    featuredImage: "/art/service-promo.svg",
    featuredImageAlt: "Tiket promo Royal Dream",
    categorySlug: "tips-strategi",
    tagSlugs: ["royal-dream", "hemat", "pemula"],
    daysAgo: 11,
    content: `
<p>Koin habis lebih cepat dari yang kamu kira? Biasanya bukan karena kurang beruntung, tapi karena kebiasaan kecil yang menumpuk. Tujuh tips berikut paling sering membantu pemain kami.</p>

<h2>1. Tetapkan budget harian</h2>
<p>Tentukan batas koin per hari sebelum mulai main. Batas yang ditulis jauh lebih efektif daripada batas yang cuma diingat.</p>

<h2>2. Manfaatkan promo mingguan</h2>
<p>Bonus 10% koin berlaku setiap Senin tanpa kode dan tanpa minimum. Menggeser jadwal top up ke hari Senin adalah penghematan paling mudah yang bisa kamu lakukan.</p>

<h2>3. Pilih nominal besar</h2>
<p>Harga per koin turun seiring naiknya nominal. Satu kali top up 500.000 koin lebih murah dibanding sepuluh kali top up 50.000 koin.</p>

<h2>4. Jangan mengejar kekalahan</h2>
<p>Menambah taruhan setelah kalah adalah cara tercepat menghabiskan saldo. Berhenti di batas yang sudah kamu tetapkan di poin pertama.</p>

<h2>5. Main di jam yang stabil</h2>
<p>Koneksi yang putus di tengah permainan bisa merugikan. Pastikan sinyal stabil sebelum masuk ke ronde panjang.</p>

<h2>6. Catat pengeluaran</h2>
<p>Catatan sederhana di aplikasi notes sudah cukup. Setelah dua minggu, polanya akan terlihat sendiri.</p>

<h2>7. Beli dari sumber terpercaya</h2>
<p>Harga yang jauh di bawah pasaran hampir selalu bermasalah. Pastikan penjualnya punya riwayat transaksi dan admin yang bisa dihubungi.</p>

<blockquote><p>Koin yang awet bukan soal keberuntungan, tapi soal disiplin kecil yang dilakukan berulang.</p></blockquote>
`,
  },
  {
    title: "QRIS vs E-Wallet vs Transfer Bank: Mana yang Paling Cepat?",
    slug: "qris-vs-ewallet-vs-transfer-bank",
    excerpt:
      "Perbandingan jujur tiga metode pembayaran top up: kecepatan konfirmasi, biaya, dan kapan sebaiknya memakai masing-masing.",
    seoTitle: "QRIS vs E-Wallet vs Transfer Bank untuk Top Up Game",
    seoDescription:
      "Perbandingan kecepatan, biaya dan kemudahan QRIS, e-wallet dan transfer bank untuk top up Royal Dream. Lengkap dengan tabel dan rekomendasi.",
    focusKeyword: "metode pembayaran top up",
    featuredImage: "/art/service-bongkar.svg",
    featuredImageAlt: "Perbandingan metode pembayaran",
    categorySlug: "pembayaran",
    tagSlugs: ["qris", "e-wallet", "keamanan"],
    daysAgo: 18,
    content: `
<p>Ketiganya sama-sama aman. Yang membedakan adalah kecepatan konfirmasi dan seberapa repot langkahnya. Berikut perbandingannya berdasarkan transaksi yang kami tangani.</p>

<h2>Tabel perbandingan</h2>
<table>
  <thead><tr><th>Metode</th><th>Konfirmasi</th><th>Biaya</th><th>Cocok untuk</th></tr></thead>
  <tbody>
    <tr><td>QRIS</td><td>Otomatis, ±30 detik</td><td>Tanpa biaya dari kami</td><td>Semua orang</td></tr>
    <tr><td>E-wallet langsung</td><td>Otomatis, ±1 menit</td><td>Tanpa biaya dari kami</td><td>Pengguna satu aplikasi</td></tr>
    <tr><td>Transfer bank</td><td>Manual, 5–15 menit</td><td>Tergantung bank</td><td>Nominal besar</td></tr>
  </tbody>
</table>

<h2>QRIS</h2>
<p>Paling fleksibel. Satu kode bisa dibayar dari aplikasi apa pun, dan statusnya terbaca otomatis. Untuk sebagian besar orang, ini pilihan terbaik.</p>

<h2>E-wallet langsung</h2>
<p>Kalau kamu selalu memakai satu aplikasi, membayar langsung lewat DANA, GoPay, OVO atau ShopeePay menghilangkan satu langkah pemindaian.</p>

<h2>Transfer bank</h2>
<p>Paling masuk akal untuk nominal besar yang melewati limit e-wallet. Konfirmasinya manual, jadi sertakan bukti transfer agar admin bisa memproses lebih cepat.</p>

<h2>Rekomendasi singkat</h2>
<ul>
  <li>Nominal kecil sampai menengah — <strong>QRIS</strong></li>
  <li>Sudah nyaman dengan satu e-wallet — <strong>e-wallet langsung</strong></li>
  <li>Di atas limit e-wallet — <strong>transfer bank</strong></li>
</ul>
`,
  },
  {
    title: "Ciri Penjual Top Up Terpercaya (dan Tanda Bahaya)",
    slug: "ciri-penjual-top-up-terpercaya",
    excerpt:
      "Harga murah tidak selalu berarti aman. Ini tanda-tanda penjual top up yang bisa dipercaya, dan sinyal yang sebaiknya kamu hindari.",
    seoTitle: "Ciri Penjual Top Up Terpercaya dan Tanda Penipuan",
    seoDescription:
      "Cara mengenali penjual top up game yang terpercaya: riwayat transaksi, kanal resmi, kebijakan garansi, dan tanda bahaya yang wajib dihindari.",
    focusKeyword: "penjual top up terpercaya",
    featuredImage: "/brands/royalxp.svg",
    featuredImageAlt: "Lencana penjual terpercaya",
    categorySlug: "tips-strategi",
    tagSlugs: ["keamanan", "pemula"],
    daysAgo: 25,
    content: `
<p>Setiap minggu ada saja pemain yang kehilangan uang karena membeli dari penjual yang salah. Sebagian besar kasus bisa dihindari kalau tahu apa yang harus diperiksa.</p>

<h2>Tanda penjual yang bisa dipercaya</h2>
<ul>
  <li>Punya kanal resmi yang aktif, bukan hanya akun pribadi</li>
  <li>Riwayat transaksi bisa dilihat publik</li>
  <li>Kebijakan garansi tertulis jelas</li>
  <li>Admin bisa dihubungi sebelum kamu membayar</li>
  <li>Hanya meminta User ID, tidak pernah password</li>
</ul>

<h2>Tanda bahaya</h2>
<ul>
  <li>Harga jauh di bawah pasaran tanpa alasan</li>
  <li>Meminta password, PIN atau kode OTP</li>
  <li>Menolak memberi bukti transaksi sebelumnya</li>
  <li>Mendesak kamu membayar cepat sebelum sempat mengecek</li>
  <li>Nomor rekening berganti-ganti setiap transaksi</li>
</ul>

<blockquote><p>Kalau ada yang meminta kode OTP, transaksinya sudah pasti bermasalah. Tidak ada layanan top up sah yang membutuhkannya.</p></blockquote>

<h2>Apa yang bisa kamu lakukan sebelum membayar</h2>
<p>Ajukan satu pertanyaan sederhana lewat chat dan lihat seberapa cepat serta sejelas apa jawabannya. Penjual yang serius akan menjawab dalam hitungan menit dengan bahasa yang jelas.</p>
`,
  },
];

/** Applies the same sanitiser the API uses, so seeded HTML matches saved HTML. */
export function sanitizeSeedHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "hr", "h2", "h3", "h4",
      "strong", "em", "u", "s", "code", "mark", "sub", "sup",
      "ul", "ol", "li", "blockquote", "pre",
      "a", "img", "figure", "figcaption",
      "table", "thead", "tbody", "tr", "th", "td",
      "div", "span", "iframe",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      div: ["data-callout", "data-type"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  }).trim();
}
