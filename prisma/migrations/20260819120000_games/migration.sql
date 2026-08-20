-- The game picker.
--
-- The homepage used to open on the Royal Dream coin grid, which made the first
-- thing every visitor and every ad reviewer saw a list of virtual-currency
-- amounts. This adds the layer above it: a visitor picks a game, and the game
-- decides where they go — the existing Royal Dream top-up page, a blog
-- category, or a URL the operator configures.
--
-- Additive only. Nothing here drops, renames or rewrites an existing column,
-- so the previous release keeps running against this schema unchanged.

-- ------------------------------------------------------------ destinations

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GameDestination') THEN
    CREATE TYPE "GameDestination" AS ENUM ('TOP_UP', 'BLOG_CATEGORY', 'CUSTOM_URL');
  END IF;
END
$$;

-- ------------------------------------------------------------------ games

CREATE TABLE IF NOT EXISTS "games" (
    "id"               TEXT              NOT NULL,
    "name"             TEXT              NOT NULL,
    "slug"             TEXT              NOT NULL,
    "imageUrl"         TEXT              NOT NULL,
    "description"      TEXT              NOT NULL DEFAULT '',
    "destinationType"  "GameDestination" NOT NULL DEFAULT 'BLOG_CATEGORY',
    "destinationValue" TEXT              NOT NULL DEFAULT '',
    "isActive"         BOOLEAN           NOT NULL DEFAULT true,
    "order"            INTEGER           NOT NULL DEFAULT 0,
    "createdAt"        TIMESTAMPTZ(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMPTZ(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "games_slug_key"          ON "games"("slug");
CREATE        INDEX IF NOT EXISTS "games_isActive_order_idx" ON "games"("isActive", "order");

-- ------------------------------------------------------- homepage switch

ALTER TABLE "website_settings"
  ADD COLUMN IF NOT EXISTS "showGames" BOOLEAN NOT NULL DEFAULT true;

-- --------------------------------------------------------- first game row
--
-- One row, and only into an empty table.
--
-- Without it the deploy lands on a homepage whose main section renders
-- nothing: the coin grid has moved to its own page and there is no game to
-- take its place until somebody signs in and adds one. That gap would be
-- visible to every visitor between `pm2 reload` and the operator's first save.
--
-- The image is bundled artwork from /public, not a Cloudinary upload, so this
-- cannot point at a file that does not exist. Replacing it with real key art
-- is the first thing to do in Admin → Games; the destination is already the
-- live Royal Dream top-up page.
--
-- `WHERE NOT EXISTS` makes it a no-op on any database that already has games,
-- so re-running the migration — or restoring a backup taken after it — never
-- duplicates the card.
INSERT INTO "games" ("id", "name", "slug", "imageUrl", "description", "destinationType", "destinationValue", "isActive", "order")
SELECT
  gen_random_uuid()::text,
  'Royal Dream',
  'royal-dream',
  '/art/service-topup.svg',
  'Top up Royal Dream dengan proses cepat dan mudah.',
  'TOP_UP',
  '',
  true,
  0
WHERE NOT EXISTS (SELECT 1 FROM "games");
