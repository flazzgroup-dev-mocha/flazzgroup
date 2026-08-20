/**
 * Cloudinary delivery URLs.
 *
 * Client-safe: no SDK, no credentials, just string work — the image loader
 * runs in the browser, so it cannot import anything server-only.
 *
 * A delivery URL looks like
 *   https://res.cloudinary.com/<cloud>/image/upload/<transforms>/<public_id>.<ext>
 * and transformations are inserted as a path segment after `/upload/`.
 */

const DELIVERY = /^https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//i;

export function isCloudinaryUrl(src: string) {
  return DELIVERY.test(src);
}

/**
 * `f_auto` and `q_auto` are the whole point of serving through Cloudinary:
 * the CDN negotiates AVIF or WebP per request from the browser's Accept header
 * and picks a quality that holds up visually, so no format list has to be
 * maintained here.
 *
 * `c_limit` only ever scales down — asking for a width larger than the original
 * returns the original rather than an upscaled blur.
 */
export function cloudinaryUrl(
  src: string,
  { width, quality }: { width?: number; quality?: number } = {}
) {
  if (!isCloudinaryUrl(src)) return src;

  const transforms = [
    "f_auto",
    `q_${quality ?? "auto"}`,
    ...(width ? [`w_${width}`, "c_limit"] : []),
  ].join(",");

  return src.replace(DELIVERY, (match) => `${match}${transforms}/`);
}

/**
 * An SVG re-encoded by Cloudinary loses its vector-ness, and `f_auto` on a
 * transparent logo can pick a format the layout did not expect. Vectors are
 * already tiny, so they are delivered untouched.
 */
export function isVector(src: string) {
  return src.toLowerCase().split("?")[0].endsWith(".svg");
}

/**
 * The delivery URL for a social card — `og:image` and `twitter:image`.
 *
 * Deliberately not `cloudinaryUrl`. That one exists for the browser and asks
 * for `f_auto`, which negotiates AVIF or WebP from the `Accept` header. A
 * social scraper sends no useful `Accept` header and several of them do not
 * decode either format, so the negotiation is worth nothing here and can cost
 * the preview entirely. `f_jpg` returns one predictable image to every crawler.
 *
 * The width cap is the point. The featured images on this site are 1600px+
 * PNGs — the largest is just over 2 MB — and WhatsApp, which is this store's
 * main sharing channel, quietly drops the thumbnail on images that big. A
 * link shared to a customer then previews as a bare title. Capped at 1200px
 * wide and re-encoded, the same card is well under 200 KB.
 *
 * `c_limit` only ever scales down, so a smaller original is passed through at
 * its own size rather than upscaled.
 */
export function socialImageUrl(src: string, width = 1200) {
  if (!isCloudinaryUrl(src)) return src;

  return src.replace(
    DELIVERY,
    (match) => `${match}f_jpg,q_auto,w_${width},c_limit/`
  );
}

/**
 * An absolute delivery URL for structured data.
 *
 * Two things a crawler needs that a stored URL does not always give it.
 *
 * Absolute, because JSON-LD is read with no page to resolve a relative path
 * against — uploads already arrive as full Cloudinary URLs, anything served
 * from /public does not.
 *
 * And *delivered*, not original. Without a transform Cloudinary ignores the
 * crawler's `Accept` header and returns the full-size PNG; for the product
 * tiles that is a 2 MB file standing in for a thumbnail, and it is a URL that
 * appears nowhere in the rendered markup. Naming a width that `next/image`
 * also emits means the schema quotes a URL the page actually references.
 *
 * Vectors pass through untouched: `f_auto` would rasterise them, and a width
 * cap is meaningless for a format with no pixels.
 */
export function schemaImageUrl(base: string, src: string, width?: number) {
  const absolute = src.startsWith("http") ? src : `${base}${src}`;
  return isVector(absolute) ? absolute : cloudinaryUrl(absolute, { width });
}
