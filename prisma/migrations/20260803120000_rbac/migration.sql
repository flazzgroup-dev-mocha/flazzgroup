-- Role-based access control.
--
-- Until now every account that could sign in could do everything, which was
-- fine while there was exactly one account. Adding customer-service staff means
-- separating "can change what the site displays" from "can change what the site
-- is" — its URL, its SEO, its tracking IDs, and who else may sign in.

-- ------------------------------------------------------------------- roles

CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN');

ALTER TABLE "admins"
  ADD COLUMN IF NOT EXISTS "role"      "AdminRole" NOT NULL DEFAULT 'ADMIN',
  ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "isActive"  BOOLEAN     NOT NULL DEFAULT true;

-- Everyone who already had an account had unrestricted access, so that is what
-- they keep. Defaulting them to ADMIN instead would lock the owner out of the
-- settings screen the moment this deploys — and out of the Users screen that is
-- the only way to promote themselves back.
UPDATE "admins" SET "role" = 'SUPER_ADMIN';

CREATE INDEX IF NOT EXISTS "admins_role_isActive_idx" ON "admins"("role", "isActive");

-- --------------------------------------------------------------- audit log

CREATE TYPE "AuditAction" AS ENUM (
  'LOGIN',
  'LOGIN_FAILED',
  'LOGOUT',
  'ADMIN_CREATED',
  'ADMIN_UPDATED',
  'ADMIN_DELETED',
  'ADMIN_ENABLED',
  'ADMIN_DISABLED',
  'ROLE_CHANGED',
  'PASSWORD_RESET',
  'SETTINGS_CHANGED',
  'ACCESS_DENIED'
);

-- Separate from activity_logs, which is pruned to 200 rows to keep the
-- dashboard feed readable. A security trail that can be flushed by somebody
-- editing FAQs is not a security trail.
--
-- actorId is nullable and actorEmail is stored verbatim because the two most
-- interesting rows are a failed login for an address that never existed, and
-- the history of an account that has since been deleted.
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id"          TEXT           NOT NULL,
    "action"      "AuditAction"  NOT NULL,
    "actorId"     TEXT,
    "actorEmail"  TEXT           NOT NULL DEFAULT '',
    "targetId"    TEXT,
    "targetEmail" TEXT           NOT NULL DEFAULT '',
    "summary"     TEXT           NOT NULL DEFAULT '',
    "ipAddress"   TEXT           NOT NULL DEFAULT '',
    "userAgent"   TEXT           NOT NULL DEFAULT '',
    "createdAt"   TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- ON DELETE SET NULL, not CASCADE: deleting an account must never erase the
-- record of what that account did.
ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx"        ON "audit_logs"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "audit_logs_actorId_idx"          ON "audit_logs"("actorId");
CREATE INDEX IF NOT EXISTS "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt" DESC);
