import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { getSettings } from "@/lib/queries";
import { siteVerification } from "@/lib/analytics/config";
import "./globals.css";

/**
 * Fonts are self-hosted (woff2 in src/fonts) rather than pulled from Google.
 * No third-party request on first paint, no layout shift, works offline.
 */
const poppins = localFont({
  src: [
    { path: "../fonts/Poppins-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Poppins-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Poppins-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/Poppins-700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/Poppins-800.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

/** Utility face — numbers, labels and status chips only. */
const monoData = localFont({
  src: [
    { path: "../fonts/JetBrainsMono-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/JetBrainsMono-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-mono-data",
  display: "swap",
  fallback: ["ui-monospace", "monospace"],
});

/**
 * Rendered when the database cannot be reached, so a page can still boot.
 *
 * Deliberately carries **no `robots` directive**. It used to say
 * `index: false`, which reads as cautious and is the opposite: metadata is
 * emitted into HTML that Next then caches, so one transient database blip
 * during an ISR regeneration bakes `noindex` into the page for a full
 * revalidate window — and if it happened during a build, into every page until
 * the next deploy. Nothing surfaces that; the site simply stops ranking.
 *
 * Emitting nothing means the page keeps whatever the route itself declares, and
 * a page with no robots tag is indexable by default. Serving a briefly generic
 * title is a much smaller harm than silently deindexing the site.
 */
const FALLBACK_METADATA: Metadata = {
  title: "FLAZZ GROUP",
  description: "Top up Royal Dream murah, cepat, terpercaya.",
};

/** Title, description, favicon and social cards all come from the database. */
export async function generateMetadata(): Promise<Metadata> {
  let settings: Awaited<ReturnType<typeof getSettings>>;

  try {
    settings = await getSettings();
  } catch (error) {
    // Metadata runs for every route. Letting a database blip throw here would
    // turn a recoverable outage into a hard failure on pages that do not
    // otherwise need the database — including the 404 and error screens.
    console.error("[metadata] settings unavailable", error);
    return FALLBACK_METADATA;
  }

  const title = settings.seoTitle || settings.siteName;
  const description = settings.seoDescription || settings.siteDescription;
  const keywords = settings.seoKeywords
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  let metadataBase: URL | undefined;
  try {
    metadataBase = new URL(settings.siteUrl);
  } catch {
    // A malformed URL should never break rendering; Next falls back to relative.
    metadataBase = undefined;
  }
  const verification = siteVerification(settings);


  return {
    metadataBase,
    title: { default: title, template: `%s | ${settings.siteName}` },
    description,
    applicationName: settings.siteName,
    ...(keywords.length > 0 ? { keywords } : {}),
    authors: [{ name: settings.siteName, url: settings.siteUrl }],
    creator: settings.siteName,
    publisher: settings.siteName,
    /**
     * No `canonical` here on purpose. Metadata is inherited, so a canonical
     * declared at the root becomes the canonical of every page that does not
     * set its own — including 404s and anything added later, each of which
     * would then declare itself a duplicate of the homepage. The homepage owns
     * its own canonical instead.
     *
     * The RSS link is not declared here either, for a subtler reason: a child
     * that sets `alternates` replaces this object rather than merging with it,
     * and every content page sets a canonical. See lib/seo.ts.
     */
    category: "games",
    openGraph: {
      type: "website",
      locale: "id_ID",
      url: settings.siteUrl,
      siteName: settings.siteName,
      title,
      description,
      ...(settings.ogImageUrl ? { images: [{ url: settings.ogImageUrl }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(settings.ogImageUrl ? { images: [settings.ogImageUrl] } : {}),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    /**
     * Search Console's ownership tag.
     *
     * Emitted from the root so it is on every page — Google checks the URL you
     * nominate, which is not always the homepage. Rendered server-side and
     * never gated on consent: it identifies the site to a crawler, not the
     * visitor to anyone.
     */
    ...(verification ? { verification: { google: verification } } : {}),
    icons: { icon: settings.faviconUrl, apple: settings.faviconUrl },
  };
}

export const viewport: Viewport = {
  themeColor: "#071321",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${poppins.variable} ${monoData.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
