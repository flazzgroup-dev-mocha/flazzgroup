import type { Settings } from "@/lib/queries";

/**
 * What the browser is told about analytics.
 *
 * Resolved on the server and passed down as props, so the client never guesses
 * and never ships a disabled integration's ID. Only IDs reach the browser —
 * `META_ACCESS_TOKEN` is server-only and must never appear here.
 */
export type AnalyticsConfig = {
  gtmId: string;
  ga4Id: string;
  metaPixelId: string;
  clarityId: string;
  googleAdsId: string;
  googleAdsConversionLabel: string;
  /** True when at least one integration is configured and switched on. */
  active: boolean;
};

/**
 * A blank column falls back to the environment.
 *
 * Both exist on purpose. `NEXT_PUBLIC_*` is how a deploy arrives already
 * configured, before anyone has opened the admin panel; the database is how a
 * marketer swaps a pixel at 9pm without a redeploy. The database wins when it
 * has an answer.
 *
 * `NEXT_PUBLIC_*` values are inlined at build time, so they are read here
 * rather than through a dynamic key — a computed `process.env[name]` lookup
 * would come back undefined in the browser bundle.
 */
function resolve(stored: string, fallback: string | undefined, enabled: boolean) {
  if (!enabled) return "";
  return stored.trim() || (fallback ?? "").trim();
}

export function toAnalyticsConfig(settings: Settings): AnalyticsConfig {
  const config: Omit<AnalyticsConfig, "active"> = {
    gtmId: resolve(
      settings.gtmId,
      process.env.NEXT_PUBLIC_GTM_ID,
      settings.gtmEnabled
    ),
    ga4Id: resolve(
      settings.ga4Id,
      process.env.NEXT_PUBLIC_GA4_ID,
      settings.ga4Enabled
    ),
    metaPixelId: resolve(
      settings.metaPixelId,
      process.env.NEXT_PUBLIC_META_PIXEL_ID,
      settings.metaPixelEnabled
    ),
    clarityId: resolve(
      settings.clarityId,
      process.env.NEXT_PUBLIC_CLARITY_ID,
      settings.clarityEnabled
    ),
    googleAdsId: resolve(
      settings.googleAdsId,
      process.env.NEXT_PUBLIC_GOOGLE_ADS_ID,
      settings.googleAdsEnabled
    ),
    googleAdsConversionLabel: resolve(
      settings.googleAdsConversionLabel,
      process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL,
      settings.googleAdsEnabled
    ),
  };

  return {
    ...config,
    active: Boolean(
      config.gtmId || config.ga4Id || config.metaPixelId || config.clarityId
    ),
  };
}

/** Search Console's verification token, database first, then environment. */
export function siteVerification(settings: Settings) {
  return (
    settings.googleSiteVerification.trim() ||
    (process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? "").trim()
  );
}
