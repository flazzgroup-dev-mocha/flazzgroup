import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a rupiah amount without decimals — "Rp 118.000". */
export function rupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

/**
 * The timezone every date on this site is formatted in.
 *
 * `Intl.DateTimeFormat` with no `timeZone` uses whatever the runtime is set to,
 * and that is two different answers for the same instant: the server renders in
 * UTC (Vercel, and every container image by default) while the browser renders
 * in the reader's zone. Two consequences, both real:
 *
 *   A post published at 20:00 UTC is 03:00 the *next day* in Jakarta, so an
 *   Indonesian reader is told an article is a day older than it is.
 *
 *   In a client component the server HTML and the hydrated render disagree
 *   about the day, which React reports as a hydration mismatch — intermittent,
 *   because it only happens for rows created in that seven-hour window.
 *
 * Pinning it fixes both, and is correct regardless: this is an Indonesian store
 * and its dates are Indonesian dates.
 */
export const SITE_TIME_ZONE = "Asia/Jakarta";
