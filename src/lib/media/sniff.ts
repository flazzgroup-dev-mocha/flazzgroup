/**
 * What a file actually is, decided by its bytes.
 *
 * The upload pipeline used to ask `File.type`, which is the `Content-Type` the
 * *client* wrote into the multipart part. Everything downstream hung off that
 * answer, including whether an SVG was sanitised — so the same bytes carrying
 * `<script>alert(1)</script>` were cleaned when labelled `image/svg+xml` and
 * stored untouched when labelled `image/png`. Cloudinary then sniffed the real
 * type and served the untouched one as `image/svg+xml`.
 *
 * Nothing here reads a header. The declared type and the filename are treated
 * as claims to be checked against the content, never as the content's identity.
 */

export const SNIFFED_TYPES = {
  "image/png": { extensions: ["png"], canonical: "png" },
  "image/jpeg": { extensions: ["jpg", "jpeg"], canonical: "jpg" },
  "image/webp": { extensions: ["webp"], canonical: "webp" },
  "image/avif": { extensions: ["avif"], canonical: "avif" },
  "image/svg+xml": { extensions: ["svg"], canonical: "svg" },
} as const;

export type SniffedType = keyof typeof SNIFFED_TYPES;

const ascii = (data: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...data.subarray(start, start + length));

const startsWith = (data: Uint8Array, signature: number[]) =>
  signature.length <= data.length &&
  signature.every((byte, index) => data[index] === byte);

/** PNG's 8-byte signature; the CR/LF/EOF bytes exist to catch bad transfers. */
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Every JPEG variant starts SOI + the first marker. */
const JPEG = [0xff, 0xd8, 0xff];

/**
 * Is this XML that resolves to an <svg> root?
 *
 * A vector is the one accepted format with no binary signature, so it has to be
 * read as text — and the check has to survive the wrappers a real exporter
 * emits: a byte-order mark, an XML declaration, a DOCTYPE, comments, and
 * leading whitespace. Illustrator and Inkscape produce several of these.
 *
 * Deliberately anchored at the root element. Accepting "contains <svg
 * somewhere" would let an HTML file with an inline <svg> through, and that file
 * would be stored and served as an SVG document.
 */
function looksLikeSvg(data: Uint8Array) {
  // A vector large enough to matter is still text; 64 KB of prologue is far
  // more than any real file, and caps the work done on a hostile upload.
  // TextDecoder strips a leading byte-order mark itself unless told not to.
  const head = new TextDecoder("utf-8", { fatal: false }).decode(
    data.subarray(0, 65_536)
  );

  const withoutPrologue = head
    .replace(/^\s+/, "")
    .replace(/^<\?xml[\s\S]*?\?>/i, "")
    .replace(/^(?:\s|<!--[\s\S]*?-->|<!DOCTYPE[^>]*>)*/i, "");

  return /^<svg[\s>]/i.test(withoutPrologue);
}

/**
 * The file's real type, or null if it is not one we accept.
 *
 * WEBP and AVIF are both containers, so neither can be identified from the
 * first bytes alone: WEBP is a RIFF chunk whose form type sits at offset 8, and
 * AVIF is ISO base media format, where `ftyp` at offset 4 is followed by a
 * brand. Reading only the leading magic would misidentify every MP4 as AVIF.
 */
export function sniffImageType(data: Uint8Array): SniffedType | null {
  if (startsWith(data, PNG)) return "image/png";
  if (startsWith(data, JPEG)) return "image/jpeg";

  if (data.length >= 12) {
    if (ascii(data, 0, 4) === "RIFF" && ascii(data, 8, 4) === "WEBP") {
      return "image/webp";
    }

    if (ascii(data, 4, 4) === "ftyp") {
      const brand = ascii(data, 8, 4).toLowerCase();
      // `avis` is an AVIF image sequence; both are served as image/avif.
      if (brand === "avif" || brand === "avis") return "image/avif";
    }
  }

  return looksLikeSvg(data) ? "image/svg+xml" : null;
}

/** The extension a filename claims, lowercased, without the dot. */
export function extensionOf(filename: string) {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
}

/**
 * Whether the filename's extension agrees with the detected content.
 *
 * A name with no extension is fine — the caller supplies the canonical one. A
 * name that claims `.png` over WEBP bytes is not: the extension becomes part of
 * the delivery URL, and a URL whose extension disagrees with its bytes is how a
 * file ends up being interpreted as something other than what it is.
 */
export function extensionMatches(filename: string, type: SniffedType) {
  const extension = extensionOf(filename);
  if (!extension) return true;

  return (SNIFFED_TYPES[type].extensions as readonly string[]).includes(
    extension
  );
}
