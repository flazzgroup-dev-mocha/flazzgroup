import type { MetadataRoute } from "next";

import { getGames, getSettings } from "@/lib/queries";
import { getAllPublishedPosts, getCategories } from "@/lib/blog/queries";
import { cloudinaryUrl, isVector, socialImageUrl } from "@/lib/media/url";
import { STATIC_PAGES, staticPageDate } from "@/lib/static-pages";
import { topUpPath } from "@/lib/games";

/**
 * Every published article is listed automatically. Drafts, scheduled posts and
 * anything flagged noIndex are excluded by the query itself, so the sitemap
 * can never advertise a page that returns 404 or noindex.
 *
 * ------------------------------------------------------------------ images
 *
 * Entries carry an `images` array, which Next renders as the
 * `sitemap-image/1.1` namespace and one `<image:image><image:loc>` per URL.
 * This is native support, not a hand-built XML string — the namespace is only
 * declared when at least one entry actually has an image, so the document stays
 * valid either way.
 *
 * What goes in is deliberately narrow: **one image per URL, and only the image
 * that is the subject of that page.** For an article that is its featured
 * image; for the homepage it is the social card, which is the one raster that
 * represents the store. Logos, icons, brand marks, payment badges and the
 * decorative art in each section are not listed — they illustrate a page, they
 * are not what the page is about, and an image sitemap padded with chrome is
 * how the useful entries get ignored.
 *
 * The two policy pages, /about and /contact have no such image, so they carry
 * none. An entry with no `images` key is perfectly valid.
 *
 * Worth being plain about the payoff: this helps Google *discover* images that
 * are otherwise only reachable by rendering the page. It is not a ranking
 * factor, and Google does not treat it as one.
 */

/**
 * Vectors are excluded on purpose. Google Images does not index SVG, and the
 * only SVGs this site serves are the logo and the section artwork — exactly
 * the chrome the list above says stays out.
 *
 * ------------------------------------------------------ why the transform
 *
 * The URL listed here is the **delivery** URL, not the stored original, and
 * that is the whole point of the `cloudinaryUrl` call.
 *
 * Listing `…/upload/v123/photo.png` — the raw original — was wrong twice over.
 * Those originals are 2 MB PNGs, and a bare delivery URL carries no `f_auto`,
 * so Cloudinary hands back the full-size PNG no matter what the crawler's
 * `Accept` header says: five entries came to roughly 10 MB, none of it
 * negotiable down to WebP or AVIF.
 *
 * The second problem is the one that actually costs indexing. `next/image`
 * renders `f_auto,q_auto,w_…,c_limit` variants into every `srcset` on the
 * page, so the URL the sitemap nominated appeared nowhere in the rendered
 * HTML. Google is being asked to associate an image with a page that does not
 * reference it — which is exactly the mismatch that gets an image sitemap
 * quietly ignored.
 *
 * `w_1200` is one of the widths in `next.config.ts`'s `deviceSizes`, so this
 * emits a URL that is already in the page's `srcset`, byte for byte. It is also
 * the width Google wants for a large image preview and for Discover.
 */
const SITEMAP_IMAGE_WIDTH = 1200;

/**
 * How the page in question delivers this image.
 *
 * The rule above — quote the URL the page actually references — needs one
 * transform per page *type*, not one for the whole sitemap, because the two
 * page types reference their image through different helpers.
 *
 *   article   `next/image` renders the featured image into a `srcset`, so the
 *             URL on the page carries `f_auto`. `w_1200` is one of the widths
 *             in `next.config.ts`'s `deviceSizes`, so this emits an entry that
 *             is in that `srcset` byte for byte. Verified against the rendered
 *             HTML.
 *
 *   homepage  The site card is never rendered as an `<img>`; its only
 *             appearance anywhere is `og:image` / `twitter:image`, and those go
 *             through `socialImageUrl`, which asks for `f_jpg` rather than
 *             `f_auto` — see the reasoning in lib/media/url.ts.
 *
 * Using the article transform for both is what this replaces, and it undid the
 * fix the block above describes: the homepage advertised
 * `f_auto,q_auto,w_1200,c_limit/…` while the page itself only ever contained
 * `f_jpg,q_auto,w_1200,c_limit/…`. One character of difference, and the
 * nominated URL appeared nowhere in the document it was nominated for.
 */
type Deliver = (url: string) => string;

const asRendered: Deliver = (url) =>
  cloudinaryUrl(url, { width: SITEMAP_IMAGE_WIDTH });

const asSocialCard: Deliver = (url) => socialImageUrl(url, SITEMAP_IMAGE_WIDTH);

function indexableImage(url: string | null | undefined, deliver: Deliver) {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed || isVector(trimmed)) return undefined;
  // Relative paths would be resolved against the sitemap's own URL by some
  // parsers and rejected by others; an image sitemap wants absolute URLs.
  if (!trimmed.startsWith("http")) return undefined;

  return [deliver(trimmed)];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, posts, categories, games] = await Promise.all([
    getSettings(),
    getAllPublishedPosts(),
    getCategories(),
    getGames(),
  ]);

  const base = settings.siteUrl.replace(/\/$/, "");
  const newestPost = posts[0]?.publishedAt ?? settings.updatedAt;
  const homeImage = indexableImage(settings.ogImageUrl, asSocialCard);

  return [
    {
      url: base,
      lastModified: settings.updatedAt,
      changeFrequency: "daily",
      priority: 1,
      ...(homeImage ? { images: homeImage } : {}),
    },
    /**
     * One entry per game page that is worth recommending.
     *
     * `getGames()` has already dropped hidden rows, so what is left is the
     * indexability question, and it is answered per page rather than per
     * feature:
     *
     *   catalogue     Listed while `showProducts` is on. That switch means
     *                 "is the top-up advertised", and a sitemap is the largest
     *                 advertisement there is. The page itself keeps answering
     *                 either way — an ad or a bookmark must never 404 because
     *                 somebody tidied the navigation.
     *
     *   information   Listed only once somebody has written its "about" copy.
     *                 Without it the page is a name, a picture and a notice
     *                 saying ordering is not open — a thin doorway page, and a
     *                 sitemap full of those is how the entries that do deserve
     *                 attention stop getting it. The same test drives the
     *                 page's own `noindex`, in one function, so the sitemap
     *                 cannot recommend a page that refuses to be indexed.
     *
     * No `images` entry on either: the coin tiles and the key art illustrate
     * these pages, they are not what the pages are about.
     */
    ...games
      .filter((game) =>
        game.topUpEnabled ? settings.showProducts : game.about.trim().length > 0
      )
      .map((game) => ({
        url: `${base}${topUpPath(game.slug)}`,
        lastModified: game.updatedAt,
        changeFrequency: "weekly" as const,
        priority: game.topUpEnabled ? 0.9 : 0.6,
      })),
    {
      url: `${base}/blog`,
      lastModified: newestPost,
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...STATIC_PAGES.map((page) => ({
      url: `${base}${page.path}`,
      // The day the page's copy last changed — not `settings.updatedAt`, which
      // moves every time an unrelated setting is saved.
      lastModified: staticPageDate(page.path),
      changeFrequency: "yearly" as const,
      priority: page.priority,
    })),
    ...categories
      .filter((category) => category._count.posts > 0)
      .map((category) => ({
        url: `${base}/blog?kategori=${category.slug}`,
        lastModified: newestPost,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
    ...posts.map((post) => {
      const images = indexableImage(post.featuredImage, asRendered);
      return {
        url: `${base}/blog/${post.slug}`,
        lastModified: post.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.7,
        ...(images ? { images } : {}),
      };
    }),
  ];
}
