import { z } from "zod";

/**
 * Every write path — API route handler and admin form alike — validates
 * against these schemas, so the rules live in exactly one place.
 */

const trimmed = z.string().trim();

/** Strips control characters, which have no place in any of this content. */
const clean = (max: number) =>
  trimmed
    .max(max, `Must be ${max} characters or fewer.`)
     
    .transform((v) => v.replace(/[\u0000-\u001F\u007F]/g, "").trim());

/**
 * Same as `clean`, but newlines survive.
 *
 * `clean` strips the whole C0 range, which includes \n — correct for a title or
 * a URL, and destructive for anything an author writes across several lines.
 * The chat greeting and its pre-filled messages are exactly that: the line
 * breaks are the formatting.
 */
const multiline = (max: number) =>
  trimmed
    .max(max, `Must be ${max} characters or fewer.`)
    .transform((v) =>
      v
        // Normalise CRLF first, then strip every control character except
        // the newline itself, which is the formatting being preserved.
        .replace(/\r\n?/g, "\n")
        .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "")
        .trim()
    );

const required = (label: string, max = 200) =>
  clean(max).refine((v) => v.length > 0, `${label} is required.`);

const optional = (max = 300) => clean(max).default("");

/**
 * Is this a destination we are willing to store?
 *
 * Empty, an in-page anchor, a same-site path, or an absolute http(s) URL.
 *
 * The rejection that matters is the **protocol-relative** form. `//evil.com`
 * starts with `/`, so a naive `^(https?:\/\/|\/|#)` accepted it — and a browser
 * reads it as "same scheme, different host". The damage differed by field: in a
 * banner's `destinationUrl` it became a same-tab navigation off-site that also
 * skipped `rel="noopener noreferrer"`, because the code deciding that asks
 * `startsWith("http")`; in a post's `canonicalUrl` it resolved against
 * `metadataBase` into `https://evil.com` and told Google the article was a
 * duplicate of someone else's page.
 *
 * `/\evil.com` is rejected for the same reason: browsers normalise a backslash
 * to a forward slash in the authority position, so it is `//evil.com` wearing a
 * hat.
 *
 * Absolute URLs go through the URL parser rather than a regex, so the scheme is
 * whatever the browser will actually see — no amount of casing, whitespace or
 * embedded credentials changes `url.protocol`.
 */
function isStorableLink(value: string) {
  if (value === "") return true;
  if (value.startsWith("#")) return true;

  // "//evil.com", "///evil.com", "/\evil.com" — every scheme-relative spelling.
  if (/^\/[/\\]/.test(value)) return false;
  if (value.startsWith("/")) return true;

  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * A link field.
 *
 * Defaulted to "" so an optional field can simply be omitted. Without that, a
 * caller sending only the fields it changed gets "Invalid input" on every link
 * it left out — the admin forms happen to post everything, so the whole class
 * of failure was invisible until an API client did the reasonable thing.
 */
const linkSchema = clean(500)
  .refine(
    isStorableLink,
    "Enter a full https:// URL, a path starting with /, or an #anchor."
  )
  .default("");

/** Still rejects an omitted value: the default is "", which fails the check. */
const requiredLink = linkSchema.refine((v) => v.length > 0, "A link is required.");

/**
 * Root-relative upload path or absolute URL.
 *
 * Same protocol-relative rule as `linkSchema`, minus anchors: `//evil.com/x.png`
 * would otherwise be stored as an image source pointing at another host.
 */
const imageSchema = clean(500)
  .refine(
    (v) => v !== "#" && !v.startsWith("#") && isStorableLink(v),
    "Enter an image URL or upload a file."
  )
  .default("");

const requiredImage = imageSchema.refine(
  (v) => v.length > 0,
  "An image is required."
);

/**
 * Optional image column. Accepts "", null or undefined — the database stores
 * null, so a round-trip of an existing row must not be rejected.
 */
const optionalImage = z
  .union([imageSchema, z.null(), z.undefined()])
  .transform((v) => (v ? v : null));

const hexColor = clean(9).refine(
  (v) => /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v),
  "Enter a hex colour such as #2E7CF6."
);

const order = z.coerce.number().int().min(0).max(9999).default(0);

/**
 * A checkbox, however it arrives — a real boolean, or the strings a form post
 * produces.
 *
 * Omitting it yields `undefined` rather than `false`, which Prisma reads as
 * "don't touch": a create falls back to the column default (`isActive` is true)
 * and an update leaves the flag alone. Defaulting to `false` here would mean an
 * API client that left the key out silently hid the row it just saved.
 */
const boolish = z
  .union([z.boolean(), z.literal("true"), z.literal("false"), z.literal("on")])
  .optional()
  .transform((v) =>
    v === undefined ? undefined : v === true || v === "true" || v === "on"
  );

// ------------------------------------------------------------------ auth

export const loginSchema = z.object({
  email: clean(200).pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Enter your password.").max(200),
});

// ------------------------------------------------------------ accounts

/**
 * A password an operator sets for someone else.
 *
 * Twelve characters and no composition rules. Length is what resists guessing;
 * "must contain a symbol" mostly produces `Password1!` and a sticky note. The
 * upper bound exists because bcrypt silently truncates past 72 bytes, so a
 * longer one would be quietly weakened rather than rejected.
 */
const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(72, "Must be 72 characters or fewer.");

export const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"] as const;

export const createAdminSchema = z.object({
  name: required("Name", 80),
  email: clean(200).pipe(z.email("Enter a valid email address.")),
  password: passwordSchema,
  role: z.enum(ADMIN_ROLES).default("ADMIN"),
  avatarUrl: imageSchema,
  isActive: boolish,
});

/**
 * Editing an existing account.
 *
 * No password field: changing someone's password is a different, louder action
 * with its own endpoint and its own audit entry. Folding it into a general
 * "save" would mean a password reset could happen as a side effect of fixing a
 * typo in a name.
 */
export const updateAdminSchema = z.object({
  name: required("Name", 80),
  email: clean(200).pipe(z.email("Enter a valid email address.")),
  role: z.enum(ADMIN_ROLES),
  avatarUrl: imageSchema,
  isActive: boolish,
});

export const resetPasswordSchema = z.object({ password: passwordSchema });

// ------------------------------------------------------------- analytics

/**
 * An optional third-party ID with a known shape.
 *
 * Empty is always allowed — that is how an integration is left unconfigured —
 * but a non-empty value has to look like the thing it claims to be.
 */
const analyticsId = (pattern: RegExp, example: string) =>
  clean(60).refine(
    (v) => v === "" || pattern.test(v),
    `Doesn't look right — expected something like ${example}.`
  );

// ------------------------------------------------------------------ chat

export const CHAT_CHANNELS = ["WHATSAPP", "TELEGRAM"] as const;

/**
 * One button in the chat panel.
 *
 * `message` is pre-filled into the chosen app, so it keeps its line breaks and
 * is capped well below what a URL can carry once encoded.
 */
export const chatQuickActionSchema = z.object({
  label: required("Label", 60),
  message: multiline(400).refine(
    (v) => v.length > 0,
    "A message is required — it is what gets pre-filled."
  ),
  channel: z.enum(CHAT_CHANNELS).default("WHATSAPP"),
});

export type ChatQuickAction = z.output<typeof chatQuickActionSchema>;

/**
 * Just the floating chat.
 *
 * A strict subset of `settingsSchema`, and the security boundary for the chat
 * endpoint rather than a convenience: Zod strips unknown keys, so a request
 * carrying `siteUrl` or `gtmId` alongside `chatTitle` loses them here, before
 * anything reaches Prisma. That is why an ADMIN can be given the chat without
 * being given the rest of the row it happens to live in.
 */
export const chatSettingsSchema = z.object({
  chatEnabled: boolish,
  chatLogoUrl: imageSchema,
  chatTitle: optional(60),
  chatSubtitle: optional(60),
  chatGreeting: multiline(400).default(""),
  chatPosition: z.enum(["LEFT", "RIGHT"]).default("RIGHT"),
  chatQuickActions: z.array(chatQuickActionSchema).max(6).default([]),
});

export type ChatSettingsInput = z.input<typeof chatSettingsSchema>;

// -------------------------------------------------------------- settings

export const settingsSchema = z.object({
  siteName: required("Website name", 120),
  siteDescription: optional(400),
  siteUrl: clean(300).refine(
    (v) => /^https?:\/\//i.test(v),
    "Enter a full URL including https://"
  ),
  logoUrl: requiredImage,
  faviconUrl: requiredImage,

  seoTitle: required("SEO title", 200),
  seoDescription: optional(400),
  seoKeywords: optional(500),
  ogImageUrl: optionalImage,

  tickerEnabled: boolish,
  tickerText: optional(200),

  footerTagline: optional(300),
  footerCopyright: optional(300),
  footerDisclaimer: optional(300),

  telegramUrl: linkSchema,
  whatsappUrl: linkSchema,
  instagramUrl: linkSchema,
  tiktokUrl: linkSchema,
  youtubeUrl: linkSchema,

  showHero: boolish,
  showPopular: boolish,
  showProducts: boolish,
  showBrands: boolish,
  showFeatures: boolish,
  showPayment: boolish,
  showCommunity: boolish,
  showFaq: boolish,

  /**
   * The floating chat is deliberately absent — it belongs to
   * `chatSettingsSchema` and its own endpoint now.
   *
   * Leaving the keys here would be worse than untidy. Every one of them carries
   * a default, and the settings form no longer sends them, so each save would
   * quietly reset the greeting to "", the position to RIGHT and the quick
   * actions to an empty array. A field an endpoint no longer collects must stop
   * being a field that endpoint writes.
   */

  // ---------------------------------------------------------- analytics
  //
  // Each ID is shape-checked rather than just length-checked. A GTM container
  // pasted into the GA4 field silently measures nothing, and the only symptom
  // is an empty report a fortnight later — the kind of mistake worth catching
  // at the point someone makes it.
  gtmId: analyticsId(/^GTM-[A-Z0-9]{4,10}$/i, "GTM-XXXXXXX"),
  gtmEnabled: boolish,
  ga4Id: analyticsId(/^G-[A-Z0-9]{6,12}$/i, "G-XXXXXXXXXX"),
  ga4Enabled: boolish,
  metaPixelId: analyticsId(/^\d{10,20}$/, "a 15-16 digit number"),
  metaPixelEnabled: boolish,
  clarityId: analyticsId(/^[a-z0-9]{6,20}$/i, "a short alphanumeric ID"),
  clarityEnabled: boolish,
  googleAdsId: analyticsId(/^AW-\d{9,12}$/i, "AW-123456789"),
  googleAdsConversionLabel: optional(60),
  googleAdsEnabled: boolish,
  googleSiteVerification: optional(120),
});

export type SettingsInput = z.input<typeof settingsSchema>;

// ------------------------------------------------------------------ hero

/**
 * A hero slide carries its message in the artwork, so the CMS validates the
 * picture, the optional phone crop and where it links — nothing else.
 *
 * The deprecated copy columns are intentionally absent: unknown keys are
 * stripped, so an old client still posting them gets a clean row rather than
 * an error.
 */
export const heroBannerSchema = z.object({
  imageUrl: requiredImage,
  mobileImageUrl: imageSchema,
  imageAlt: optional(200),
  destinationUrl: linkSchema,
  isActive: boolish,
  order,
});

export const heroStatSchema = z.object({
  value: required("Value", 40),
  label: required("Label", 80),
  isActive: boolish,
  order,
});

// --------------------------------------------------------------- popular

export const popularServiceSchema = z.object({
  title: required("Title", 120),
  description: optional(200),
  priceLabel: optional(60),
  badge: optional(40),
  href: linkSchema,
  imageUrl: requiredImage,
  accent: z.enum(["GOLD", "VOLT"]).default("GOLD"),
  isActive: boolish,
  order,
});

// -------------------------------------------------------------- products

export const productSchema = z.object({
  title: required("Title", 80),
  unit: optional(40),
  description: optional(160),
  price: z.coerce.number().int().min(0).max(1_000_000_000),
  strikePrice: z
    .union([z.coerce.number().int().min(0).max(1_000_000_000), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  badge: optional(40),
  /**
   * Which of the two badge treatments to use.
   *
   * Defaulted rather than required so an API client that leaves it out gets the
   * ordinary badge, which is what every product had before this existed.
   */
  badgeColor: z.enum(["DEFAULT", "GOLD"]).default("DEFAULT"),
  tier: z.enum(["COIN", "SERVICE"]).default("COIN"),
  imageUrl: requiredImage,
  buttonLink: requiredLink,
  isActive: boolish,
  order,
});

// ---------------------------------------------------------------- brands

export const brandSchema = z.object({
  name: required("Brand name", 80),
  description: optional(200),
  logoUrl: requiredImage,
  link: requiredLink,
  status: z.enum(["ONLINE", "MAINTENANCE", "COMING_SOON"]).default("ONLINE"),
  hue: hexColor,
  showOnHomepage: boolish,
  order,
});

// -------------------------------------------------------------- features

export const FEATURE_ICONS = [
  "zap",
  "shield",
  "clock",
  "card",
  "star",
  "chat",
  "crown",
  "rocket",
] as const;

export const featureSchema = z.object({
  icon: z.enum(FEATURE_ICONS).default("zap"),
  title: required("Title", 80),
  description: optional(120),
  isActive: boolish,
  order,
});

// -------------------------------------------------------------- payments

export const paymentMethodSchema = z.object({
  name: required("Name", 60),
  kind: optional(40),
  logoUrl: optionalImage,
  hue: hexColor,
  isActive: boolish,
  order,
});

// ------------------------------------------------------------- community

export const COMMUNITY_ICONS = [
  "telegram",
  "whatsapp",
  "megaphone",
  "users",
] as const;

export const communityLinkSchema = z.object({
  icon: z.enum(COMMUNITY_ICONS).default("telegram"),
  title: required("Title", 80),
  description: optional(200),
  meta: optional(60),
  ctaLabel: required("Button label", 60),
  url: requiredLink,
  hue: hexColor,
  isActive: boolish,
  order,
});

// ------------------------------------------------------------------- faq

export const faqSchema = z.object({
  question: required("Question", 300),
  answer: required("Answer", 2000),
  isActive: boolish,
  order,
});

// --------------------------------------------------------------- reorder

export const reorderSchema = z.object({
  ids: z.array(z.string().min(1).max(60)).min(1).max(200),
});

// ----------------------------------------------------------------- utils

export type FieldErrors = Record<string, string>;

/** Flattens a ZodError into `{ fieldName: firstMessage }`. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};

  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!errors[key]) errors[key] = issue.message;
  }

  return errors;
}

// ------------------------------------------------------------------ blog

/** Lowercase, hyphenated, URL-safe. Slugs are permanent public identifiers. */
const slugSchema = clean(120)
  .refine((v) => v.length > 0, "A slug is required.")
  .refine(
    (v) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v),
    "Use lowercase letters, numbers and hyphens only."
  );

export const authorSchema = z.object({
  name: required("Name", 80),
  slug: slugSchema,
  avatarUrl: imageSchema,
  bio: optional(600),
  websiteUrl: linkSchema,
});

export const blogCategorySchema = z.object({
  name: required("Name", 80),
  slug: slugSchema,
  description: optional(300),
  order,
});

export const blogTagSchema = z.object({
  name: required("Name", 60),
  slug: slugSchema,
});

export const blogPostSchema = z.object({
  title: required("Title", 200),
  slug: slugSchema,
  excerpt: optional(400),
  /** Raw editor HTML. Sanitised server-side before it is stored. */
  content: z.string().max(400_000).default(""),

  featuredImage: imageSchema,
  featuredImageAlt: optional(200),

  seoTitle: optional(200),
  seoDescription: optional(400),
  focusKeyword: optional(120),
  canonicalUrl: linkSchema,
  noIndex: boolish,

  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  /** ISO string or empty. Empty means "stamp it on first publish". */
  publishedAt: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (!v) return null;
      const date = new Date(v);
      return Number.isNaN(date.getTime()) ? null : date;
    }),

  // Defaulted for the same reason as linkSchema: "no author" is a legitimate
  // state and must be expressible by leaving the key out.
  authorId: clean(60).default("").transform((v) => v || null),
  categoryId: clean(60).default("").transform((v) => v || null),
  tagIds: z.array(z.string().min(1).max(60)).max(20).default([]),
});

export type BlogPostInput = z.input<typeof blogPostSchema>;
