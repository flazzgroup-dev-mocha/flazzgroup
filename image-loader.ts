import { cloudinaryUrl, isCloudinaryUrl } from "@/lib/media/url";

/**
 * Image loader for next/image.
 *
 * Cloudinary URLs are rewritten to CDN transformation URLs — `f_auto` and
 * `q_auto` let the CDN negotiate AVIF or WebP per request and pick a quality,
 * and `w_<n>,c_limit` produces the responsive variants, all without this app
 * building or caching anything.
 *
 * Everything else is returned untouched, which is not a shortcut: configuring
 * `loaderFile` at all disables Next's own `/_next/image` endpoint, so pointing
 * a fallback at it would 404. The images that take this branch are already in
 * their final form —
 *
 *   /art/*.svg, /brands/*.svg, /logo.svg
 *       Bundled vectors. Nothing to optimise, and every call site already
 *       passes `unoptimized`.
 *
 * — and they are served as static files straight out of /public.
 */
export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  return isCloudinaryUrl(src) ? cloudinaryUrl(src, { width, quality }) : src;
}
