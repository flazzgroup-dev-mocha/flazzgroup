import slugifyLib from "slugify";

/**
 * URL slug generator, shared by the editor and the API so a slug typed by
 * hand and one generated from a title normalise identically.
 */
export function slugify(input: string) {
  return slugifyLib(input, {
    lower: true,
    strict: true,
    trim: true,
    locale: "id",
  }).slice(0, 120);
}
