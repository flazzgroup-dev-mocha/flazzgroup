-- Badge colour becomes data instead of a string comparison in the frontend.
--
-- ProductsSection decided the colour by reading the badge text:
--
--   product.badge === "Terlaris" ? "bg-gold text-ink" : "bg-volt/85 text-white"
--
-- so every other label an editor wrote — "Best Value", "💎 Premium", "👑 VIP" —
-- came out blue whether or not that was wanted, and promoting one of them to
-- gold meant editing a component and redeploying.
--
-- NOT NULL with a default rather than nullable: "no colour chosen" and "the
-- default colour" are the same statement, and a column that cannot be null is
-- one fewer branch on every read path.

CREATE TYPE "BadgeColor" AS ENUM ('DEFAULT', 'GOLD');

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "badgeColor" "BadgeColor" NOT NULL DEFAULT 'DEFAULT';

-- Carry the existing appearance across.
--
-- Every current row has just been defaulted to DEFAULT, which for the one
-- product badged "Terlaris" would be a visible regression on deploy: it is gold
-- today because of the comparison above. Restating that as data keeps the page
-- looking identical, and from here it is an editor's choice rather than a
-- property of the word.
UPDATE "products" SET "badgeColor" = 'GOLD' WHERE "badge" = 'Terlaris';
