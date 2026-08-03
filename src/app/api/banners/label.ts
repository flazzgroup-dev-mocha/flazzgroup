/**
 * How a banner is named in the activity log.
 *
 * There is no headline any more, so the alt text is the closest thing to a
 * human name; the filename is the fallback, which is readable precisely
 * because uploads keep their original name.
 */
import type { HeroBanner } from "@/lib/models";

export function bannerLabel(row: HeroBanner) {
  if (row.imageAlt.trim()) return row.imageAlt.trim();

  const filename = row.imageUrl.split("?")[0].split("/").pop();
  return filename ? decodeURIComponent(filename) : "Banner";
}
