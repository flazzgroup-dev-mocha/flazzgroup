import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Config for the Prisma CLI only — the application builds its own client in
 * src/lib/prisma.ts.
 *
 * Migrations use `DIRECT_URL` when it is set, falling back to `DATABASE_URL`.
 * On Neon those are two different endpoints and the distinction matters:
 *
 *   DATABASE_URL  ep-xxx-pooler.<region>.aws.neon.tech   PgBouncer, for the app
 *   DIRECT_URL    ep-xxx.<region>.aws.neon.tech          the compute itself
 *
 * Migrate takes a session-level advisory lock so two deploys cannot race, and
 * it runs DDL that expects to stay on one backend. Neither survives a
 * transaction-mode pooler reliably: the lock can be taken on one server
 * connection and released on another. Some commands do appear to work through
 * the pooler — that is luck, not support.
 *
 * A pooled endpoint also refuses the startup parameters this project used to
 * send; see migration 20260730170000_session_timeouts.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
