-- Homepage mode, and a page for every game.
--
-- Two problems, one migration, because they are the same problem seen from two
-- ends.
--
--   1. The homepage had two independent switches — `showGames` and, before it,
--      the product grid — so "picker" and "coin grid" were a combination
--      rather than a choice. Production had reached the state that proves the
--      point: `showGames = false` with the coin grid already moved to its own
--      page, so the homepage's main slot rendered nothing at all.
--
--   2. Where a game card pointed was stored per row, as a type plus a string.
--      Three of the four live rows named blog categories that do not exist
--      (`mobile-legends`, `free-fire`, `pubg-mobile`), so three of four cards
--      led to an empty archive. Routing belongs to the application: every game
--      now has `/top-up/<slug>`, and what that page contains is decided by
--      `topUpEnabled`.
--
-- Additive only. Nothing is dropped or renamed: `showGames`, `destinationType`
-- and `destinationValue` keep their columns and their data so the previous
-- release still runs against this schema, and so a rollback loses nothing.
-- They can be dropped in a later release once this one has proven itself.

-- ------------------------------------------------------------ homepage mode

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HomepageMode') THEN
    CREATE TYPE "HomepageMode" AS ENUM ('GAME', 'TOP_UP');
  END IF;
END
$$;

ALTER TABLE "website_settings"
  ADD COLUMN IF NOT EXISTS "homepageMode" "HomepageMode" NOT NULL DEFAULT 'GAME';

-- --------------------------------------------------------------- game page

ALTER TABLE "games"
  ADD COLUMN IF NOT EXISTS "about"               TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "articleCategorySlug" TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "topUpEnabled"        BOOLEAN NOT NULL DEFAULT false;

-- ---------------------------------------------------------------- backfill
--
-- The new columns are derived from the old ones, so no operator has to
-- re-enter anything and no card changes meaning across the deploy.
--
--   TOP_UP        → the game whose page carries the catalogue.
--   BLOG_CATEGORY → the slug becomes the game page's "read the articles" link,
--                   which renders only when that category actually exists.
--   CUSTOM_URL    → deliberately not carried over. A stored external URL is
--                   the thing this release removes from routing, and there are
--                   no rows using it.
UPDATE "games"
SET "topUpEnabled" = true
WHERE "destinationType" = 'TOP_UP' AND "topUpEnabled" = false;

UPDATE "games"
SET "articleCategorySlug" = "destinationValue"
WHERE "destinationType" = 'BLOG_CATEGORY'
  AND "destinationValue" <> ''
  AND "articleCategorySlug" = '';

-- At most one game may own the catalogue — see the model comment. If history
-- ever produced more than one TOP_UP row, keep the first in display order.
UPDATE "games"
SET "topUpEnabled" = false
WHERE "topUpEnabled" = true
  AND "id" <> (
    SELECT "id" FROM "games"
    WHERE "topUpEnabled" = true
    ORDER BY "order" ASC, "createdAt" ASC
    LIMIT 1
  );

-- ------------------------------------------------------- the mode to land on
--
-- Not a straight copy of `showGames`, because copying it would land production
-- on the broken state described at the top: `showGames = false` and no coin
-- grid on the homepage either, which is a homepage with an empty middle.
--
-- The honest question is "what can this homepage actually show", so: the
-- picker when there is something to pick, and the catalogue when there is not.
-- Either way the operator can change it in one click in Admin → Settings.
UPDATE "website_settings"
SET "homepageMode" = CASE
  WHEN EXISTS (SELECT 1 FROM "games" WHERE "isActive" = true) THEN 'GAME'::"HomepageMode"
  ELSE 'TOP_UP'::"HomepageMode"
END;
