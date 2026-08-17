/**
 * Making an uploaded SVG safe to serve.
 *
 * Deliberately free of `server-only` and of the Cloudinary SDK. This is pure
 * string work, and keeping it that way is what lets `npm run media:check`
 * assert on it directly, with no credentials and no network — the same reason
 * errors.ts is separate from the uploader.
 */

import { UploadError } from "./errors";

/**
 * Elements with no legitimate place in an uploaded illustration.
 *
 * `handler` is SVG Tiny's event element and `foreignObject` is the doorway to
 * arbitrary HTML; the rest are the embedding elements that would let a picture
 * pull in and run something else.
 */
const FORBIDDEN_ELEMENTS = [
  "script",
  "foreignObject",
  "iframe",
  "embed",
  "object",
  "audio",
  "video",
  "handler",
];

/** SMIL animation elements, which can rewrite an attribute after load. */
const ANIMATION_ELEMENTS = [
  "animate",
  "animateTransform",
  "animateMotion",
  "set",
];

/**
 * Removes every form an element can take: paired, self-closing, and an opening
 * tag whose partner never arrives.
 *
 * The third case is the one the previous version missed, and it mattered:
 * `<script href="data:text/javascript,…"/>` is valid SVG 2 and carries no
 * closing tag at all, so a pattern anchored on `</script>` walked straight past
 * it. Dropping an unpaired opening tag leaves the body behind as character
 * data, which is inert — a browser executes the contents of a `script`
 * element, not text that happens to sit inside an `svg`.
 */
function removeElement(source: string, tag: string) {
  return source
    .replace(new RegExp(`<\\s*${tag}\\b[\\s\\S]*?<\\s*/\\s*${tag}\\s*>`, "gi"), "")
    .replace(new RegExp(`<\\s*${tag}\\b[^>]*/\\s*>`, "gi"), "")
    .replace(new RegExp(`<\\s*/?\\s*${tag}\\b[^>]*>`, "gi"), "");
}

/**
 * An attribute value with its character references resolved.
 *
 * Scheme checks have to run against what a parser will see, not against what
 * was typed. `java&#115;cript:alert(1)` and `&#106;avascript:alert(1)` are both
 * `javascript:` by the time the URL is dereferenced, and a literal match on the
 * raw string finds neither. Whitespace and control characters go too: browsers
 * strip them from a URL before deciding its scheme, so `java\nscript:` is a
 * scheme with a newline in it and nothing more.
 */
function decodeEntities(value: string) {
  const codePoint = (point: number) => {
    // `String.fromCodePoint` throws outside the Unicode range, and `&#99999999;`
    // in an uploaded file is a plausible way to turn a sanitiser into a 500.
    try {
      return String.fromCodePoint(point);
    } catch {
      return "";
    }
  };

  const decoded = value
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => codePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec) => codePoint(Number(dec)))
    .replace(/&(quot|apos|amp|lt|gt);/gi, (_, name) =>
      ({ quot: '"', apos: "'", amp: "&", lt: "<", gt: ">" })[
        String(name).toLowerCase()
      ] ?? ""
    );

  /**
   * Whitespace and control characters are stripped by code point rather than by
   * a character class.
   *
   * A class spanning the C0 range has to be written either with literal control
   * bytes or with escapes, and both are things a formatter, an editor or a
   * careless save can quietly mangle — it happened to this very line during the
   * change that added it, leaving behind a class that ate the letter "s".
   * Comparing numbers cannot be mangled. Same reasoning, and the same shape, as
   * `sanitiseQuery` in lib/blog/params.ts.
   */
  let stripped = "";
  for (const character of decoded) {
    const code = character.codePointAt(0) ?? 0;
    if (code > 0x20 && code !== 0x7f) stripped += character;
  }

  return stripped;
}

/**
 * Whether a link target is safe to keep.
 *
 * Relative references and fragments are the common case — `<use href="#icon">`
 * is how every icon sprite works — and are always fine, because they cannot
 * name a scheme. Anything with a scheme is checked against a closed list.
 *
 * `data:` is allowed for raster payloads only. Embedding a PNG in an
 * `<image href>` is normal and harmless; `data:image/svg+xml` is a nested
 * document, and nesting is how a sanitised outer layer ends up wrapping an
 * unsanitised inner one.
 */
function isSafeUrl(rawValue: string) {
  const value = decodeEntities(rawValue);

  const scheme = value.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  if (!scheme) return true;

  if (scheme === "http" || scheme === "https" || scheme === "mailto") return true;

  if (scheme === "data") {
    return /^data:image\/(png|jpeg|jpg|gif|webp|avif)[;,]/i.test(value);
  }

  return false;
}

/**
 * Strips scripts, event handlers and external references from an SVG.
 *
 * Cloudinary stores an SVG verbatim, so unlike a raster — which is re-encoded
 * and therefore laundered — a vector arrives at the browser exactly as
 * uploaded. It is sanitised here and served under a sandboxed CSP.
 *
 * Worth being precise about what this is and is not defending. Uploads are
 * already behind an authenticated admin session, and Cloudinary serves these
 * from `res.cloudinary.com`, a different origin from the site — so script that
 * did get through could not read this site's session cookie or act as an admin.
 * What it could still do is sit on a domain the operator trusts and be linked
 * to. That is worth closing properly rather than nearly.
 *
 * This is a denylist over a text pass, not an XML parse, and the honest
 * limitation of that is that it can only refuse the vectors it knows. It
 * refuses considerably more of them than the version it replaces, which missed
 * self-closing `<script>`, every SMIL attribute rewrite, and any
 * `javascript:` written with a character reference in it.
 */
export function sanitizeSvg(source: string) {
  let cleaned = source;

  // The internal subset first: a DOCTYPE can declare entities that expand into
  // markup the passes below have already run over. Removing the declaration
  // wholesale also takes out the billion-laughs and external-entity shapes.
  cleaned = cleaned.replace(/<!DOCTYPE[\s\S]*?(?:\[[\s\S]*?\][\s]*)?>/gi, "");
  cleaned = cleaned.replace(/<\s*!\s*ENTITY[\s\S]*?>/gi, "");

  for (const tag of FORBIDDEN_ELEMENTS) {
    cleaned = removeElement(cleaned, tag);
  }

  /**
   * Animation is kept, but not animation that targets a link or a handler.
   *
   * `<animate attributeName="href" to="javascript:…">` inside an `<a>` is the
   * textbook SVG payload: the document is clean when it loads and rewrites
   * itself a moment later. Removing the whole SMIL family would also throw away
   * every legitimately animated logo, so the discriminator is what the element
   * points at rather than the element itself.
   */
  for (const tag of ANIMATION_ELEMENTS) {
    cleaned = cleaned.replace(
      new RegExp(`<\\s*${tag}\\b[^>]*>`, "gi"),
      (element) => {
        const target = element.match(
          /attributeName\s*=\s*["']?\s*([a-z:_-]+)/i
        )?.[1];

        if (!target) return element;

        return /^(?:on|href$|xlink:href$)/i.test(target) ? "" : element;
      }
    );
  }

  // Every `on*` handler, quoted or bare.
  cleaned = cleaned.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  // Link targets, checked against a scheme allowlist rather than searched for
  // one bad string.
  cleaned = cleaned.replace(
    /\s(href|xlink:href)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi,
    (attribute, _name, _quoted, double, single, bare) => {
      const value = double ?? single ?? bare ?? "";
      return isSafeUrl(value) ? attribute : "";
    }
  );

  if (!/<svg[\s>]/i.test(cleaned)) {
    throw new UploadError("That file is not a valid SVG.");
  }

  return Buffer.from(cleaned, "utf8");
}

