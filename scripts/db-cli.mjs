import { spawn } from "node:child_process";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Runs a database command with IPv6 address auto-selection turned off.
 *
 * Node 20 and later race IPv4 and IPv6 when connecting ("Happy Eyeballs").
 * That is an improvement everywhere except on a machine whose IPv6 is broken
 * in the specific way home routers and mobile hotspots tend to break it: the
 * packets are black-holed rather than refused, so nothing comes back to say
 * the route is dead. Each attempt burns its 250 ms budget and the connection
 * fails in well under a second with ETIMEDOUT.
 *
 * Neon publishes AAAA records, so every database command hits this. Prisma
 * reports it as `P1001: Can't reach database server` from the CLI and as a
 * `PrismaClientKnownRequestError` with `code: ETIMEDOUT` from the seed —
 * two very different-looking errors with one cause, neither of which points
 * anywhere near the real problem.
 *
 * This is not a fix. The fix is working IPv6, which is outside the repo. This
 * only stops the whole team from having to know that, and from having to
 * remember an environment variable before every command. What it does is
 * restore Node 18's connection behaviour: resolve, then connect in the order
 * the OS returned.
 *
 * Applied to every script that opens a database connection, `start` included.
 * The alternative — leaving the production server unwrapped on principle — was
 * tried, and it means a locally-served production build cannot reach the
 * database at all, with nothing on screen to say why. The flag costs nothing on
 * a host whose IPv6 works: it falls back to connecting in the order the
 * resolver returned, which is what Node did until version 20.
 */

const FLAG = "--no-network-family-autoselection";
const command = process.argv.slice(2);

if (command.length === 0) {
  console.error("usage: node scripts/db-cli.mjs <command> [args...]");
  process.exit(1);
}

const existing = process.env.NODE_OPTIONS ?? "";
const NODE_OPTIONS = existing.includes(FLAG)
  ? existing
  : `${existing} ${FLAG}`.trim();

// npm puts node_modules/.bin on PATH for its own scripts, but this file is
// also useful on its own — `node scripts/db-cli.mjs prisma migrate status`.
// Adding it here means both work.
const binDir = join(fileURLToPath(new URL("..", import.meta.url)), "node_modules", ".bin");
const PATH = [binDir, process.env.PATH ?? ""].join(delimiter);

/**
 * Passed as one string rather than a command plus an args array.
 *
 * `shell: true` is unavoidable on Windows, where every npm-installed binary is
 * a .cmd shim that spawn cannot execute directly — but combining it with an
 * args array raises DEP0190, because the arguments are concatenated into the
 * shell line rather than escaped. Joining them here says plainly that this is a
 * shell line. Every argument comes from package.json or a developer's own
 * terminal, never from request data.
 */
const child = spawn(command.join(" "), {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, NODE_OPTIONS, PATH, Path: PATH },
});

child.on("exit", (code, signal) => {
  // Re-raise the signal so Ctrl-C behaves as if the child were the only process.
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(`Could not run "${command.join(" ")}":`, error.message);
  process.exit(1);
});
