-- website_settings is a singleton by convention: every read and write targets
-- id = 'settings'. Nothing stopped a second row from being inserted, and if one
-- ever appeared it would be invisible to the app while quietly holding stale
-- content. A CHECK constraint makes the convention a rule.
--
-- Written defensively so it is safe to run against a database that somehow
-- already holds extra rows: those are removed first, keeping the canonical one.

DELETE FROM "website_settings" WHERE "id" <> 'settings';

ALTER TABLE "website_settings"
  ADD CONSTRAINT "website_settings_singleton" CHECK ("id" = 'settings');
