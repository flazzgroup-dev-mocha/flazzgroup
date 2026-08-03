# FLAZZ GROUP — Database Architecture Audit

Date: 28 July 2026 · PostgreSQL 18 · Prisma 7.9 (`prisma-client` generator +
`@prisma/adapter-pg`) · Railway

Scope: all 12 models, every relation, index and constraint, every Prisma Client
call site, both migrations, and the connection layer. Findings were measured
against a live database, not read off the schema.

Nothing in the public API changed. Two additive migrations, no data loss, no
breaking changes.

## Measured impact

Query counts per code path, captured with Prisma's query event:

| Path | Before | After |
| --- | --- | --- |
| Homepage, cold cache | 13 | **10** |
| Admin dashboard (uncached, every load) | 11 | **3** |
| One admin write (row + activity + prune) | 3, growing to 5 past 200 log rows | **3, fixed** |
| Reorder 6 items | 7 | **1** |
| Reorder 200 items | 201 | **1** |

Verified after the changes: migrations apply cleanly, `tsc` and `eslint` clean,
production build succeeds, and the 26-check browser regression suite is still
26/26.

---

## Critical

### 1. Every timestamp was `timestamp without time zone`
Prisma's default `DateTime` maps to `TIMESTAMP(3)`, and the columns were filled
by `DEFAULT CURRENT_TIMESTAMP` — which stores the **server's local wall clock**
with no record of the offset. Confirmed on the audit database: `SHOW timezone`
returned `Asia/Bangkok`.

Why it matters: the same instant reads back differently if the server timezone
ever changes, if a replica runs in another zone, or if a client writes a UTC
value into the same column. Ordering by `createdAt` across a DST boundary can
invert. Railway runs UTC today, so the bug is latent rather than active — which
is exactly when it is cheap to fix.

All 23 timestamp columns are now `TIMESTAMPTZ(3)`.

**The conversion needed care.** Prisma generated a bare
`SET DATA TYPE TIMESTAMPTZ(3)`, which reinterprets existing values using
whatever timezone the migrating session happens to have — silently shifting
every historical row by the server's offset. The migration was hand-edited to:

```sql
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3)
  USING "createdAt" AT TIME ZONE current_setting('TimeZone')
```

`current_setting('TimeZone')` reads the values back in the same zone
`CURRENT_TIMESTAMP` wrote them, so the instant is preserved on a UTC server and
a non-UTC one alike. Verified: the three newest `activity_logs` rows read
identically before and after.

### 2. Foreign key with no index
`activity_logs.adminId` references `admins.id` with `ON DELETE SET NULL`.
Postgres does **not** index foreign keys automatically. Confirmed with a
`pg_constraint`/`pg_index` join: `covering_indexes = 0`.

Two consequences: deleting an admin scans the whole activity table to null out
references, and the dashboard's join had no index to use. Added
`@@index([adminId])`; confirmed the planner now chooses
`Index Scan using activity_logs_adminId_idx`.

### 3. Connection pool completely unconfigured
`new PrismaPg({ connectionString })` inherits node-postgres defaults: max 10
connections, **no idle timeout**, no connection timeout, and — from the server —
`statement_timeout = 0` and `idle_in_transaction_session_timeout = 0` (both
confirmed via `pg_settings`).

That combination is how a Railway database runs out of connections: idle
sockets are never reclaimed, one slow query pins a connection indefinitely, and
a request that dies mid-transaction holds its connection until the process
restarts. `max_connections` is 100 for the entire instance, shared with every
`psql` session and migration shell.

[src/lib/prisma.ts](src/lib/prisma.ts) now sets pool size, idle and connect
timeouts, a 15 s `statement_timeout` and a 15 s
`idle_in_transaction_session_timeout`, plus an `application_name` so
connections are identifiable in `pg_stat_activity`. All tunable by environment
variable — see [.env.example](.env.example).

---

## High

### 4. Reorder was N round trips
`prisma.$transaction(ids.map(id => prisma.brand.update(...)))` sends one UPDATE
per row. Measured: 7 statements to reorder 6 brands; 201 for a 200-item list,
each a separate round trip to Railway inside a held transaction.

[src/lib/reorder.ts](src/lib/reorder.ts) replaces it with a single
`UPDATE … FROM (VALUES …)` — **1 statement regardless of list length**, atomic
without an explicit transaction. Table names come from a fixed map in that
file; the ids are bound parameters, never interpolated.

### 5. Activity pruning cost three queries and could over-delete
`pruneActivity()` ran a `findMany`, then a `findUnique`, then a `deleteMany`
after **every** admin write. Worse, it deleted by
`createdAt <= cutoff`, so any other row sharing that millisecond was collateral.

Now one statement that deletes by id:

```sql
DELETE FROM "activity_logs"
WHERE "id" IN (
  SELECT "id" FROM "activity_logs" ORDER BY "createdAt" DESC, "id" DESC OFFSET 200
)
```

### 6. The dashboard issued 11 queries on every load
Eight separate `SELECT count(*)` round trips, plus settings, plus the activity
feed — and the dashboard is uncached. Collapsed the counts into one statement
with eight scalar subqueries: **11 → 3**.

### 7. Overfetch: an unused join on an unindexed FK
The activity feed used `include: { admin: { select: { name: true } } }`, but the
rendered row only shows the label, action, entity and time — the admin name was
never displayed. That join hit the missing FK index from finding #2. Replaced
with an explicit `select` of the five fields actually rendered.

### 8. A read path that wrote
`getSettings()` used `upsert`, so **every cache miss issued a write** — taking a
row lock, dirtying a page, and failing outright against a read replica. Now it
reads first and only creates the row on a database that has never been seeded.

---

## Medium

### 9. Redundant index
`activity_logs_entity_idx` had **0 scans** in `pg_stat_user_indexes`, and no
query in the codebase filters by `entity` — the dashboard reads the newest N
rows regardless of resource. It was pure write amplification on the hottest
insert path. Dropped.

### 10. The settings singleton was a convention, not a rule
Every read and write targets `id = 'settings'`, but nothing prevented a second
row. A stray insert would be invisible to the application while quietly holding
content. Added a `CHECK ("id" = 'settings')` constraint, with a defensive
`DELETE` first so it applies cleanly to a database that already has extras.
Verified: inserting a second row is now rejected.

### 11. No pagination on list endpoints
`GET /api/<resource>` returns every row. Correct at today's volumes (6 brands, 8
products) and the admin search added in the previous audit is client-side for
the same reason. Add `take`/`cursor` when any table passes a few hundred rows —
the products table is the one likely to.

---

## Low

- **`String[]` for `bullets` and `metaItems`** — deliberate denormalisation.
  They are ordered, small, and never queried or joined; a child table would add
  a join to every homepage render for no benefit. Correct as-is.
- **`Product.price` as `Int`** — right call. Rupiah has no minor unit in
  practice, and integers avoid float rounding. Keep it.
- **No soft delete.** Deletes are hard, and the activity log records that a
  delete happened but not what was deleted. For editorial content that is a
  reasonable trade; if "undo" is ever wanted, add `deletedAt DateTime?` plus a
  partial index (`WHERE "deletedAt" IS NULL`) rather than a boolean.
- **`cuid()` primary keys.** Fine. `uuidv7()` would give better index locality
  at high insert rates, but nothing here inserts at that rate.
- **Migration safety.** Both migrations are additive; the timestamptz change
  rewrites tables under an `ACCESS EXCLUSIVE` lock, which is instant at this
  size but would need `CONCURRENTLY`-style planning on large tables.
- **Prepared statements.** The pg adapter parameterises everything; no raw
  string interpolation of user data exists anywhere in the codebase.

---

## Verified sound

- **Normalisation** — content tables are independent aggregates with no
  redundant columns; the only relation is `ActivityLog → Admin`, correctly
  `SetNull` so history survives an admin being removed.
- **No N+1 anywhere.** The homepage fetches ten independent collections in one
  `Promise.all`; no per-row queries exist in any render path.
- **Composite indexes match the queries.** Every list reads
  `WHERE isActive = true ORDER BY "order", "createdAt"`, and every sortable
  table carries `@@index([isActive, order])` (`[showOnHomepage, order]` for
  brands). `EXPLAIN ANALYZE` shows sequential scans today, which is the correct
  plan for six-row tables — the indexes take over as rows grow.
- **Transactions** — used where atomicity is actually required, not sprinkled.
- **Caching** — every homepage read is tag-cached, so steady-state page views
  hit the database zero times; only the admin panel is uncached, by design.

---

## Recommended next

1. **Run the migrations on Railway**: `npm run db:migrate`. Both are additive
   and safe. The timestamptz conversion locks each table briefly — at current
   sizes, milliseconds.
2. **Set `DB_POOL_MAX`** to match your Railway plan and instance count. The
   default of 10 suits a single container; keep `pool × instances` well under
   `max_connections` (100).
3. **Enable `pg_stat_statements`** on Railway. It is the fastest way to find
   the next slow query once there is real traffic, and this audit had to infer
   from plans instead.
4. **Add pagination** to the product and activity endpoints before either
   passes a few hundred rows.
5. **Consider a unique index on `brands.name`** and `payment_methods.name`.
   Not applied here: if production already holds duplicates the migration would
   fail, and that is your data to check first.
6. **Schedule a `VACUUM ANALYZE`** or confirm autovacuum is on. Table statistics
   on the audit database were stale (`n_live_tup` read 0 for populated tables),
   which is harmless at this size but degrades planning as tables grow.
