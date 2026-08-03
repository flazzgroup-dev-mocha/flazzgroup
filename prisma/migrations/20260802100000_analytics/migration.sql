-- Analytics configuration on the settings singleton.
--
-- IDs are stored rather than read only from the environment so a marketer can
-- swap a pixel without a redeploy. The NEXT_PUBLIC_* variables remain the
-- fallback for a blank column, which keeps a fresh deploy working before
-- anyone opens the admin panel.
--
-- Each integration carries its own switch. Disabling one must not mean
-- deleting its ID, or turning it back on later means going to find it again.

ALTER TABLE "website_settings"
  ADD COLUMN IF NOT EXISTS "gtmId"                    TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "gtmEnabled"               BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "ga4Id"                    TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "ga4Enabled"               BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "metaPixelId"              TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "metaPixelEnabled"         BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "clarityId"                TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "clarityEnabled"           BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "googleAdsId"              TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "googleAdsConversionLabel" TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "googleAdsEnabled"         BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "googleSiteVerification"   TEXT    NOT NULL DEFAULT '';
