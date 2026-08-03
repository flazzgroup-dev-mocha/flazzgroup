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
