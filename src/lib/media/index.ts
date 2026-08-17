import "server-only";

import { prisma } from "@/lib/prisma";
import {
  UploadError,
  destroyImage,
  isCloudinaryConfigured,
  uploadImage,
} from "./cloudinary";
import { isCloudinaryUrl } from "./url";
import { findOrphanedAssets, isStillReferenced } from "./references";
import {
  MEDIA_FOLDERS,
  type MediaFolder,
  type UploadedImage,
} from "./folders";

/**
 * The media lifecycle, in one module.
 *
 * Every upload in the panel calls `saveUpload`; every delete or replace calls
 * `releaseImage`. Nothing else talks to a storage backend, so adding a driver
 * or changing folder rules is a change here and nowhere else.
 */

export { UploadError, isCloudinaryConfigured };
export * from "./folders";
export { isCloudinaryUrl, cloudinaryUrl, isVector } from "./url";
export { findOrphanedAssets, isStillReferenced };

/**
 * Stores the file and records what was stored.
 *
 * The row is written after the upload succeeds, so a failed upload cannot leave
 * a record pointing at nothing. The reverse — an upload with no row — is
 * recoverable: `findOrphanedAssets` lists anything nothing references, and
 * `npm run media:orphans` is the command that prints it.
 */
export async function saveUpload(
  file: File,
  folder: MediaFolder
): Promise<UploadedImage> {
  const stored = await uploadImage(file, folder);

  await prisma.mediaAsset.create({
    data: {
      publicId: stored.publicId,
      secureUrl: stored.url,
      width: stored.width,
      height: stored.height,
      format: stored.format,
      bytes: stored.bytes,
      originalFilename: stored.originalFilename,
      folder: MEDIA_FOLDERS[folder],
    },
  });

  return stored;
}

/** Records the alt text an editor typed against the stored file. */
export async function setAltText(url: string, altText: string) {
  if (!url || !isCloudinaryUrl(url)) return;

  await prisma.mediaAsset
    .update({ where: { secureUrl: url }, data: { altText: altText.slice(0, 300) } })
    .catch(() => {
      // The asset predates this table, or was removed. Alt text still lives on
      // the owning row, so there is nothing to recover here.
    });
}

/**
 * Removes an image that nothing points at any more.
 *
 * Two cases, and the URL says which: a Cloudinary asset is destroyed remotely
 * and its row dropped; anything else — bundled art in /public, a pasted
 * external URL — is left alone, because this system never owned it.
 *
 * The shared-reference check lives here rather than in the caller. The same
 * file is legitimately reused — one logo across several payment methods, one
 * banner reused as a blog cover — and it was previously only consulted on the
 * replace path, so deleting one of two rows pointing at an image destroyed it
 * for the other one too. Callers must remove or update their row *before*
 * calling this, so the row being released no longer counts as a reference.
 */
export async function releaseImage(url: string | null | undefined) {
  if (!url) return;
  if (await isStillReferenced(url)) return;

  if (isCloudinaryUrl(url)) {
    const asset = await prisma.mediaAsset.findUnique({
      where: { secureUrl: url },
      select: { publicId: true },
    });

    const publicId = asset?.publicId ?? publicIdFromUrl(url);
    if (!publicId) return;

    // The metadata row is dropped only once the file is actually gone. If
    // Cloudinary was rate-limited or briefly unavailable, deleting the row
    // anyway would throw away the only pointer to the file and leave an
    // orphan nothing can find again.
    if (await destroyImage(publicId)) {
      await prisma.mediaAsset.deleteMany({ where: { publicId } });
    }
    return;
  }

  /**
   * Anything else is left alone.
   *
   * Bundled artwork in /public and any pasted external URL were never ours to
   * delete. The local-disk branch that used to live here went with the
   * `/media/[key]` route: nothing in the database referenced it any more.
   */
}

/**
 * Drops the previous image when a row's image changed.
 *
 * Called on every update path. Guarding on equality matters: saving a form
 * without touching the picture must not delete the picture. Whether anything
 * else still uses it is `releaseImage`'s business.
 */
export async function releaseIfReplaced(
  previous: string | null | undefined,
  next: string | null | undefined
) {
  if (!previous || previous === next) return;

  await releaseImage(previous);
}

/**
 * Cloudinary public id recovered from a delivery URL.
 *
 * Only used when the asset row is missing. Stored URLs carry no transformation
 * segment, but a version prefix (`v1712…`) is normal and is dropped.
 */
export function publicIdFromUrl(url: string) {
  const match = url.match(/\/image\/upload\/(.+)$/);
  if (!match) return null;

  const path = match[1]
    .split("/")
    .filter((segment) => !/^v\d+$/.test(segment))
    .join("/");

  return path.replace(/\.[a-z0-9]+$/i, "") || null;
}
