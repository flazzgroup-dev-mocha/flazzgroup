/**
 * Where each kind of upload lives in Cloudinary.
 *
 * Client-safe on purpose: the admin forms name a folder when they upload, and
 * the upload route validates the name against this map, so a request can never
 * write outside the account's `flazzgroup/` tree.
 */
export const MEDIA_FOLDERS = {
  banner: "flazzgroup/banner",
  blog: "flazzgroup/blog",
  brand: "flazzgroup/brand",
  payment: "flazzgroup/payment",
  logo: "flazzgroup/logo",
  favicon: "flazzgroup/favicon",
} as const;

export type MediaFolder = keyof typeof MEDIA_FOLDERS;

export const MEDIA_FOLDER_KEYS = Object.keys(MEDIA_FOLDERS) as MediaFolder[];

export function isMediaFolder(value: unknown): value is MediaFolder {
  return typeof value === "string" && value in MEDIA_FOLDERS;
}

/** 5 MB, matching the limit the admin forms advertise. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Accepted formats and the extension each is stored under.
 *
 * These keys are *outcomes* of content sniffing, not values read from a request
 * — see media/sniff.ts. A client's declared `Content-Type` is never matched
 * against this map any more, because it was the header that decided whether an
 * SVG got sanitised.
 */
export const ACCEPTED_MIME = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
} as const;

export type AcceptedMime = keyof typeof ACCEPTED_MIME;

/**
 * The `accept` attribute for every file input in the panel.
 *
 * A hint to the file picker only. The server re-derives the type from the bytes
 * and ignores this entirely, so narrowing or widening it changes convenience,
 * never what is actually allowed through.
 */
export const ACCEPT_ATTRIBUTE = Object.keys(ACCEPTED_MIME).join(",");

/** Shape returned by the upload route and stored against the owning row. */
export type UploadedImage = {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  originalFilename: string;
};
