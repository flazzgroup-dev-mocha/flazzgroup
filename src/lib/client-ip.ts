import "server-only";

/**
 * Who is actually making this request.
 *
 * Every forwarding header is written by whoever sent the request until
 * something we control overwrites it. The original implementation read
 * `X-Forwarded-For[0]` — the one entry a client always controls — so rotating
 * it gave every request a private rate-limit bucket, and the admin login
 * accepted 25 password guesses where an honest client was cut off at 10.
 *
 * The first attempt at a fix traded that for a subtler version of the same
 * mistake: it trusted `cf-connecting-ip`, `x-vercel-forwarded-for` and
 * `true-client-ip` on sight. Those are unforgeable *behind the platform that
 * sets them* and completely forgeable anywhere else, and nothing in the request
 * says which situation you are in. Testing it against a plain `next start`
 * reproduced the original bypass through three new headers.
 *
 * So trust is not inferred here. It is declared.
 *
 * ── TRUSTED_PROXY ─────────────────────────────────────────────────────────
 *
 *   unset      Auto: "vercel" when the VERCEL environment variable is present,
 *              otherwise "none".
 *   none       Ignore every forwarding header. Correct for a process exposed
 *              directly, and for local development.
 *   vercel     Trust `x-vercel-forwarded-for`.
 *   cloudflare Trust `cf-connecting-ip`.
 *   hops:N     Trust `X-Forwarded-For` / `Forwarded`, counting N entries from
 *              the right. N is the number of proxies you run.
 *
 * `VERCEL` is an environment variable the platform injects into the runtime,
 * not a header, so a request cannot fake it — which is what makes the default
 * safe to infer.
 *
 * When no mode identifies the caller, `clientIp` returns null and the limiter
 * puts every such request in one shared bucket. That fails closed: an
 * unidentifiable flood is throttled as a single caller. A misconfigured deploy
 * therefore shows up as legitimate users seeing 429s — loud, and fixable —
 * rather than as a limiter that silently counts to one forever.
 */

/**
 * Anything carrying request headers.
 *
 * A `Request` satisfies this, and so does the object returned by Next's
 * `headers()` — which is what lets a Server Component resolve the caller's
 * address without fabricating a Request around it and losing the real one.
 */
export type HeaderSource = { headers: Headers | Pick<Headers, "get"> };

type TrustMode =
  | { kind: "none" }
  | { kind: "header"; header: string }
  | { kind: "hops"; count: number };

function trustMode(): TrustMode {
  const declared = (process.env.TRUSTED_PROXY ?? "").trim().toLowerCase();

  if (!declared) {
    // Vercel sets VERCEL=1 in the runtime environment on every deployment.
    return process.env.VERCEL
      ? { kind: "header", header: "x-vercel-forwarded-for" }
      : { kind: "none" };
  }

  if (declared === "none") return { kind: "none" };
  if (declared === "vercel") {
    return { kind: "header", header: "x-vercel-forwarded-for" };
  }
  if (declared === "cloudflare") {
    return { kind: "header", header: "cf-connecting-ip" };
  }

  const hops = declared.match(/^hops:(\d+)$/);
  if (hops) {
    const count = Number(hops[1]);
    if (count >= 1) return { kind: "hops", count };
  }

  /**
   * An unreadable value is treated as "no proxy", not as the default.
   *
   * A typo in this variable must not silently re-enable header trust. The
   * strict direction costs a shared bucket; the lax direction costs the
   * bypass this module exists to prevent.
   */
  console.error(
    `[client-ip] TRUSTED_PROXY="${declared}" is not recognised; ignoring forwarding headers. Expected none | vercel | cloudflare | hops:N`
  );
  return { kind: "none" };
}

/**
 * Normalises one address, or rejects it.
 *
 * Proxies emit a surprising range of things here — bracketed IPv6, an appended
 * port, the literal string "unknown" from older Squid, IPv4-mapped IPv6 — and
 * an un-normalised value means the same client lands in two different buckets
 * depending on which form arrived.
 */
function normalise(value: string | null | undefined): string | null {
  if (!value) return null;

  let address = value.trim();
  if (!address || address.toLowerCase() === "unknown") return null;

  // "[2001:db8::1]:443" -> "2001:db8::1"
  const bracketed = address.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketed) {
    address = bracketed[1];
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(address)) {
    // Only for IPv4: a bare IPv6 address is full of colons and must not be
    // split on the last one.
    address = address.slice(0, address.lastIndexOf(":"));
  }

  // "::ffff:203.0.113.5" is the same client as "203.0.113.5".
  const mapped = address.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (mapped) address = mapped[1];

  const isIPv4 =
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(address) &&
    address.split(".").every((part) => Number(part) <= 255);
  const isIPv6 = /^[0-9a-f:]+$/i.test(address) && address.includes(":");

  return isIPv4 || isIPv6 ? address.toLowerCase() : null;
}

/**
 * The entry `count` places from the right of a forwarding list.
 *
 * Each proxy appends the address it received the connection from, so the
 * rightmost entry was written by the proxy nearest us and the leftmost by the
 * client. Counting from the right is the whole point: `list[0]` is hearsay.
 *
 * Too few entries means the request did not traverse the declared proxies, so
 * nothing in the list was written by us — null, not a guess.
 */
function fromRight(values: string[], count: number) {
  if (values.length < count) return null;
  return normalise(values[values.length - count]);
}

/** RFC 7239 `Forwarded: for=192.0.2.1;proto=https, for=198.51.100.1` */
function forwardedEntries(header: string) {
  return header
    .split(",")
    .map((element) => element.match(/for\s*=\s*"?([^;,"]+)"?/i)?.[1] ?? "");
}

/**
 * The client address, or null when nothing trustworthy identifies it.
 *
 * Null is a real answer, not a failure: it means this request arrived without
 * infrastructure that vouches for its origin, and the caller should treat every
 * such request as one caller rather than inventing an identity from data the
 * sender chose.
 */
export function clientIp(request: HeaderSource): string | null {
  const mode = trustMode();

  if (mode.kind === "none") return null;

  if (mode.kind === "header") {
    return normalise(request.headers.get(mode.header));
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const address = fromRight(forwardedFor.split(","), mode.count);
    if (address) return address;
  }

  const standard = request.headers.get("forwarded");
  if (standard) {
    const address = fromRight(forwardedEntries(standard), mode.count);
    if (address) return address;
  }

  /**
   * `X-Real-IP` last, and only with exactly one proxy.
   *
   * nginx's `proxy_set_header X-Real-IP $remote_addr` overwrites it, which
   * makes it trustworthy behind one hop and misleading behind two: the inner
   * proxy would be recording the *outer proxy's* address, not the visitor's.
   * Beyond one hop the forwarding chain is the only honest source, so this is
   * skipped rather than believed.
   */
  return mode.count === 1
    ? normalise(request.headers.get("x-real-ip"))
    : null;
}
