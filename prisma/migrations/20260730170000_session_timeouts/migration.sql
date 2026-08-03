-- Session guards, moved from the connection string to the database.
--
-- These two settings used to be sent per connection as
--   options=-c statement_timeout=… -c idle_in_transaction_session_timeout=…
-- which a pooled Neon endpoint refuses outright:
--
--   08P01  unsupported startup parameter in options: statement_timeout
--          Please use unpooled connection or remove this parameter
--
-- That is not a degraded guard, it is a dead application — every connection
-- through the pooler fails. Setting them on the database instead keeps the
-- protection and is invisible to PgBouncer: defaults are applied when a
-- backend starts, so every server connection the pooler opens inherits them.
-- Existing pooled backends keep their old values until they cycle.
--
-- statement_timeout                     one pathological query cannot pin a
--                                       connection indefinitely
-- idle_in_transaction_session_timeout   a request that died mid-transaction
--                                       releases its locks
--
-- Because these are database-wide they also apply to migrations. A future
-- migration that does real work — backfilling a large table, building an index
-- concurrently — must lift the limit for its own session, or the server will
-- cancel it at 15 seconds:
--
--   SET LOCAL statement_timeout = 0;
--
-- Wrapped so the migration still succeeds where the role does not own the
-- database — a managed provider that pre-sets these, or a restricted role.
-- The app is correct either way; this only removes a footgun.

DO $$
BEGIN
  EXECUTE format(
    'ALTER DATABASE %I SET statement_timeout = %L',
    current_database(), '15s'
  );
  EXECUTE format(
    'ALTER DATABASE %I SET idle_in_transaction_session_timeout = %L',
    current_database(), '15s'
  );
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE
      'Skipped: the current role cannot ALTER DATABASE %. Set statement_timeout and idle_in_transaction_session_timeout on the database by hand.',
      current_database();
END
$$;
