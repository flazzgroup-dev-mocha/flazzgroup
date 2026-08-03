import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * One client per process. Next.js hot-reloads modules in development, which
 * would otherwise open a new connection pool on every save.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const int = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * Pool sizing. Postgres connections are a fixed, shared resource, and every
 * migration shell, psql session and app container draws from the same budget.
 * Left unset, node-postgres opens up to 10 per process and never closes idle
 * ones.
 *
 * On Neon this pool sits in front of Neon's own PgBouncer, so it is bounding
 * client-side sockets rather than backends. Keep `DB_POOL_MAX * instances`
 * comfortably under the endpoint's connection limit.
 */
const POOL_MAX = int(process.env.DB_POOL_MAX, 10);
const IDLE_TIMEOUT_MS = int(process.env.DB_POOL_IDLE_MS, 30_000);
const CONNECT_TIMEOUT_MS = int(process.env.DB_CONNECT_TIMEOUT_MS, 10_000);

function createClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and point it at your Postgres instance."
    );
  }

  /**
   * Deliberately no `options: '-c statement_timeout=…'` here.
   *
   * A pooled Neon endpoint rejects the whole connection if the startup packet
   * carries one — `08P01 unsupported startup parameter in options:
   * statement_timeout` — so passing it does not merely fail to apply the
   * guard, it takes the entire application offline against the pooler.
   *
   * The two timeouts are set on the database instead, by the migration
   * 20260730170000_session_timeouts. Server-side settings survive PgBouncer
   * because they are applied when a backend starts, so every connection the
   * pooler opens from then on inherits them.
   */
  const adapter = new PrismaPg({
    connectionString,
    max: POOL_MAX,
    idleTimeoutMillis: IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    application_name: "flazz-group",
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
