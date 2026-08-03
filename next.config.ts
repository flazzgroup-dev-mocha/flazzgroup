import type { NextConfig } from "next";

/**
 * Baseline security headers.
 *
 * `script-src` and `style-src` allow 'unsafe-inline' because Next injects an
 * inline bootstrap script and the design sets inline `style` attributes for
 * per-row accent colours. Removing that allowance requires per-request nonces
 * threaded through middleware — worth doing, but it is a behavioural change
 * rather than a header tweak, so it is left as a documented follow-up.
 *
 * What this policy does buy today: no external scripts, no framing, no
 * plugins, no base-tag hijacking, and forms can only post back to this origin.
 */

/**
 * Uploaded media is delivered by Cloudinary's CDN, so images are the one
 * resource type that is legitimately cross-origin. Every other directive stays
 * locked to 'self'.
 *
 * The host is the same for every Cloudinary account — the cloud name is the
 * first path segment, not a subdomain — so this is a literal rather than
 * something derived from CLOUDINARY_CLOUD_NAME.
 */
const CLOUDINARY_HOST = "https://res.cloudinary.com";

/**
 * Hosts the analytics tags need, split by what each directive actually governs.
 *
 * Listing a host here does not load anything: every tag is gated behind consent
 * in <Analytics>, and a visitor who declines never causes a request to any of
 * them. This only means that when a tag *is* loaded, the browser does not
 * silently refuse it — which is precisely how the first version of this failed,
 * with the scripts requested, blocked, and no symptom beyond empty reports.
 */
const ANALYTICS = {
  // The libraries themselves. The doubleclick/googleadservices pair is Google
  // Ads conversion tracking, which gtag loads from a different origin than
  // everything else Google — easy to miss until conversions silently stop.
  script: [
    "https://www.googletagmanager.com",
    "https://connect.facebook.net",
    "https://www.clarity.ms",
    "https://scripts.clarity.ms",
    "https://googleads.g.doubleclick.net",
    "https://www.googleadservices.com",
  ],
  // Where they beacon measurements back to.
  connect: [
    "https://www.google-analytics.com",
    "https://analytics.google.com",
    "https://*.analytics.google.com",
    "https://*.google-analytics.com",
    "https://www.googletagmanager.com",
    "https://connect.facebook.net",
    "https://*.facebook.com",
    "https://*.clarity.ms",
    "https://c.bing.com",
    "https://ad.doubleclick.net",
    "https://googleads.g.doubleclick.net",
    "https://www.googleadservices.com",
    "https://www.google.com",
  ],
  // Tracking pixels, still delivered as 1×1 images by every one of them.
  img: [
    "https://www.googletagmanager.com",
    "https://www.googleadservices.com",
    "https://ad.doubleclick.net",
    "https://www.google-analytics.com",
    "https://*.google-analytics.com",
    "https://www.facebook.com",
    "https://*.facebook.com",
    "https://*.clarity.ms",
    "https://c.bing.com",
    "https://googleads.g.doubleclick.net",
    /**
     * Google Ads remarketing pixels are served from the visitor's *local*
     * Google domain — google.co.id for this audience, google.de for a German
     * one — and CSP has no wildcard that spans TLDs. Only the markets actually
     * advertised into need listing.
     *
     * Conversion *counting* does not depend on these: that goes to
     * googleads.g.doubleclick.net above. What is lost when one is missing is
     * remarketing audience membership, which fails silently, so add the
     * matching domain before running ads in a new country.
     */
    "https://www.google.com",
    "https://www.google.co.id",
  ],
  // Google Ads conversion tracking still uses an iframe for cross-domain state.
  frame: ["https://td.doubleclick.net", "https://www.googletagmanager.com"],
} as const;

const join = (hosts: readonly string[]) => hosts.join(" ");

/**
 * `unsafe-eval` is a development-only allowance.
 *
 * React Refresh and the dev-mode module runtime evaluate code at runtime, so
 * `next dev` does not work without it. A production bundle never calls `eval`
 * or `new Function`, and leaving the allowance in the deployed policy hands an
 * attacker who finds any injection point the ability to turn a data string into
 * executing code — which is most of what CSP is bought for.
 *
 * `unsafe-inline` unfortunately has to stay in both: Next emits an inline
 * bootstrap script, the analytics tags are inline snippets, and the design sets
 * inline `style` attributes. Removing it needs per-request nonces threaded
 * through middleware, which makes every page dynamic — a real change, tracked
 * as a follow-up rather than smuggled into a header tweak.
 */
const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${join(ANALYTICS.script)}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${CLOUDINARY_HOST} ${join(ANALYTICS.img)}`,
  "font-src 'self' data:",
  `connect-src 'self' ${join(ANALYTICS.connect)}`,
  "media-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  `frame-src ${join(ANALYTICS.frame)}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    // Only honoured over HTTPS, so it is inert in local development.
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  images: {
    /**
     * Optimisation is Cloudinary's job now — see image-loader.ts.
     *
     * Note that setting `loaderFile` turns off Next's own `/_next/image`
     * endpoint completely, for every image. That is fine here because the only
     * non-Cloudinary images left are the bundled vectors in /public, but it
     * does mean the loader must never return a `/_next/image` URL: it would
     * 404.
     */
    loader: "custom",
    loaderFile: "./image-loader.ts",

    /**
     * Still live with a custom loader: these are the widths next/image puts in
     * each `srcset` and hands to the loader. Everything else the `images` block
     * can hold — formats, remotePatterns, minimumCacheTTL, the SVG allowances —
     * configures the built-in optimizer, which `loaderFile` switches off, so it
     * was removed rather than left looking like it did something.
     */
    deviceSizes: [390, 640, 828, 1080, 1200, 1920],
    imageSizes: [64, 96, 128, 256, 384],
  },

  // Ship smaller client bundles by tree-shaking icon and motion imports.
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "@dnd-kit/core"],
  },

  /**
   * Which user agents get metadata rendered into <head> instead of streamed
   * into the body.
   *
   * Next's default list covers Google, Bing, Facebook, Twitter, LinkedIn,
   * Slack, Discord and WhatsApp, but not Telegram — and Telegram is this
   * store's main channel, so a shared link would preview without its title,
   * description or image. This is the default list plus the messengers and
   * crawlers that matter here. Setting it replaces the default, so every
   * original entry is repeated.
   */
  htmlLimitedBots:
    /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight|TelegramBot|Telegram|Pinterest|Mastodon|Threads|Iframely|Embedly|Google-InspectionTool/i,

  poweredByHeader: false,
  compress: true,

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
    ];
  },
};

export default nextConfig;
