-- Converts every timestamp column to TIMESTAMPTZ.
--
-- The USING clause is deliberate: these columns were filled by
-- DEFAULT CURRENT_TIMESTAMP, which stores the server's local wall clock. A bare
-- cast would reinterpret those values in whatever timezone the migrating
-- session happens to use, shifting all historical rows. Reading them back with
-- current_setting('TimeZone') preserves the original instant on a UTC server
-- (Railway) and on a non-UTC one alike.
--
-- Also drops the unused index on activity_logs.entity and adds the missing one
-- on activity_logs.adminId, which Postgres does not create for foreign keys.

-- DropIndex
DROP INDEX "activity_logs_entity_idx";

-- AlterTable
ALTER TABLE "activity_logs" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE current_setting('TimeZone');

-- AlterTable
ALTER TABLE "admins" ALTER COLUMN "lastLoginAt" SET DATA TYPE TIMESTAMPTZ(3) USING "lastLoginAt" AT TIME ZONE current_setting('TimeZone'),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE current_setting('TimeZone'),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE current_setting('TimeZone');

-- AlterTable
ALTER TABLE "brands" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE current_setting('TimeZone'),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE current_setting('TimeZone');

-- AlterTable
ALTER TABLE "community_links" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE current_setting('TimeZone'),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE current_setting('TimeZone');

-- AlterTable
ALTER TABLE "faqs" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE current_setting('TimeZone'),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE current_setting('TimeZone');

-- AlterTable
ALTER TABLE "features" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE current_setting('TimeZone'),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE current_setting('TimeZone');

-- AlterTable
ALTER TABLE "hero_banners" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE current_setting('TimeZone'),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE current_setting('TimeZone');

-- AlterTable
ALTER TABLE "hero_stats" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE current_setting('TimeZone'),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE current_setting('TimeZone');

-- AlterTable
ALTER TABLE "payment_methods" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE current_setting('TimeZone'),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE current_setting('TimeZone');

-- AlterTable
ALTER TABLE "popular_services" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE current_setting('TimeZone'),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE current_setting('TimeZone');

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE current_setting('TimeZone'),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE current_setting('TimeZone');

-- AlterTable
ALTER TABLE "website_settings" ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE current_setting('TimeZone');

-- CreateIndex
CREATE INDEX "activity_logs_adminId_idx" ON "activity_logs"("adminId");
