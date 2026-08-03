import sanitizeHtml from "sanitize-html";

/**
 * Editor output is untrusted, even though only an authenticated admin can
 * produce it. Sanitising on write means the stored HTML is already safe, so
 * rendering never has to trust the database either.
 */

const ALLOWED_IFRAME_HOSTS = [
  "www.youtube.com",
  "youtube.com",
  "www.youtube-nocookie.com",
  "player.vimeo.com",
];

export const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr",
    "h2", "h3", "h4",
    "strong", "em", "u", "s", "code", "mark", "sub", "sup",
    "ul", "ol", "li",
    "blockquote", "pre",
    "a", "img", "figure", "figcaption",
    "table", "thead", "tbody", "tr", "th", "td",
    "div", "span", "iframe",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    iframe: ["src", "title", "allow", "allowfullscreen", "width", "height", "frameborder"],
    div: ["data-callout", "data-type"],
    span: ["data-type"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
    code: ["class"],
    pre: ["class"],
  },
  // Only these schemes may ever appear in an href or src.
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  allowProtocolRelative: false,
  // Embeds are restricted to hosts we actually offer in the editor.
  allowedIframeHostnames: ALLOWED_IFRAME_HOSTS,
  transformTags: {
    // Every outbound link opens safely; `noopener` blocks reverse tabnabbing.
    a: (tagName, attribs) => {
      const href = attribs.href ?? "";
      const external = /^https?:\/\//i.test(href);

      return {
        tagName,
        attribs: external
          ? { ...attribs, target: "_blank", rel: "noopener noreferrer nofollow" }
          : attribs,
      };
    },
    img: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, loading: "lazy", decoding: "async" },
    }),
  },
};

export function sanitizeArticleHtml(html: string) {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

/** Strips every tag, leaving searchable, countable prose. */
export function htmlToText(html: string) {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** 200 wpm is the usual reading speed for web prose; never returns 0. */
export function readingMinutes(text: string) {
  const words = text.split(/\s+/).filter(Boolean).length;
  // Rounded up: a 90-second read labelled "1 min" is a promise the article breaks.
  return Math.max(1, Math.ceil(words / 200));
}

/** Builds an excerpt from the body when the author has not written one. */
export function deriveExcerpt(text: string, max = 160) {
  if (text.length <= max) return text;
  const clipped = text.slice(0, max);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, lastSpace > 80 ? lastSpace : max).trimEnd()}…`;
}

export type TocEntry = { id: string; text: string; level: 2 | 3 };

function slugifyHeading(text: string, taken: Set<string>) {
  const base =
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "bagian";

  let candidate = base;
  let suffix = 2;
  while (taken.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  taken.add(candidate);
  return candidate;
}

/**
 * Gives every h2/h3 a stable id and returns the table of contents.
 *
 * Done at render time against already-sanitised HTML, so an author editing a
 * heading never leaves a stale anchor behind in the stored content.
 */
export function withHeadingAnchors(html: string): {
  html: string;
  toc: TocEntry[];
} {
  const toc: TocEntry[] = [];
  const taken = new Set<string>();

  const out = html.replace(
    /<(h2|h3)([^>]*)>([\s\S]*?)<\/\1>/gi,
    (match, tag: string, attrs: string, inner: string) => {
      const text = htmlToText(inner);
      if (!text) return match;

      const id = slugifyHeading(text, taken);
      toc.push({ id, text, level: tag.toLowerCase() === "h2" ? 2 : 3 });

      const cleaned = attrs.replace(/\sid="[^"]*"/gi, "");
      return `<${tag}${cleaned} id="${id}">${inner}</${tag}>`;
    }
  );

  return { html: out, toc };
}
