import "server-only";

import { basename, extname } from "node:path";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

import { slugify } from "@/lib/blog/slug";
import {
  UploadError,
  cloudinaryHttpCode,
  cloudinaryMessage,
  isCloudinaryNotFound,
} from "./errors";
import { sanitizeSvg } from "./svg";
import {
  SNIFFED_TYPES,
  extensionMatches,
  extensionOf,
  sniffImageType,
} from "./sniff";
import {
  ACCEPTED_MIME,
  MAX_UPLOAD_BYTES,
  MEDIA_FOLDERS,
  type AcceptedMime,
  type MediaFolder,
  type UploadedImage,
} from "./folders";

/**
 * The one place anything is uploaded to or removed from Cloudinary.
 *
 * Every admin form — banner, blog, brand, payment, logo, favicon — goes through
 * `uploadImage`, so validation, SEO naming and folder placement are decided
 * once rather than per form.
 */

/**
 * Re-exported so every existing import site keeps working. The class itself now
 * lives in ./errors, which the SVG sanitiser can reach without dragging in the
 * Cloudinary SDK — see the note there.
 */
export { UploadError };

let configured = false;

function configure() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;

  if (!cloud_name || !api_key || !api_secret) {
    throw new UploadError(
      "Image hosting is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
      503
    );
  }

  if (!configured) {
    cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
    configured = true;
  }

  return cloudinary;
}

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

// ------------------------------------------------------------------ errors

/**
 * Turns a Cloudinary rejection into something an editor can act on.
 *
 * Everything that is not a 404 is a real failure and must stay visible: an
 * expired key, a suspended account and a rate limit each need a different
 * response from whoever is looking at the screen, and none of them should read
 * as "that image could not be read".
 */
function explain(error: unknown, action: string): UploadError {
  const code = cloudinaryHttpCode(error);
  const detail = cloudinaryMessage(error);

  // Logged whatever the class, because the message shown to the editor is
  // deliberately shorter than what an operator needs to diagnose it.
  console.error(`[media] ${action} failed (http ${code ?? "?"}): ${detail}`);

  if (code === 401) {
    return new UploadError(
      "Cloudinary rejected the API credentials. Check CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
      503
    );
  }

  if (code === 403) {
    return new UploadError(
      "Cloudinary refused the request. The account may be over its plan limit, or the API key may be restricted.",
      503
    );
  }

  // Cloudinary uses 420 for its own rate limiting as well as the standard 429.
  if (code === 420 || code === 429) {
    return new UploadError(
      "Cloudinary's rate limit has been reached. Wait a minute and try again.",
      429
    );
  }

  if (code !== null && code >= 500) {
    return new UploadError(
      "Cloudinary is unavailable right now. Try again in a moment.",
      502
    );
  }

  if (code === 400) {
    return new UploadError(`Cloudinary rejected the image: ${detail}`, 415);
  }

  return new UploadError(
    "The image could not be stored. Please try again.",
    502
  );
}

// -------------------------------------------------------------- SEO naming

/**
 * Turns an uploaded filename into the slug Cloudinary will serve it under.
 *
 * The filename is part of the URL and therefore part of what a search engine
 * reads, so "Promo Juli 2026.png" becomes "promo-juli-2026" rather than a UUID.
 * A name that slugifies to nothing — an all-emoji filename, say — still needs
 * something addressable, so it falls back to the folder name.
 */
export function toSeoName(filename: string, folder: MediaFolder) {
  const withoutExtension = basename(filename, extname(filename));
  return slugify(withoutExtension).slice(0, 80) || folder;
}

/**
 * Every public id already in use under a prefix.
 *
 * Deliberately `api.resources({ prefix })` rather than probing each candidate
 * with `api.resource(id)`. Listing answers with an empty array when nothing
 * matches, so the happy path — a brand new filename — involves no error
 * handling at all, and one request settles the whole name whether it collides
 * once or forty times. The previous version issued up to fifty Admin API calls
 * per upload against an hourly quota, and depended on catching a 404 for the
 * most common case of all.
 */
async function takenIds(prefix: string) {
  const api = configure();
  const ids = new Set<string>();

  let cursor: string | undefined;
  // Bounded so a pathological prefix cannot loop forever; 500 × 20 = 10,000
  // names sharing one prefix is far past the point of being descriptive.
  for (let page = 0; page < 20; page += 1) {
    let result;

    try {
      result = await api.api.resources({
        type: "upload",
        prefix,
        max_results: 500,
        ...(cursor ? { next_cursor: cursor } : {}),
      });
    } catch (error) {
      // Defensive: listing should not 404, but if it ever does the honest
      // reading is "nothing is stored under this prefix".
      if (isCloudinaryNotFound(error)) return ids;
      throw explain(error, "listing existing filenames");
    }

    for (const resource of result.resources ?? []) {
      if (resource?.public_id) ids.add(resource.public_id as string);
    }

    cursor = result.next_cursor as string | undefined;
    if (!cursor) break;
  }

  return ids;
}

/**
 * Finds a free public id, appending -2, -3, … when the name is taken.
 *
 * Cloudinary would happily invent a random suffix (`unique_filename`) or
 * silently overwrite (`overwrite: true`); neither is right. The first throws
 * away the SEO name we just derived, the second lets one upload destroy an
 * image another row is still pointing at.
 */
async function claimPublicId(base: string, folder: string) {
  const prefix = `${folder}/${base}`;
  const taken = await takenIds(prefix);

  if (!taken.has(prefix)) return prefix;

  for (let suffix = 2; suffix <= 500; suffix += 1) {
    const candidate = `${prefix}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }

  // Past 500 variants of one name, readability is already lost.
  return `${prefix}-${Date.now()}`;
}

// ------------------------------------------------------------------ upload

function assertSize(file: File) {
  if (file.size === 0) {
    throw new UploadError("The file is empty.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(
      `File is too large. Maximum size is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
      413
    );
  }
}

/**
 * What this file is, decided by reading it.
 *
 * The previous version returned `file.type` — the `Content-Type` the client
 * wrote into the multipart part — and every decision below hung off it,
 * sanitisation included. Relabelling an SVG as `image/png` therefore skipped
 * the sanitiser while Cloudinary went on to sniff the real type and serve the
 * unsanitised file as `image/svg+xml`.
 *
 * The declared type is now not consulted at all. The filename is checked
 * *against* the content rather than trusted: a `.png` extension over WEBP bytes
 * is rejected, because the extension ends up in the delivery URL and a URL that
 * disagrees with its own bytes is how a file gets interpreted as something it
 * is not.
 */
function detectType(filename: string, data: Buffer): AcceptedMime {
  const detected = sniffImageType(data);

  if (!detected) {
    throw new UploadError(
      "That file is not a PNG, JPG, WEBP, AVIF or SVG image. Check the file and try again."
    );
  }

  if (!extensionMatches(filename, detected)) {
    throw new UploadError(
      `The file is a ${SNIFFED_TYPES[detected].canonical.toUpperCase()} image but is named ".${extensionOf(filename)}". Rename it to match its contents and upload again.`
    );
  }

  return detected;
}

function upload(data: Buffer, publicId: string): Promise<UploadApiResponse> {
  const api = configure();

  return new Promise((resolve, reject) => {
    const stream = api.uploader.upload_stream(
      {
        // The folder is already part of the id claimed above, so `folder` is
        // deliberately not passed — setting both nests one inside the other.
        public_id: publicId,
        resource_type: "image",
        // The id was claimed above; neither of these may second-guess it.
        overwrite: false,
        unique_filename: false,
        use_filename: false,
        invalidate: true,
      },
      (error, result) => {
        if (error) {
          reject(explain(error, "uploading the image"));
          return;
        }
        if (!result) {
          reject(new UploadError("Cloudinary returned no result.", 502));
          return;
        }
        resolve(result);
      }
    );

    stream.on("error", (error) => reject(explain(error, "uploading the image")));
    stream.end(data);
  });
}

/**
 * Validates, names and stores an image. Returns the metadata the owning row
 * keeps — Cloudinary holds the bytes, Postgres holds only this.
 */
export async function uploadImage(
  file: File,
  folder: MediaFolder
): Promise<UploadedImage> {
  assertSize(file);

  const raw = Buffer.from(await file.arrayBuffer());
  const originalFilename = file.name || folder;

  // Content first, then the name checked against it. Both before anything is
  // sent anywhere.
  const mime = detectType(originalFilename, raw);

  // Keyed on the *detected* type, so a vector is sanitised however it was
  // labelled — which is the whole point of detecting it here.
  const data = mime === "image/svg+xml" ? sanitizeSvg(raw.toString("utf8")) : raw;

  const base = toSeoName(originalFilename, folder);
  const publicId = await claimPublicId(base, MEDIA_FOLDERS[folder]);

  const result = await upload(data, publicId);

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width ?? 0,
    height: result.height ?? 0,
    format: result.format ?? ACCEPTED_MIME[mime],
    bytes: result.bytes ?? data.byteLength,
    originalFilename,
  };
}

// ------------------------------------------------------------------ delete

/**
 * Removes an image from Cloudinary.
 *
 * Returns whether the file is now definitely gone. Already-absent counts as
 * gone — a delete has to be idempotent. Anything else returns false and is
 * logged, so the caller can keep the database row that still points at the
 * file rather than losing the only record of an orphan.
 */
export async function destroyImage(publicId: string): Promise<boolean> {
  if (!publicId || !isCloudinaryConfigured()) return false;

  try {
    const result = await configure().uploader.destroy(publicId, {
      invalidate: true,
    });

    const outcome = String(result?.result ?? "");
    if (outcome === "ok" || outcome === "not found") return true;

    console.error(`[media] unexpected destroy result for ${publicId}: ${outcome}`);
    return false;
  } catch (error) {
    // Already gone is success; everything else is a real failure worth seeing.
    if (isCloudinaryNotFound(error)) return true;

    console.error(
      `[media] could not remove ${publicId} (http ${cloudinaryHttpCode(error) ?? "?"}): ${cloudinaryMessage(error)}`
    );
    return false;
  }
}
