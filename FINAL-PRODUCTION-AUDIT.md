# FINAL PRODUCTION AUDIT — FLAZZ GROUP

**Date:** 12 August 2026
**Stack:** VPS → Cloudflare → Next.js 15.5.21 (Node) → Neon PostgreSQL / Cloudinary
**Companion documents:** [FINAL-SEO-AUDIT.md](./FINAL-SEO-AUDIT.md) · [TUTOR.md](./TUTOR.md)

This document covers build integrity, runtime behaviour, database, security,
deployment and operations. SEO findings live in the companion document; the two
overlap only where a defect affects both.

---

## Verdict

# READY WITH FIXES

The application is production-grade. The build is clean on all three gates,
migrations are current, no public route can be made to return 5xx, authorization
holds on every admin endpoint, and the security regressions listed in the brief
as "previously found" are genuinely fixed — I re-attacked each one rather than
taking the previous audit's word for it.

**Two things gate a plain READY, and both are on the VPS, which I could not
reach:**

1. `TRUSTED_PROXY` must be `cloudflare` **and** the origin must refuse
   non-Cloudflare traffic.
2. The app must run as **exactly one process**.

Both are verifiable in under a minute — commands in
[§ 9](#9--what-you-must-verify-on-the-vps).

---

## 1 · Build and type integrity

| Gate | Command | Result |
| --- | --- | --- |
| TypeScript | `npx tsc --noEmit` | **exit 0**, no diagnostics |
| Lint | `npx eslint .` | **exit 0**, no warnings |
| Production build | `npm run build` | **Compiled successfully**, 48/48 static pages |
| Migrations | `npx prisma migrate status` | **10/10 applied**, schema up to date |
| Clean rebuild | `rm -rf .next && npm run build` | Succeeds from scratch |

Run three times across the audit, including after every fix. No server/client
boundary violations, no broken imports, no dead routes, no unreferenced
components (checked by resolving every file in `src/components` and `src/lib`
against the import graph — **zero unreferenced**), and no unused dependencies
(all 14 checked are imported).

**One non-blocking warning**, emitted by `pg-connection-string` during the build:

```
SSL modes 'prefer', 'require', 'verify-ca' are treated as aliases for
'verify-full'. In pg v9 these will adopt libpq semantics (weaker guarantees).
```

Harmless today — the current behaviour is the *stricter* one. At the next major
`pg`/Prisma bump, change `sslmode=require` to `sslmode=verify-full` in both
connection strings so the behaviour does not silently weaken.

---

## 2 · Runtime robustness

**45 hostile URLs, zero 5xx.** The three classes of unauthenticated 500 that
earlier audits found are all closed, and I re-tested each by reproducing the
original input:

| Original defect | Attack re-run | Result |
| --- | --- | --- |
| `?page=1e999` → `skip: Infinity` | `/blog?page=1e999` | **308 → `/blog`** |
| `?page=999999999999999` → `skip: 9e21` | same | **308 → `/blog`** |
| `?q=%00` → Postgres `22021` | `/blog?q=%00` | **308 → `/blog`** |

The parameter layer (`src/lib/blog/params.ts`) is the reason: a request either
names a page that could exist, or it is answered with a redirect or a 404. It is
never allowed to become a database error. Malformed page numbers collapse to
page 1 and redirect; syntactically valid but out-of-range numbers 404 **without
querying the database at all**, so a crawler walking page numbers costs nothing.

Also verified: unknown category → 404, unknown slug → 404, path traversal → 404,
trailing slash → 308, `?utm_source=` → 200 with a canonical pointing at the
clean URL (dedupes without destroying campaign attribution).

---

## 3 · Security

Every item below was **actively attacked**, not read.

### Rate limiting / `X-Forwarded-For` — bypass closed

16 login attempts, each with a different `X-Forwarded-For`:

```
401 401 401 401 401 401 401 401 401 401 429 429 429 429 429 429
```

Exactly 10 then blocked — rotation does **not** mint new buckets. Repeated
through `CF-Connecting-IP`, `X-Vercel-Forwarded-For`, `True-Client-IP`,
`X-Real-IP` and RFC 7239 `Forwarded`: **all 429**. No forwarding header can
create a fresh bucket.

The design is sound: trust is **declared** via `TRUSTED_PROXY`, never inferred
from headers. See [§ 5](#5--the-trusted_proxy-problem) for the flip side.

### Authorization

```
GET  /api/settings /api/blog/posts /api/admins /api/upload /api/brands  → 401
POST /api/blog/posts (no session)                                       → 401
DELETE /api/brands/1 (no session)                                       → 401
GET  /admin                                                             → 307 → /admin/login
```

Middleware refuses at the edge for pages; API authorization is deliberately
decided in `withAdmin` rather than middleware, so refusals are *audit-logged* —
the edge runtime cannot reach Prisma. Correct answer plus evidence.

### JSON-LD injection

The serialiser escapes `<`, `>`, `&`, U+2028 and U+2029 to `\uXXXX`. Six
breakout payloads tested; all escaped, all round-tripped byte-identical through
`JSON.parse`:

```
</script><script>alert(1)</script>      PASS
</ScRiPt ><img src=x onerror=alert(1)>  PASS
<!--<script>                            PASS
]]></script>                            PASS
U+2028 / U+2029                         PASS
&lt;/script&gt;                         PASS
```

Confirmed at the HTTP layer too: no raw `<` or `>` survives inside any
`<script type="application/ld+json">` on any audited page.

### Upload pipeline

`npm run media:check` — 24 assertions against the real Cloudinary account, all
passing. Type is decided by **magic bytes**, never by `Content-Type` or the
filename (this was the SVG-sanitisation bypass: the same bytes were cleaned when
labelled `image/svg+xml` and stored raw when labelled `image/png`). WEBP and
AVIF are correctly identified by container offset rather than leading magic, so
an MP4 is not misread as AVIF. SVG detection is anchored at the root element, so
an HTML file containing an inline `<svg>` is rejected. Collisions resolve to
`-2`/`-3` and **never overwrite** (`overwrite: false`, verified).

### Other surfaces

| Surface | Result |
| --- | --- |
| Open redirect (`?next=`) | Not exploitable — prefix-checked to `/admin`; `//evil.com` fails the check |
| CSRF | `SameSite=Lax` cookie + `Origin` check on state-changing requests. Evil origin → **403** |
| SQL injection | `?q=' OR 1=1--` → 200, no injection. Search is a bound parameter to `$queryRaw` |
| Protocol-relative bypass | `allowProtocolRelative: false` in the sanitiser |
| Stored XSS in articles | `sanitize-html` with a tag/attribute/scheme allowlist and an iframe host allowlist |
| Security headers | CSP, HSTS (2 y, preload), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` — all present on every response |

**Two accepted residual risks**, both documented rather than papered over:

- **`/api/track` accepts requests with no `Origin` header.** Deliberate — non-browser
  clients send none. Browsers always send `Origin` on cross-origin POST, so CSRF
  is still blocked. The consequence is that a script can inject fake Meta
  conversions at up to 60/min. Bounded by the rate limit and a closed enum of
  event names. Inherent to any public Conversions-API relay; not worth
  redesigning.
- **The SVG sanitiser is regex-based.** Not airtight in isolation, but layered
  behind magic-byte sniffing, an admin-only upload path, a strict CSP with
  `object-src 'none'`, and delivery from `res.cloudinary.com` — a different
  origin, so an SVG loaded via `<img>` cannot execute script against this site.
  Replacing it needs a DOM-parser dependency, which the brief rules out.

---

## 4 · Database (Neon)

| Check | Finding |
| --- | --- |
| Connection strategy | ✅ Pooled `-pooler` endpoint for the app, direct for the CLI — correct and correctly separated in `prisma.config.ts` |
| Migration status | ✅ 10/10 applied, no drift |
| Migration strategy | ✅ `prisma migrate deploy`. **No `db push` anywhere** in scripts or docs |
| Pool sizing | ✅ Bounded via `DB_POOL_MAX` (default 10), idle and connect timeouts set |
| Statement timeouts | ✅ Set **on the database** by migration `20260730170000_session_timeouts`, not in the connection string — correct, because a pooled Neon endpoint rejects the whole connection (`08P01`) if `options=-c statement_timeout` is sent |
| Indexes | ✅ GIN on `searchVector`, GIN trigram on `title`, composites on `(status, publishedAt desc)` and `(categoryId, status, publishedAt desc)` — these match the actual query shapes |
| N+1 | ✅ None found. List queries use a narrow `select`; bodies are never loaded for a listing |
| Client lifecycle | ✅ One client per process, guarded against hot-reload duplication |
| Date handling | ✅ `unstable_cache` stores JSON, so every cached read is passed through a revive step — this is what fixes the "Invalid time value" class of bug that only appears after the cache warms |

**One structural caution, not a defect:** `getLatestPosts` and friends evaluate
`new Date()` *inside* the cached function, so "now" is frozen into the entry.
The code handles this correctly by bounding those entries with
`revalidate: 300` in addition to tags — without it a scheduled post would appear
only when someone happened to save something unrelated. Do not remove those
`revalidate` values thinking tags are sufficient.

**Unused table:** `blog_images` (`BlogImage`) has no read or write path — only a
type re-export in `models.ts`. **Left in place** per the brief. It is empty and
costs nothing.

---

## 5 · The `TRUSTED_PROXY` problem

This is the single most important operational finding.

`clientIp()` returns `null` when no trusted proxy is declared, and the rate
limiter then puts every such request in one shared `anonymous` bucket. That is
**correct, deliberate, fail-closed design** — an unidentifiable flood is
throttled as one caller rather than waved through as many.

It also means that with `TRUSTED_PROXY` unset in production:

| Limit | Intended | Actual with one shared bucket |
| --- | --- | --- |
| Login: 10 / 15 min | per visitor | **for the whole internet** — any visitor can lock you out of `/admin` for 15 minutes with ten bad passwords, repeatedly |
| `/api/track`: 60 / min | per visitor | **site-wide** — conversions silently dropped above that, and the ad accounts learn from a truncated sample |

I verified the shared-bucket behaviour directly (the 16-attempt test in § 3
used 16 *different* claimed IPs and still hit the limit at 10).

**Correct production value: `TRUSTED_PROXY="cloudflare"`** — but only once the
origin refuses non-Cloudflare traffic. `CF-Connecting-IP` cannot be forged
*through* Cloudflare and is trivially forged by anyone who reaches the VPS
directly, which puts you straight back to unlimited password guessing.

`.env.example` and `DEPLOYMENT.md` were rewritten in this audit to state both
halves. Previously they led with Vercel guidance, which is how this got missed.

---

## 6 · Caching and delivery

### What the origin sends

| Route | `Cache-Control` | Assessment |
| --- | --- | --- |
| `/` | `s-maxage=300, stale-while-revalidate=31535700` | ✅ ISR, tag-invalidated |
| `/about`, `/contact` | `s-maxage=3600, swr` | ✅ |
| `/terms`, `/privacy-policy` | `s-maxage=86400, swr` | ✅ |
| `/blog/<article>` | `s-maxage=300, swr` | ✅ |
| `/sitemap.xml`, `/robots.txt` | `public, max-age=0, must-revalidate` | ✅ always fresh |
| `/feed.xml` | `public, s-maxage=3600, swr=86400` | ✅ |
| `/blog` | `private, no-cache, no-store` | ⚠️ see below |
| `/admin/*`, `/api/*` | `private, no-store` + `CDN-Cache-Control` + `X-Robots-Tag` | ✅ **fixed in this audit** |

### Why `/blog` is DYNAMIC — the brief's question, answered

Because it reads `searchParams` (`?q=`, `?kategori=`, `?page=`). In Next 15 that
opts the route into dynamic rendering, and Next then emits
`private, no-cache, no-store`. Cloudflare will report `cf-cache-status: DYNAMIC`
for it, correctly.

Measured cost: **2.58 s cold, 147–183 ms warm** (local Windows box → Neon
Singapore), against **3–7 ms** for every cached route. `/blog` is the only route
that touches the database on every request.

**Left as-is deliberately.** Making it static would break search and category
filtering — the feature is the reason for the dynamism. The mitigations that
matter are already present: the parameter layer refuses out-of-range pages
without querying, and the queries are backed by matching composite indexes.

### Cloudflare

Cloudflare's default is not to cache `text/html`, which is safe and is what this
app is built for. **`cf-cache-status: DYNAMIC` on your pages is not a fault.**

The one real hazard: a "Cache Everything" rule added later to speed things up.
Before this audit `/admin/login` was served with `s-maxage=31536000` — a year, in
the directive shared caches obey — because it is a statically prerendered route.
Now it sends `private, no-store` and `CDN-Cache-Control: private, no-store`.
**If you ever enable "Cache Everything", exclude `/admin/*` and `/api/*` and do
not set it to override origin headers.**

### Payloads

```
homepage    348 KB → 35 KB gzip
/blog        98 KB → 24 KB gzip
article     144 KB → 28 KB gzip
shared JS   102 KB first-load
```

Reasonable. Cloudflare will apply Brotli on top. Fonts are self-hosted woff2
with `display: swap` — no third-party request on first paint.

---

## 7 · Deployment

### The hazard, reproduced

The brief asked whether the deployment process prevents building while
`next start` is running. **It does not prevent it, and I hit it during this
audit — accidentally, which is exactly how it will happen to you.**

What I observed:

1. Edited source, ran `npm run build` with the server still running.
2. Build reported **success**.
3. The running site continued serving the **old** sitemap and **old**
   `twitter:image`. The rebuilt files were on disk. The process served the
   previous version anyway.

I then isolated the cause instead of assuming it: with the server **stopped**,
the same incremental build picked up a changed constant (1200 → 1100)
immediately. So the culprit is the running process holding `.next`, not
incremental compilation.

`DEPLOYMENT.md` § 4b independently documents a worse variant of this — a
stylesheet hash that no longer exists, producing **completely unstyled pages**
for up to an hour. My reproduction confirms that section is accurate.

### The safe sequence

```bash
ssh you@vps && cd /path/to/flazz-group
git pull
npm ci
pm2 stop flazz-group          # ← STOP FIRST. Not optional.
npm run build
npm run db:migrate
pm2 start flazz-group
curl -sI http://127.0.0.1:3000/ | head -1     # HTTP/1.1 200 OK
```

If a deploy ever looks half-applied: `pm2 stop` → `rm -rf .next` → `npm run build`
→ `pm2 start`. Full walkthrough with verification steps in
[TUTOR.md § C](./TUTOR.md#c--vps-deployment).

### Single instance is required

Both the rate limiter and `revalidateTag` are per-process:

- an admin save purges the cache **only in the instance that served it**; others
  keep serving stale HTML until their own window expires;
- the login limit is multiplied by the instance count.

Use `pm2 start npm --name flazz-group -- start`. **Not** cluster mode, **not**
`-i max`. This is a correctness requirement, not a performance preference.

---

## 8 · Accessibility and HTML validity

Across 7 rendered pages:

| Check | Result |
| --- | --- |
| `<html lang>` | ✅ `id` on every page |
| Exactly one `<h1>` | ✅ 7/7 |
| Heading-level jumps | ✅ **none** |
| Images missing `alt` | ✅ **0 of 91** |
| `<div>` directly inside `<table>` | ✅ **none** |
| Empty links | ✅ 0 |
| Unlabelled inputs | ✅ 0 |
| External links | ✅ all `rel="noopener noreferrer"` |
| Skip link | ⚠️ homepage only → **fixed**, now on all pages |

**The `<div>` cannot be a child of `<table>` issue named in the brief is
genuinely resolved.** `ResourceScreen.tsx` places `DndContext` *outside* the
`<table>` and keeps `SortableContext` inside — which is valid, because
`SortableContext` is a context provider that renders no DOM. The table primitives
are properly semantic (`thead`/`tbody`/`tr`/`th`/`td`), with the scroll wrapper
`<div>` outside the table rather than inside it. This was fixed properly rather
than suppressed.

---

## 9 · What you must verify on the VPS

I could not reach the server or the live domain. These three take a minute and
close out the remaining risk.

```bash
# 1 — trusted proxy is declared
grep TRUSTED_PROXY /path/to/flazz-group/.env
# expect: TRUSTED_PROXY="cloudflare"

# 2 — origin refuses non-Cloudflare traffic (run from ANOTHER machine)
curl -sI --max-time 5 http://<your-vps-ip>/
# expect: hang or connection refused. An HTTP response means the origin is exposed.

# 3 — exactly one process
pm2 status
# expect: one instance of flazz-group, not cluster mode
```

Then confirm the fixes are live after deploying:

```bash
curl -s https://www.flazzgroup.com/sitemap.xml | grep -o 'f_auto,q_auto,w_1200' | head -1
curl -s https://www.flazzgroup.com/ | grep -o '<meta name="twitter:image"[^>]*>'
curl -sI https://www.flazzgroup.com/admin/login | grep -i cache-control
curl -sI https://www.flazzgroup.com/ | grep -i 'cf-cache-status\|cf-ray'
```

---

## 10 · Changes made in this audit

**Code — 6 files**

| File | Change |
| --- | --- |
| `src/app/sitemap.ts` | Image sitemap emits `f_auto,q_auto,w_1200,c_limit` delivery URLs |
| `src/components/blog/ArticleSchema.tsx` | Delivery URLs for article/logo images; author `@id` no longer 404s; SVG avatar omitted |
| `src/components/common/StructuredData.tsx` | Delivery URLs for `Organization.logo` and `Product.image`, vector-safe |
| `src/app/layout.tsx` | Social cards go through `resolveSocialImage()` |
| `src/app/(site)/page.tsx` | Homepage declares its own complete card so `og` == `twitter` |
| `src/app/(site)/blog/page.tsx` | Unique meta description per category archive, matched in JSON-LD |
| `src/app/(site)/layout.tsx` | Skip link on every public page |
| `next.config.ts` | `/admin/*` and `/api/*` → `private, no-store` + `noindex` |

**Documentation — 4 files**

| File | Change |
| --- | --- |
| `TUTOR.md` | **New.** Operator manual for VPS + Cloudflare + Neon + Cloudinary |
| `.env.example` | `TRUSTED_PROXY` rewritten VPS-first, with the origin-firewall condition |
| `DEPLOYMENT.md` | VPS-first framing; rollback, monitoring and troubleshooting de-Vercel'd |
| `FINAL-SEO-AUDIT.md` | **New.** SEO findings and evidence |

**Nothing was deleted.** No migrations touched, no production media removed, no
content altered, no schema changes, no new dependencies, no canonical-domain
change.

### Older audit documents

`AUDIT.md`, `BUG-HUNT.md`, `DATABASE-AUDIT.md`, `RELEASE-AUDIT.md`,
`PRODUCTION-HARDENING.md`, `SEO-AUDIT.md`, `INTERNAL-LINKING-AUDIT.md` and
`STRUCTURED-DATA-AUDIT.md` contain **Railway-era** references that no longer
describe the deployment. They remain accurate as *records of what was fixed and
why*, which is why they were not deleted.

**Read them as history, not as instructions.** For anything operational, this
document, `FINAL-SEO-AUDIT.md` and `TUTOR.md` supersede them.

---

## Regression summary

Everything below was re-run **after** all fixes were applied:

```
tsc --noEmit                 exit 0
eslint .                     exit 0
next build                   Compiled successfully, 48/48 pages
prisma migrate status        10/10 applied, up to date

sitemap URLs                 12/12 → 200, self-canonical, index/follow, one H1
hostile URLs                 45 requests, 0 × 5xx
structured data              8 pages valid JSON, 22 @ids, 0 conflicts
JSON-LD injection            6/6 payloads escaped and round-tripped
internal links               0 orphans, 0 broken, depth ≤ 2
image sitemap                5/5 → 200, 10.53 MB → 0.90 MB, WebP negotiated
og:image / twitter:image     7/7 → 200, identical per page, 157–225 KB
Cloudinary pipeline          24/24 assertions
rate limiting                26 requests across 6 headers — no bypass
authorization                7 endpoints → 401 without session
accessibility                7 pages, 0 violations, skip link on all
```

---

*Audited against a production build with the real Neon database and the real
Cloudinary account. Every claim in this document corresponds to a command that
was run. Where verification required the VPS or the live domain — Cloudflare
edge behaviour, Core Web Vitals, the production environment file, the process
count — the report says so rather than guessing, and § 9 tells you how to close
those gaps yourself.*
