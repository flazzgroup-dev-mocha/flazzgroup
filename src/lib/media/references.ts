/**
 * Which content rows still point at a given image, and which stored files
 * nothing points at any more.
 *
 * Deliberately free of `server-only`, for the same reason errors.ts is: this is
 * the one list in the system that must not exist in two places, and a cleanup
 * run from the command line needs to consult exactly the list a delete does.
 * Anything that imports this reaches Prisma, so it is still server code — the
 * marker is omitted so `npm run media:orphans` can import it, not because the
 * module is safe in a browser.
 */

import { prisma } from "@/lib/prisma";

/**
 * Whether any content row still points at this URL.
 *
 * The same file can legitimately be reused — one logo across several payment
 * methods, one banner reused as a blog cover — and deleting one of those rows
 * must not break the others.
 *
 * ------------------------------------------------------- what gets checked
 *
 * Every column anywhere in the schema that can hold an image URL, and this list
 * has to stay complete: a place that is missed is not a missed cleanup, it is a
 * live image destroyed while something is still displaying it. Four were
 * missing, and each had a concrete way to bite:
 *
 *   `admin.avatarUrl`      An admin's profile picture goes through this same
 *                          upload pipeline. Reuse the file as a brand logo, then
 *                          delete the brand, and their avatar 404s.
 *   `settings.chatLogoUrl` The floating chat's logo, usually set to the site
 *                          logo. Change the site logo and the old file is
 *                          released — taking the chat widget's icon with it.
 *   `blogPost.content`     The editor can place images inside an article body.
 *                          Those URLs live in the HTML and in no column, so
 *                          nothing else here would ever see them. `contains` is
 *                          the right test: the stored URL has no transformation
 *                          segment, and that is exactly the form the editor
 *                          writes into the markup.
 *   `blogImage.url`        The media-library table. A row here means the file
 *                          was uploaded for an article, whether or not it has
 *                          been placed yet.
 *
 * The cost is four more counts on a delete, which happens when a human clicks
 * a button. That is not a path worth optimising against correctness.
 */
export async function isStillReferenced(url: string) {
  const counts = await Promise.all([
    prisma.heroBanner.count({
      where: { OR: [{ imageUrl: url }, { mobileImageUrl: url }] },
    }),
    prisma.product.count({ where: { imageUrl: url } }),
    prisma.brand.count({ where: { logoUrl: url } }),
    prisma.popularService.count({ where: { imageUrl: url } }),
    prisma.paymentMethod.count({ where: { logoUrl: url } }),
    prisma.blogPost.count({
      where: { OR: [{ featuredImage: url }, { content: { contains: url } }] },
    }),
    prisma.blogImage.count({ where: { url } }),
    prisma.author.count({ where: { avatarUrl: url } }),
    prisma.admin.count({ where: { avatarUrl: url } }),
    prisma.websiteSettings.count({
      where: {
        OR: [
          { logoUrl: url },
          { faviconUrl: url },
          { ogImageUrl: url },
          { chatLogoUrl: url },
        ],
      },
    }),
  ]);

  return counts.reduce((total, count) => total + count, 0) > 0;
}

/**
 * Every stored asset that nothing points at any more.
 *
 * Referred to by the note on `saveUpload` above, which is the honest reason it
 * exists: an upload that succeeded remotely and then failed to write its row is
 * recoverable, and so is a file whose owning row was deleted before the
 * shared-reference check was as complete as it is now.
 *
 * Read-only by design. It answers "what could be removed", and removing it is a
 * separate, deliberate act — `npm run media:orphans -- --delete`. Media is the
 * one thing in this system with no undo: Postgres has Neon's branch history and
 * the code has git, but a destroyed Cloudinary asset is gone.
 *
 * Only rows in `media_assets` are considered, which means only files this
 * application uploaded. Anything put into the account through the Cloudinary
 * dashboard has no row here, is never listed, and is never at risk.
 */
export async function findOrphanedAssets() {
  const assets = await prisma.mediaAsset.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      publicId: true,
      secureUrl: true,
      folder: true,
      bytes: true,
      format: true,
      width: true,
      height: true,
      originalFilename: true,
      createdAt: true,
    },
  });

  const orphans = [];
  // Sequential rather than a Promise.all over every asset: this runs from a
  // command line, and a media library of any size would otherwise open one
  // connection burst per asset against a pooled endpoint.
  for (const asset of assets) {
    if (!(await isStillReferenced(asset.secureUrl))) orphans.push(asset);
  }

  return orphans;
}
