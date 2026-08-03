import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  CHAT_DEFAULT_ACTIONS,
  CHAT_FALLBACK_GREETING,
} from "../src/lib/chat";
import {
  blogAuthors,
  blogCategories,
  blogPosts,
  blogTags,
  sanitizeSeedHtml,
} from "./blog-seed";

/**
 * Seeds the approved homepage content plus the single admin account.
 * Safe to re-run: content tables are only filled when empty, and the admin
 * is upserted so a changed ADMIN_PASSWORD takes effect immediately.
 */

/**
 * The seed builds its own client rather than importing src/lib/prisma.ts, and
 * on purpose: that module is the application's pooled, hot-reload-safe
 * singleton, tuned for many short web requests. This is a one-off batch job.
 *
 * It connects through `DIRECT_URL` for the same reason the Prisma CLI does
 * (see prisma.config.ts). Seeding is deploy-time work — one long-lived session
 * writing every table — which is exactly what a transaction-mode pooler is
 * not for, and the pooler also refuses the startup parameters a direct
 * connection accepts. `DATABASE_URL` remains the fallback so a single-endpoint
 * Postgres still seeds with no extra configuration.
 */
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Neither DIRECT_URL nor DATABASE_URL is set. Copy .env.example to .env first."
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@flazzgroup.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!password || password.length < 10) {
    throw new Error(
      "ADMIN_PASSWORD must be set to at least 10 characters before seeding."
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  /**
   * The seeded account is always SUPER_ADMIN, and always active.
   *
   * This is the account of last resort: if a role change or a suspension has
   * locked the owner out of the panel, re-running the seed is the documented
   * way back in. That only works if the seed restores *access*, not just the
   * password — so the role and the active flag are part of the update, not only
   * of the create.
   */
  await prisma.admin.upsert({
    where: { email },
    update: { passwordHash, role: "SUPER_ADMIN", isActive: true },
    create: {
      email,
      name: "Administrator",
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  console.log(`  admin        ${email} (SUPER_ADMIN)`);
}

async function seedSettings() {
  /**
   * `getSettings()` creates a bare settings row on first read, so a deploy
   * that gets any traffic before the seed runs ends up with every text field
   * empty — no meta description, no ticker, no footer. Re-running the seed
   * must repair that, while never overwriting a value the owner has set.
   */
  const existing = await prisma.websiteSettings.findUnique({
    where: { id: "settings" },
  });

  const defaults = {
    siteName: "FLAZZ GROUP",
    siteDescription:
      "FLAZZ GROUP — pusat top up Royal Dream & layanan gaming. Proses instan 24 jam, harga termurah, pembayaran QRIS, e-wallet, dan transfer bank.",
    siteUrl: SITE_URL,
    logoUrl: "/logo.svg",
    faviconUrl: "/logo.svg",
    seoTitle: "FLAZZ GROUP — Top Up Royal Dream Murah, Cepat, Terpercaya",
    seoDescription:
      "FLAZZ GROUP — pusat top up Royal Dream & layanan gaming. Proses instan 24 jam, harga termurah, pembayaran QRIS, e-wallet, dan transfer bank.",
    seoKeywords:
      "top up Royal Dream, Royal Dream murah, top up game, FLAZZ GROUP, ROYALXP, jasa bongkar Royal Dream, top up QRIS, top up 24 jam",
    tickerEnabled: true,
    tickerText: "Bonus 10% koin setiap Senin — otomatis masuk tanpa kode.",
    footerTagline: "Top up Royal Dream murah, cepat, terpercaya.",
    footerCopyright: "FLAZZ GROUP. Seluruh hak cipta dilindungi.",
    footerDisclaimer: "Bukan afiliasi resmi penerbit game mana pun",
    telegramUrl: "https://t.me/flazzgroup",
    whatsappUrl: "https://wa.me/6280000000000",
    instagramUrl: "https://instagram.com/flazzgroup",
    tiktokUrl: "https://tiktok.com/@flazzgroup",
    youtubeUrl: "https://youtube.com/@flazzgroup",
    chatGreeting: CHAT_FALLBACK_GREETING,
  } as const;

  if (!existing) {
    await prisma.websiteSettings.create({
      // The quick actions are a Json column, so they sit outside `defaults` —
      // that loop only repairs blank strings on an existing row.
      data: { id: "settings", ...defaults, chatQuickActions: CHAT_DEFAULT_ACTIONS },
    });
    console.log("  settings     created");
    return;
  }

  // Only fill fields that are still blank; anything already configured stays.
  const repairs: Record<string, string> = {};

  for (const [key, value] of Object.entries(defaults)) {
    if (typeof value !== "string") continue;
    if ((existing as Record<string, unknown>)[key] === "") {
      repairs[key] = value;
    }
  }

  if (Object.keys(repairs).length === 0) {
    console.log("  settings     ok (already configured)");
    return;
  }

  await prisma.websiteSettings.update({
    where: { id: "settings" },
    data: repairs,
  });

  console.log(
    `  settings     repaired ${Object.keys(repairs).length} empty field(s)`
  );
}

async function seedIfEmpty<T>(
  label: string,
  count: () => Promise<number>,
  create: () => Promise<T>
) {
  const existing = await count();

  if (existing > 0) {
    console.log(`  ${label.padEnd(12)} skipped (${existing} rows)`);
    return;
  }

  await create();
  console.log(`  ${label.padEnd(12)} seeded`);
}

async function main() {
  console.log("Seeding FLAZZ GROUP…");

  await seedAdmin();
  await seedSettings();

  await seedIfEmpty(
    "banners",
    () => prisma.heroBanner.count(),
    () =>
      prisma.heroBanner.createMany({
        // A banner is artwork and a destination. The placeholders below are the
        // bundled illustrations; replace them in /admin/banners with real
        // full-width slides, which is where the headline copy now lives.
        data: [
          {
            imageUrl: "/art/hero-vault.svg",
            imageAlt: "Top up Royal Dream — murah, cepat, terpercaya",
            destinationUrl: "#royal-dream",
            order: 0,
          },
          {
            imageUrl: "/art/hero-promo.svg",
            imageAlt: "Bonus koin setiap Senin, tanpa minimum pembelian",
            destinationUrl: "#promo",
            order: 1,
          },
          {
            imageUrl: "/art/hero-support.svg",
            imageAlt: "Customer service 24 jam nonstop lewat Telegram dan WhatsApp",
            destinationUrl: "https://t.me/flazzgroup",
            order: 2,
          },
        ],
      })
  );

  await seedIfEmpty(
    "hero stats",
    () => prisma.heroStat.count(),
    () =>
      prisma.heroStat.createMany({
        data: [
          { value: "128K+", label: "Pesanan selesai", order: 0 },
          { value: "4.9/5", label: "Rating pembeli", order: 1 },
          { value: "< 30 dtk", label: "Rata-rata proses", order: 2 },
          { value: "6", label: "Brand resmi", order: 3 },
        ],
      })
  );

  await seedIfEmpty(
    "popular",
    () => prisma.popularService.count(),
    () =>
      prisma.popularService.createMany({
        data: [
          {
            title: "Royal Dream Top Up",
            description: "Koin masuk otomatis, cukup isi ID.",
            priceLabel: "Mulai Rp 13.000",
            badge: "Terlaris",
            href: "#royal-dream",
            imageUrl: "/art/service-topup.svg",
            accent: "GOLD",
            order: 0,
          },
          {
            title: "Royal Dream Bongkar",
            description: "Dibantu admin, aman & bergaransi.",
            priceLabel: "Mulai Rp 50.000",
            badge: "Dibantu admin",
            href: "#royal-dream",
            imageUrl: "/art/service-bongkar.svg",
            accent: "VOLT",
            order: 1,
          },
          {
            title: "Promo Mingguan",
            description: "Bonus koin tiap Senin, stok terbatas.",
            priceLabel: "Bonus 10%",
            badge: "Promo",
            href: "#promo",
            imageUrl: "/art/service-promo.svg",
            accent: "GOLD",
            order: 2,
          },
        ],
      })
  );

  await seedIfEmpty(
    "products",
    () => prisma.product.count(),
    () =>
      prisma.product.createMany({
        data: [
          {
            title: "10.000",
            unit: "Koin",
            description: "Proses instan",
            price: 13000,
            imageUrl: "/art/coin-1.svg",
            order: 0,
          },
          {
            title: "25.000",
            unit: "Koin",
            description: "Proses instan",
            price: 31000,
            imageUrl: "/art/coin-1.svg",
            order: 1,
          },
          {
            title: "50.000",
            unit: "Koin",
            description: "Paling sering dibeli",
            price: 60000,
            strikePrice: 65000,
            badge: "Terlaris",
            // Colour is data now, not something the word "Terlaris" implies.
            badgeColor: "GOLD" as const,
            imageUrl: "/art/coin-2.svg",
            order: 2,
          },
          {
            title: "100.000",
            unit: "Koin",
            description: "Hemat Rp 7.000",
            price: 118000,
            strikePrice: 125000,
            badge: "Hemat",
            imageUrl: "/art/coin-2.svg",
            order: 3,
          },
          {
            title: "250.000",
            unit: "Koin",
            description: "Untuk main jangka panjang",
            price: 290000,
            imageUrl: "/art/coin-3.svg",
            order: 4,
          },
          {
            title: "500.000",
            unit: "Koin",
            description: "Harga per koin termurah",
            price: 575000,
            strikePrice: 620000,
            badge: "Best value",
            imageUrl: "/art/coin-3.svg",
            order: 5,
          },
          {
            title: "Bongkar Akun",
            unit: "Jasa",
            description: "Dikerjakan admin, bergaransi",
            price: 50000,
            badge: "Jasa",
            tier: "SERVICE",
            imageUrl: "/art/thumb-bongkar.svg",
            order: 6,
          },
          {
            title: "Paket Mingguan",
            unit: "Bundle",
            description: "Bonus 10% koin tiap Senin",
            price: 99000,
            badge: "Promo",
            tier: "SERVICE",
            imageUrl: "/art/thumb-promo.svg",
            order: 7,
          },
        ],
      })
  );

  await seedIfEmpty(
    "brands",
    () => prisma.brand.count(),
    () =>
      prisma.brand.createMany({
        data: [
          {
            name: "ROYALXP",
            description: "Top up & jasa Royal Dream",
            logoUrl: "/brands/royalxp.svg",
            link: "#royal-dream",
            status: "ONLINE",
            hue: "#FFD54A",
            order: 0,
          },
          {
            name: "FLAZZ GAMING",
            description: "Toko utama grup",
            logoUrl: "/brands/flazz-gaming.svg",
            link: "#royal-dream",
            status: "ONLINE",
            hue: "#2E7CF6",
            order: 1,
          },
          {
            name: "THANOZ STORE",
            description: "Reseller resmi",
            logoUrl: "/brands/thanoz.svg",
            link: "#royal-dream",
            status: "ONLINE",
            hue: "#A374FF",
            order: 2,
          },
          {
            name: "RICKNMORTY",
            description: "Top up cepat 24 jam",
            logoUrl: "/brands/ricknmorty.svg",
            link: "#royal-dream",
            status: "ONLINE",
            hue: "#35E0A1",
            order: 3,
          },
          {
            name: "WINMAX",
            description: "Promo & bundling",
            logoUrl: "/brands/winmax.svg",
            link: "#promo",
            status: "ONLINE",
            hue: "#FF7A59",
            order: 4,
          },
          {
            name: "NEOPARTY",
            description: "Event & giveaway",
            logoUrl: "/brands/neoparty.svg",
            link: "#community",
            status: "COMING_SOON",
            hue: "#7FB0FF",
            order: 5,
          },
        ],
      })
  );

  await seedIfEmpty(
    "features",
    () => prisma.feature.count(),
    () =>
      prisma.feature.createMany({
        data: [
          { icon: "zap", title: "Proses instan", description: "Rata-rata 30 detik", order: 0 },
          { icon: "shield", title: "Transaksi aman", description: "Data terenkripsi", order: 1 },
          { icon: "clock", title: "Buka 24 jam", description: "Termasuk hari libur", order: 2 },
          { icon: "card", title: "Banyak pembayaran", description: "9 metode aktif", order: 3 },
          { icon: "star", title: "Terpercaya", description: "128K+ pesanan", order: 4 },
          { icon: "chat", title: "CS responsif", description: "Balas < 3 menit", order: 5 },
        ],
      })
  );

  await seedIfEmpty(
    "payments",
    () => prisma.paymentMethod.count(),
    () =>
      prisma.paymentMethod.createMany({
        data: [
          { name: "QRIS", kind: "Scan", hue: "#E4405F", order: 0 },
          { name: "DANA", kind: "E-wallet", hue: "#118EEA", order: 1 },
          { name: "GoPay", kind: "E-wallet", hue: "#00AED6", order: 2 },
          { name: "OVO", kind: "E-wallet", hue: "#4C3494", order: 3 },
          { name: "ShopeePay", kind: "E-wallet", hue: "#EE4D2D", order: 4 },
          { name: "BCA", kind: "Transfer", hue: "#0066AE", order: 5 },
          { name: "Mandiri", kind: "Transfer", hue: "#FFC629", order: 6 },
          { name: "BNI", kind: "Transfer", hue: "#F26F21", order: 7 },
          { name: "BRI", kind: "Transfer", hue: "#00529C", order: 8 },
        ],
      })
  );

  await seedIfEmpty(
    "community",
    () => prisma.communityLink.count(),
    () =>
      prisma.communityLink.createMany({
        data: [
          {
            icon: "telegram",
            title: "Telegram",
            description: "Order & tanya admin langsung.",
            meta: "Balas < 3 menit",
            ctaLabel: "Buka Telegram",
            url: "https://t.me/flazzgroup",
            hue: "#2E7CF6",
            order: 0,
          },
          {
            icon: "whatsapp",
            title: "WhatsApp",
            description: "Lebih suka WA? Admin siap.",
            meta: "Online 24 jam",
            ctaLabel: "Chat WhatsApp",
            url: "https://wa.me/6280000000000",
            hue: "#35E0A1",
            order: 1,
          },
          {
            icon: "megaphone",
            title: "Official Channel",
            description: "Info promo & harga terbaru.",
            meta: "Update harian",
            ctaLabel: "Ikuti Channel",
            url: "https://t.me/flazzgroup_official",
            hue: "#FFD54A",
            order: 2,
          },
          {
            icon: "users",
            title: "Community Group",
            description: "Ngobrol bareng player lain.",
            meta: "12.400 member",
            ctaLabel: "Gabung Grup",
            url: "https://t.me/flazzgroup_chat",
            hue: "#A374FF",
            order: 3,
          },
        ],
      })
  );

  await seedIfEmpty(
    "faqs",
    () => prisma.faq.count(),
    () =>
      prisma.faq.createMany({
        data: [
          {
            question: "Berapa lama proses top up Royal Dream?",
            answer:
              "Rata-rata 30 detik setelah pembayaran terkonfirmasi. Saat antrean padat maksimal 10 menit, dan admin akan mengabari lewat chat.",
            order: 0,
          },
          {
            question: "Data apa yang dibutuhkan untuk order?",
            answer:
              "Cukup User ID dan nominal koin. Kami tidak pernah meminta password, PIN, atau kode OTP akun kamu.",
            order: 1,
          },
          {
            question: "Metode pembayaran apa saja yang tersedia?",
            answer:
              "QRIS, DANA, GoPay, OVO, ShopeePay, serta transfer BCA, Mandiri, BNI, dan BRI.",
            order: 2,
          },
          {
            question: "Apa itu layanan Bongkar Akun?",
            answer:
              "Layanan berbantuan admin untuk membuka progres akun Royal Dream. Dikerjakan manual, bergaransi, dan status dikabari sampai selesai.",
            order: 3,
          },
          {
            question: "Kalau koin tidak masuk, bagaimana?",
            answer:
              "Kirim bukti bayar ke admin Telegram atau WhatsApp. Pesanan gagal diproses ulang atau dana dikembalikan penuh.",
            order: 4,
          },
          {
            question: "Apakah semua brand di FLAZZ GROUP resmi?",
            answer:
              "Ya. ROYALXP, FLAZZ GAMING, THANOZ STORE, RICKNMORTY, WINMAX, dan NEOPARTY berada di bawah satu manajemen dengan sistem harga yang sama.",
            order: 5,
          },
        ],
      })
  );

  await seedBlog();

  console.log("Done.");
}

/** Blog taxonomy and starter articles. Idempotent: keyed on slug. */
async function seedBlog() {
  for (const author of blogAuthors) {
    await prisma.author.upsert({
      where: { slug: author.slug },
      update: {},
      create: author,
    });
  }

  for (const category of blogCategories) {
    await prisma.blogCategory.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  for (const tag of blogTags) {
    await prisma.blogTag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: tag,
    });
  }

  const author = await prisma.author.findFirst();
  let created = 0;

  for (const post of blogPosts) {
    const existing = await prisma.blogPost.findUnique({
      where: { slug: post.slug },
    });
    if (existing) continue;

    const content = sanitizeSeedHtml(post.content);
    const contentText = content
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const category = await prisma.blogCategory.findUnique({
      where: { slug: post.categorySlug },
    });

    const publishedAt = new Date();
    publishedAt.setDate(publishedAt.getDate() - post.daysAgo);

    await prisma.blogPost.create({
      data: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content,
        contentText,
        featuredImage: post.featuredImage,
        featuredImageAlt: post.featuredImageAlt,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        focusKeyword: post.focusKeyword,
        status: "PUBLISHED",
        publishedAt,
        readingMinutes: Math.max(
          1,
          Math.ceil(contentText.split(/\s+/).filter(Boolean).length / 200)
        ),
        authorId: author?.id ?? null,
        categoryId: category?.id ?? null,
        tags: { connect: post.tagSlugs.map((slug) => ({ slug })) },
      },
    });
    created += 1;
  }

  console.log(
    `  blog         ${created} created, ${blogPosts.length - created} already present`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
