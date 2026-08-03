-- Banner simplification + Cloudinary media metadata.
--
-- Written by hand rather than generated. `prisma migrate diff` also wanted to
-- drop the two GIN indexes on blog_posts and re-create an implicit join index;
-- those are correct as they stand and are left alone here.

-- ---------------------------------------------------------------- banners
--
-- A hero slide is now just artwork: the headline, chips and buttons live in
-- the image a designer exports. The old text columns are deliberately NOT
-- dropped — this migration must be reversible without data loss, and a
-- follow-up can remove them once the deploy has settled.

ALTER TABLE "hero_banners"
  ADD COLUMN IF NOT EXISTS "mobileImageUrl" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "destinationUrl" TEXT NOT NULL DEFAULT '';

-- `title` was required under the old model. New rows do not write it, so it
-- needs a default or every insert fails.
ALTER TABLE "hero_banners" ALTER COLUMN "title" SET DEFAULT '';

-- Carry the existing click-through across so no live banner loses its link.
-- The primary CTA is the one that was actually wired up; the secondary was
-- decorative on most slides.
UPDATE "hero_banners"
SET "destinationUrl" = "buttonLink"
WHERE "destinationUrl" = ''
  AND "buttonLink" <> ''
  AND "buttonLink" <> '#';

-- Give every existing banner alt text, since the artwork now carries the
-- entire message and an empty alt would leave that message unreadable to a
-- screen reader. The old headline is the best description available.
UPDATE "hero_banners"
SET "imageAlt" = btrim(concat_ws(' ', "title", "highlight"))
WHERE btrim(coalesce("imageAlt", '')) = ''
  AND btrim(concat_ws(' ', "title", "highlight")) <> '';

-- ------------------------------------------------------------ media assets

CREATE TABLE IF NOT EXISTS "media_assets" (
    "id"               TEXT NOT NULL,
    "publicId"         TEXT NOT NULL,
    "secureUrl"        TEXT NOT NULL,
    "width"            INTEGER NOT NULL,
    "height"           INTEGER NOT NULL,
    "format"           TEXT NOT NULL,
    "bytes"            INTEGER NOT NULL,
    "altText"          TEXT NOT NULL DEFAULT '',
    "originalFilename" TEXT NOT NULL DEFAULT '',
    "folder"           TEXT NOT NULL,
    "createdAt"        TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "media_assets_publicId_key"
  ON "media_assets"("publicId");

-- Content rows store the delivery URL, not the public id, so a lookup by URL
-- is the hot path for delete and replace.
CREATE UNIQUE INDEX IF NOT EXISTS "media_assets_secureUrl_key"
  ON "media_assets"("secureUrl");

CREATE INDEX IF NOT EXISTS "media_assets_folder_createdAt_idx"
  ON "media_assets"("folder", "createdAt" DESC);
