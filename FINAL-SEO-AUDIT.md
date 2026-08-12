# FINAL SEO AUDIT — FLAZZ GROUP

**Date:** 12 August 2026
**Architecture audited:** VPS → Cloudflare → Next.js 15.5.21 → Neon PostgreSQL / Cloudinary
**Canonical domain:** `https://www.flazzgroup.com` (unchanged, and correctly `www`)

---

## What was actually tested, and what was not

This matters more than the scores, so it goes first.

### Tested for real

Every result below came from a **production build** (`npm run build` → `npm start`)
running against the **real Neon database** and the **real Cloudinary account** —
not development mode, not mocks.

| Area | Method | Volume |
| --- | --- | --- |
| Build integrity | `tsc --noEmit`, `eslint`, `next build` | 3 clean runs |
| Migrations | `prisma migrate status` against Neon | 10/10 applied |
| Crawlability | Fetched `/robots.txt`, `/sitemap.xml`, `/feed.xml` | parsed |
| Sitemap consistency | Fetched all 12 sitemap URLs, parsed canonical/robots/H1/title/description | 12 URLs |
| Hostile URLs | Malformed pagination, NUL bytes, XSS payloads, traversal, unknown slugs | 45 URLs |
| Structured data | Extracted and `JSON.parse`-d every JSON-LD block, cross-checked `@id` consistency | 8 pages, 22 `@id`s |
| JSON-LD injection | 6 breakout payloads through the serialiser, verified escape + round-trip | 6 payloads |
| Internal linking | Full BFS crawl from `/`, built the link graph | 12 pages |
| Image delivery | Fetched every sitemap image and `og:image`, measured bytes and format negotiation | 12 URLs |
| Cloudinary pipeline | `npm run media:check` — upload, SEO filename, collision, transform, delete | 24 assertions |
| Rate limiting | 26 login attempts rotating `X-Forwarded-For`, `CF-Connecting-IP`, `X-Vercel-Forwarded-For`, `True-Client-IP`, `X-Real-IP`, `Forwarded` | 26 requests |
| Authorization | Every admin API without a session | 7 endpoints |
| Origin guard | `/api/track` with no / evil / matching / spoofed-host Origin | 4 requests |
| Accessibility | Parsed rendered HTML for H1 count, heading order, alt, table nesting, labels, skip links | 7 pages |
| Cache headers | Inspected `Cache-Control` on every public and admin route | 8 routes |
| Response time | 3 runs per route, cold and warm | 6 routes |

### NOT tested — do not read the scores as covering these

- **The live site through Cloudflare.** I had no access to `https://www.flazzgroup.com`
  or to the VPS. Everything about `cf-cache-status`, real TTFB, Brotli, HTTP/3
  and TLS is **inference from configuration**, not measurement. Verify with the
  commands in [TUTOR.md § D](./TUTOR.md#d--cloudflare).
- **Lighthouse / Core Web Vitals.** No browser was available. **No LCP, INP or
  CLS number appears in this report**, because I did not measure any. The
  Performance score below is based on payload sizes, cache headers and response
  times I *did* measure, and is explicitly not a Lighthouse score.
- **Real viewport rendering** at 320/390/768/1024/1440/1920 px. Responsive
  classes were read in source; nothing was rendered visually.
- **The production `.env`.** I saw the local one. `TRUSTED_PROXY` was unset
  locally; whether it is set on the VPS is the single most important thing for
  you to check ([P1-2](#p1)).
- **Whether the VPS runs one process or several.** This changes two conclusions
  materially — see [P1-3](#p1).

### One local artifact, so you do not chase it

`/blog/TOP-UP-ROYAL-DREAM-MURAH-...` (uppercase) returned **200** on the first
request on this Windows machine. That is NTFS being case-insensitive: Next found
the prerendered `top-up-....html` file under a name that differs only in case.
On the Linux VPS the filesystem is case-sensitive, the file will not be found,
the request falls through to a dynamic render, and Postgres's `=` on `slug` is
case-sensitive — so it 404s. Route segments are already case-sensitive here
(`/BLOG` → 404, verified). **Confirm once on the VPS**, but this is not a
production duplicate-content bug.

---

## Executive verdict

# READY WITH FIXES

The codebase is in unusually good technical shape. Across 45 hostile URLs there
were **zero 5xx responses**; every one of the 12 indexable URLs returns 200,
self-canonicalises, says `index, follow`, and carries exactly one `<h1>`; there
are **zero orphan pages and zero broken internal links**; the JSON-LD escaper
survived every breakout payload; and the `X-Forwarded-For` rate-limit bypass
from earlier audits is genuinely closed — I attacked it through six different
forwarding headers and could not mint a second bucket.

Seven real defects were found and **six were fixed and re-verified in this
audit**. The seventh is a configuration value on a VPS I cannot reach, and it is
the one thing standing between "READY WITH FIXES" and "READY".

**Before you call this done, do the two things in [What you must do](#what-you-must-do-i-could-not).**

---

## Scores

| Dimension | Score | Basis |
| --- | ---: | --- |
| **Overall SEO** | **91** / 100 | Weighted across the rows below |
| Technical SEO | 94 / 100 | Clean build, correct canonicals, no soft 404s, hostile URLs handled |
| Content / On-page | 82 / 100 | Structure is excellent; only 4 articles, and one title overruns SERP width |
| Internal linking | 96 / 100 | Zero orphans, depth ≤ 2, 5–6 inbound links per article, varied anchors |
| Structured data | 95 / 100 | Valid, non-conflicting, well-referenced; FAQPage is ineligible but harmless |
| Image SEO | 92 / 100 | Was 62 before this audit — see [FIX-1](#fixed) |
| Crawlability | 97 / 100 | Sitemap ↔ canonical ↔ robots ↔ links fully consistent |
| Indexability | 96 / 100 | No accidental noindex; correct noindex on search; no crawl traps |
| Performance | 80 / 100 | Payloads and cache headers are good; `/blog` is uncacheable by design; **not Lighthouse-measured** |
| Security ∩ SEO | 88 / 100 | Strong, but `TRUSTED_PROXY` unset makes the limiter a lockout vector |

Performance is capped at 80 deliberately: I did not measure Core Web Vitals, and
scoring what I did not measure would be exactly the kind of thing this audit was
asked not to do.

---

## Findings

### P0

**None.** Nothing found would take the site down or deindex it.

### P1

<a name="p1"></a>

**P1-1 · Image sitemap and structured data advertised 2 MB originals that appear nowhere on the page — FIXED**

`sitemap.ts`, `ArticleSchema.tsx` and `StructuredData.tsx` all emitted the raw
Cloudinary URL (`/upload/v123/photo.png`). Two consequences, measured:

- A bare delivery URL carries no `f_auto`, so Cloudinary returned the full PNG
  regardless of `Accept`. I verified this: requesting with
  `Accept: image/avif,image/webp` still returned `image/png`. Five sitemap
  images totalled **10.53 MB**.
- Worse for indexing: `next/image` renders `f_auto,q_auto,w_…,c_limit` variants
  into every `srcset`, so **the URL the sitemap nominated appeared nowhere in
  the rendered HTML**. Google was being asked to associate an image with a page
  that does not reference it.

**Fixed** by routing all three through `cloudinaryUrl(url, { width: 1200 })` —
1200 is one of the `deviceSizes` in `next.config.ts`, so the emitted URL is
byte-identical to one already in the page's `srcset`.

**Verified:** all 5 entries now `f_auto,q_auto,w_1200,c_limit`; total **10.53 MB
→ 0.90 MB**, and **0.66 MB** when WebP is negotiated (which it now is —
confirmed `content-type: image/webp`).

---

**P1-2 · `TRUSTED_PROXY` unset makes the rate limiter an admin-lockout vector — DOCUMENTED, needs your action**

With `TRUSTED_PROXY` unset (as it is in the local `.env`), `clientIp()` returns
`null` for every request and every caller shares one `anonymous` bucket. That is
deliberately fail-closed and is safe in the security sense. It is operationally
broken:

- Login allows **10 attempts / 15 min per bucket**. One bucket for everyone means
  **any visitor can lock you out of `/admin` with ten bad passwords**, repeatedly.
- `/api/track` allows **60 events / min**, site-wide. Above that, conversions are
  silently dropped and your ad accounts learn from a truncated sample.

I proved the shared bucket empirically: 16 login attempts with 16 different
`X-Forwarded-For` values produced `401 ×10` then `429 ×6`.

**This is a config value on a machine I cannot reach.** `.env.example` and
`DEPLOYMENT.md` have been rewritten to state the correct value and — critically
— the condition that makes it true. See [what you must do](#what-you-must-do-i-could-not).

---

**P1-3 · Multi-instance deployment would break cache invalidation and rate limiting — UNVERIFIABLE from here**

Both the rate limiter and Next's `revalidateTag` are per-process. Under PM2
cluster mode or multiple containers:

- an admin save purges the cache **only in the instance that handled it**; the
  others serve stale HTML until their own window expires (5 min / 1 h);
- the login limit is multiplied by the instance count.

`DEPLOYMENT.md` § 4b already warns about this and the code says so too. I cannot
check `pm2 status` from here. **Run it.** If it shows more than one instance,
that is a real P1 and the fix is to run one.

### P2

**P2-1 · Homepage social card was the 2.1 MB original, and `og:image` ≠ `twitter:image` — FIXED**

`layout.tsx` used `settings.ogImageUrl` raw for both cards instead of the
`resolveSocialImage()` helper every other route uses. Measured on the homepage:
`twitter:image` was **2,172 KB**; the same card on `/about` was 164 KB.

There was a second, subtler half. Next's file-based `app/opengraph-image.tsx`
**outranks** `openGraph.images` set in metadata, but nothing competes with
`twitter:image`. So the homepage advertised **two different pictures**: a
generated 1200×630 card to Facebook/WhatsApp, and the 2 MB brand PNG to X.
WhatsApp — this store's main sharing channel — silently drops thumbnails that
large.

**Fixed** in `layout.tsx` (use the helper) and `(site)/page.tsx` (declare the
homepage's own complete card so both tags agree).
**Verified:** `og:image` and `twitter:image` are now the identical
`f_jpg,q_auto,w_1200,c_limit` URL at **164 KB**.

---

**P2-2 · `/admin/*` was served with `Cache-Control: s-maxage=31536000` — FIXED**

`/admin/login` is statically prerendered, so Next labelled it cacheable by
shared caches **for a year**. Harmless while Cloudflare keeps its default of not
caching `text/html` — and not harmless the moment anyone adds a "Cache
Everything" rule to make the site faster.

**Fixed** in `next.config.ts`: `/admin/:path*` and `/api/:path*` now send
`Cache-Control: private, no-store, max-age=0, must-revalidate`,
`CDN-Cache-Control: private, no-store`, and `X-Robots-Tag: noindex, nofollow`.
**Verified** on both paths.

---

**P2-3 · Skip link existed on the homepage only — FIXED**

All 12 public pages render `<main id="main">`, but only `/` had the
`href="#main"` bypass link. The other eleven — including every article — gave
keyboard users no way past a navbar full of links (WCAG 2.4.1).

**Fixed** by moving it into `(site)/layout.tsx`, ahead of `children`, and
removing the homepage copy.
**Verified:** exactly one skip link on all 8 sampled pages, zero duplicates.

---

**P2-4 · Category archives without a description shared the blog's meta description — FIXED**

`/blog?kategori=chip-and-koin` and `/blog` shipped **byte-identical**
`<meta name="description">` while both claimed to be canonical and indexable —
the textbook duplicate signal.

**Fixed:** categories with no description now get one naming the category. An
editor-written description still wins.
**Verified:** the two descriptions now differ.

---

**P2-5 · Deploying without stopping the app ships stale output — REPRODUCED, documented**

Not a code bug, but the highest-consequence operational finding, and I hit it
by accident during this audit, which is how it will happen to you.

I edited source, ran `npm run build` with `next start` still alive, and the
build **reported success**. The running site kept serving the **old** sitemap
and the **old** `twitter:image`. The rebuilt files were on disk. The process
served the previous version anyway.

I then isolated the cause rather than guessing: the same incremental build with
**the server stopped** picked the change up immediately (verified by changing a
constant from 1200 → 1100 and watching it appear). So the culprit is the running
process holding `.next`, not incremental compilation.

Documented in [TUTOR.md § C4](./TUTOR.md#c4--why-the-order-matters) and
`DEPLOYMENT.md` § 4b. **Rule: stop → build → migrate → start.**

### P3

- **P3-1 · Author `@id` pointed at a route that does not exist — FIXED.**
  `ArticleSchema` used `/blog/penulis/<slug>#person` as the Person identifier.
  There is no author-archive route; the URL returned **404** (verified). Changed
  to `/about#author-<slug>`, which resolves 200.
- **P3-2 · `Person.image` was an SVG — FIXED.** The default author avatar is
  `/logo.svg`, and Google cannot use a vector for an entity image, so the
  property was always present and never usable. Now omitted when the avatar is a
  vector.
- **P3-3 · One article title is 92 characters.** `Cara Top Up Royal Dream 2026:
  Panduan Lengkap Sampai Chip Masuk Hitungan Detik | FLAZZ GROUP` will be
  truncated in results, which costs CTR. **Not changed — this is your content**,
  editable in `/admin`. Suggested: *"Cara Top Up Royal Dream 2026: Panduan
  Lengkap"* (46 chars).
- **P3-4 · `FAQPage` on the homepage is valid but ineligible for rich results.**
  Google restricted FAQ rich results to government and health sites in 2023.
  Harmless, describes real on-page content, **left in place**.
- **P3-5 · `blog_images` table is unused.** Only a type re-export in
  `models.ts` references it; no read or write path exists. **Deliberately not
  removed** — the brief forbids it without proof, and an empty unused table
  costs nothing.
- **P3-6 · All in-article outbound links get `rel="nofollow"`.** A deliberate
  anti-spam policy in `blog/content.ts`. Mildly suboptimal — linking out to
  authoritative sources is a positive signal — but a defensible choice for a
  commerce site. **Left as-is.**
- **P3-7 · `sslmode=require` will change meaning in `pg` v9.** The driver now
  warns that `require` is treated as `verify-full` today and will adopt weaker
  libpq semantics later. Harmless now; pin `sslmode=verify-full` at the next
  dependency bump.

---

## Fixed

Every item was reproduced first, fixed, rebuilt, and re-verified against a
running production server.

| # | Fix | File(s) | Verified by |
| --- | --- | --- | --- |
| 1 | Image sitemap emits delivery URLs, not 2 MB originals | `src/app/sitemap.ts` | 5/5 entries transformed; 10.53 MB → 0.90 MB; WebP negotiated |
| 2 | `BlogPosting.image`, `Organization.logo`, `Person.image` use delivery URLs | `src/components/blog/ArticleSchema.tsx` | JSON-LD re-parsed, URLs transformed |
| 3 | `Product.image` + `Organization.logo` use delivery URLs | `src/components/common/StructuredData.tsx` | build + JSON-LD valid |
| 4 | Root social cards go through `resolveSocialImage()` | `src/app/layout.tsx` | `twitter:image` 2172 KB → 164 KB |
| 5 | Homepage declares its own card so `og` == `twitter` | `src/app/(site)/page.tsx` | both tags identical |
| 6 | Author `@id` no longer 404s; SVG avatar omitted | `src/components/blog/ArticleSchema.tsx` | `@id` → `/about#author-…`, 200 |
| 7 | `/admin/*` + `/api/*` uncacheable, `noindex` | `next.config.ts` | headers confirmed on both |
| 8 | Skip link on every public page | `src/app/(site)/layout.tsx`, `(site)/page.tsx` | 8/8 pages, exactly one each |
| 9 | Unique meta description per category archive | `src/app/(site)/blog/page.tsx` | descriptions differ |
| 10 | `TRUSTED_PROXY` documented for VPS+Cloudflare, Vercel framing removed | `.env.example`, `DEPLOYMENT.md` | — |
| 11 | `DEPLOYMENT.md` rollback/monitoring/troubleshooting de-Vercel'd | `DEPLOYMENT.md` | — |
| 12 | `TUTOR.md` written for this architecture | `TUTOR.md` | — |

**Regression after all fixes:** `tsc` clean · `eslint` clean · `next build`
clean · 12/12 sitemap URLs 200 + self-canonical + `index, follow` + one H1 ·
45 hostile URLs, **0 × 5xx** · JSON-LD valid on 8 pages, **0 `@id` conflicts** ·
0 orphans · 0 broken internal links.

## Intentionally not fixed

| Item | Why |
| --- | --- |
| Article title length (P3-3) | Your content. The brief says not to alter production content unnecessarily; I flagged it with a suggested rewrite instead |
| `FAQPage` markup (P3-4) | Valid, honest, describes real content. Ineligible for rich results ≠ harmful |
| `blog_images` table (P3-5) | Explicitly out of scope per the brief; unused and harmless |
| Blanket `nofollow` on outbound links (P3-6) | A deliberate editorial-safety policy, not a defect |
| Regex-based SVG sanitiser | Not airtight in the abstract, but layered behind magic-byte sniffing, an admin-only upload path, a strict CSP, and cross-origin delivery from Cloudinary. Replacing it needs a DOM parser dependency; the brief says do not add unnecessary dependencies |
| `/blog` being uncacheable | It reads `?q=`, `?kategori=`, `?page=`. Making it static would break search. Correct as-is |
| `/blog?kategori=…` query URLs in the sitemap | They self-canonicalise, are internally linked, and return 200. Converting to path segments is a URL migration with real risk and no measurable gain |
| Canonical domain | `www` preserved, as instructed |
| `unsafe-inline` in CSP | Removing it needs per-request nonces through middleware, which makes every page dynamic — a real architecture change, not a header tweak |

---

## Production verification — actual results

All against a production build on `127.0.0.1:3987`, real Neon, real Cloudinary.

**Build**

```
tsc --noEmit        exit 0, no output
eslint .            exit 0, no output
next build          Compiled successfully, 48/48 static pages
prisma migrate status   10 migrations found — Database schema is up to date!
```

**Crawlability — all 12 sitemap URLs**

```
PATH                                        STATUS  CANONICAL  H1  ROBOTS
/                                           200     self        1  index, follow
/blog                                       200     self        1  index, follow
/about                                      200     self        1  index, follow
/contact                                    200     self        1  index, follow
/privacy-policy                             200     self        1  index, follow
/terms                                      200     self        1  index, follow
/blog?kategori=panduan-top-up               200     self        1  index, follow
/blog?kategori=chip-and-koin                200     self        1  index, follow
/blog/top-up-royal-dream-via-pulsa-…        200     self        1  index, follow
/blog/beli-chip-royal-dream-…               200     self        1  index, follow
/blog/top-up-royal-dream-murah-…            200     self        1  index, follow
/blog/cara-top-up-royal-dream-2026-…        200     self        1  index, follow
```

**Hostile URLs — 45 requests, 0 × 5xx**

```
?page=1                    308 → /blog        (no duplicate page-1 URL)
?page=0 / -1 / abc / NaN   308 → /blog
?page=1e999                308 → /blog        (was skip: Infinity)
?page=999999999999999      308 → /blog        (was skip: 9e21)
?page=999999 / 501         404                (bounded, no DB query)
?page=2 (only 1 page)      404                (no soft 404)
?q=                        308 → /blog
?q=%00                     308 → /blog        (was a Postgres 22021 500)
?q=<script>alert(1)</script>   200, noindex,follow, canonical=/blog
?q=' OR 1=1--              200, noindex,follow  (parameterised, no injection)
?kategori=../../etc/passwd 308 → /blog
?kategori=tidak-ada        404
?utm_source=fb             200, canonical=/blog  (dedupes without breaking attribution)
/blog/                     308 → /blog
/../etc/passwd             404
/admin                     307 → /admin/login
/api/settings              401
```

**Structured data** — 8 pages, all valid JSON, 22 distinct `@id`s, **0 type conflicts**.
Types emitted: `Organization`, `WebSite`, `ItemList`, `FAQPage`, `CollectionPage`,
`BreadcrumbList`, `BlogPosting`, `WebPage`, `Person`, `AboutPage`, `ContactPage`.

**JSON-LD injection** — 6 payloads, all escaped, all round-tripped correctly:

```
</script><script>alert(1)</script>   → </script>…   PASS
</ScRiPt ><img src=x onerror=…>      → escaped                PASS
U+2028 / U+2029                      →              PASS
<!--<script>                         → escaped                PASS
]]></script>                         → escaped                PASS
```

**Internal linking**

```
depth 0: /                                    (11 inbound)
depth 1: /about /blog /contact /privacy-policy /terms + 3 articles
depth 2: /blog?kategori=… ×2, 1 article
orphans: none — every sitemap URL reachable from /
broken internal links: none
articles: 5–6 inbound links each
anchors: descriptive and varied ("panduan top up Royal Dream", "Kembali ke blog", …)
external links: all rel="noopener noreferrer", all target="_blank"
```

**Images**

```
sitemap images   5/5 → 200, f_auto,q_auto,w_1200,c_limit
                 total 0.90 MB (0.66 MB as WebP)   — was 10.53 MB raw PNG
og:image         7/7 → 200, 157–225 KB
twitter:image    7/7 → 200, identical to og:image on every page
alt attributes   0 images missing an alt attribute across 7 pages
```

**Cloudinary** — `npm run media:check`, 24 assertions, all passed: upload lands
in the right folder, SEO filename preserved (no UUID), collisions resolve to
`-2`/`-3` without overwriting, `f_auto`/`q_auto`/`w_…` inject correctly,
transformed URLs serve 200, modern format negotiated, deletes work, error codes
classified correctly. Test assets cleaned up.

**Security**

```
16 logins, rotating X-Forwarded-For     401×10 then 429×6   — bypass CLOSED
6 logins, rotating CF-Connecting-IP     429×6               — no new bucket
X-Vercel-Forwarded-For / True-Client-IP / X-Real-IP / Forwarded   all 429
/api/track  no Origin → 200 · evil Origin → 403 · matching → 200
admin APIs without session: /api/settings /api/blog/posts /api/admins
                            /api/upload /api/brands  → 401
POST /api/blog/posts, DELETE /api/brands/1 without session → 401
open redirect via ?next=  — not exploitable (prefix-checked to /admin)
```

**Accessibility** — 7 pages: `lang="id"`, exactly one `<h1>`, **no heading-level
jumps**, 0 images missing `alt`, no `<div>` directly inside `<table>`
(the dnd-kit `DndContext` correctly wraps the table rather than sitting inside
it), 0 empty links, 0 unlabelled inputs, skip link on every page after the fix.

**Response times** *(local Windows box → Neon Singapore — NOT production)*

```
route                      cold      warm
/                         6.7 ms    4.5 ms     ISR cache, no DB
/about                    4.5 ms    3.6 ms     ISR cache
/blog/<article>           4.8 ms    4.2 ms     ISR cache
/sitemap.xml             12.5 ms    3.8 ms
/blog                  2585 ms    147 ms       dynamic — DB every request
```

HTML: homepage 348 KB → **35 KB gzipped**; article 144 KB → **28 KB**.

The `/blog` outlier is the one route that queries Neon on every request, because
it reads `?q=`/`?kategori=`/`?page=`. The 2.5 s cold figure is Neon connection
establishment from Indonesia; on a VPS near the Singapore region it will be far
lower. Everything else is served from Next's cache without touching the database.

---

## Why Google may still say "Discovered – currently not indexed"

Separated as asked, because conflating these is what leads to fixing things that
are not broken.

### Technical causes — none found

I checked every technical precondition against the live build:

| Precondition | Result |
| --- | --- |
| Returns HTTP 200 | ✅ 12/12 |
| Canonical points at itself | ✅ 12/12 |
| `index, follow` | ✅ 12/12 |
| In the sitemap | ✅ 12/12 |
| Reachable from the homepage | ✅ 0 orphans, depth ≤ 2 |
| Has inbound internal links | ✅ 5–6 per article |
| Unique title + description | ✅ (the one duplicate was fixed in this audit) |
| Valid structured data | ✅ 0 errors, 0 conflicts |
| Not blocked by robots.txt | ✅ |
| No redirect chain | ✅ |
| Server errors under crawl | ✅ 0 × 5xx in 45 hostile requests |

**There is no technical fault causing this, and I am not going to manufacture
one.** The two image fixes in this audit help Google Images, not article
indexing.

### Normal Google behaviour — this is most of it

"Discovered – currently not indexed" means *Google knows the URL exists and has
not prioritised crawling it yet*. It is a scheduling decision, not a rejection.
For a site with **4 articles** and little external authority it is the expected
state. Google throttles crawl budget on new domains until they show a pattern of
being worth re-visiting. Timescale is weeks, not days.

### Content and authority limitations — this is the actual constraint

1. **Four articles is not a topical footprint.** Google has very little evidence
   about what this site is authoritative on.
2. **Two categories, one of which has no description.** Thin taxonomy.
3. **Near-zero external links.** This is the dominant factor. Nothing in this
   repository can substitute for one real mention from an Indonesian gaming
   site, forum or community.
4. **Keyword overlap.** `top-up-royal-dream-murah-7-cara-dapat-harga-termurah`
   and `cara-top-up-royal-dream-2026-panduan-lengkap-…` both target "cara top up
   Royal Dream" intent. Not yet cannibalisation at this size, but it will be if
   the pattern continues.

**Do not** repeatedly request indexing, resubmit the sitemap, or add more
markup. None of those change the outcome.

---

## What you must do (I could not)

1. **Set `TRUSTED_PROXY="cloudflare"` on the VPS and firewall the origin.**
   ```bash
   grep TRUSTED_PROXY /path/to/flazz-group/.env     # expect: cloudflare
   curl -sI --max-time 5 http://<your-vps-ip>/      # must hang or be refused
   ```
   Both must be true. `cloudflare` without the firewall re-opens the
   brute-force bypass; the firewall without `cloudflare` leaves the lockout
   vector. [TUTOR.md § D5](./TUTOR.md#d5--lock-the-origin-to-cloudflare)

2. **Confirm one process, not a cluster.**
   ```bash
   pm2 status          # one instance of flazz-group
   ```
   More than one silently breaks admin cache invalidation. [TUTOR.md § C5](./TUTOR.md#c5--process-manager)

3. **Deploy with the app stopped**, once, using the sequence in
   [TUTOR.md § C1](./TUTOR.md#c1--the-safe-sequence), and confirm the new
   `og:image` is live:
   ```bash
   curl -s https://www.flazzgroup.com/ | grep -o '<meta name="twitter:image"[^>]*>'
   # expect f_jpg,q_auto,w_1200,c_limit — not the bare /upload/v…/ URL
   ```

4. **Resubmit the sitemap** in Search Console after deploying, so the corrected
   image URLs are picked up.

---

## The next 10 SEO actions, in priority order

Ordered by expected impact per unit of effort. Notice that **nothing technical
is in the top five** — that is the point of this audit's outcome.

1. **Publish consistently — 2 articles a week for 8 weeks.** Four articles is
   the binding constraint on everything else. This single habit does more than
   items 5–10 combined.
2. **Build the pillar page.** Make
   `cara-top-up-royal-dream-2026-panduan-lengkap-…` the definitive hub, and link
   every future article up to it and back down. You have clusters forming; give
   them a centre.
3. **Earn 3–5 real external links.** Indonesian gaming forums, Facebook groups,
   a Reddit/Kaskus thread, a partner brand's site linking back. This is the
   dominant factor in "Discovered – not indexed" and the only one you cannot
   engineer around.
4. **Fill the content gaps.** Highest-intent missing topics, based on what the
   existing four cover: *top up Royal Dream via DANA/OVO/GoPay*, *top up Royal
   Dream lewat QRIS*, *cara cek ID Royal Dream*, *Royal Dream chip vs koin —
   apa bedanya*, *cara menghindari penipuan top up*.
5. **Write a real description for `Chip & Koin`** in `/admin` — the generated
   fallback works, but an editor-written one converts better.
6. **Shorten the 92-character title** (P3-3). Pure CTR, one edit.
7. **Verify the Cloudflare cache configuration** with the commands in
   [TUTOR.md § D3](./TUTOR.md#d3--caching--what-should-and-should-not-be-cached).
   `cf-cache-status: DYNAMIC` on HTML is normal; static assets should be `HIT`.
8. **Set up Search Console alerts** and check Performance monthly. Anything at
   position 11–20 is your cheapest win: add internal links to it and extend it.
9. **Add author bios to `/about`** with `id="author-<slug>"` anchors, so the
   Person `@id` this audit repointed there resolves to something real and
   visible. Small entity-SEO gain, and honest.
10. **Once you have ~15 articles, re-check for cannibalisation.** Two pages
    competing for one phrase is the failure mode this content plan risks.

---

*Audited against a production build with real Neon and real Cloudinary. Every
number in this document was measured, not estimated. Where I could not measure —
Cloudflare edge behaviour, Core Web Vitals, the VPS environment — the report
says so instead of guessing.*
