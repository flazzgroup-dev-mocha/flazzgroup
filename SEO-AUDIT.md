# SEO Audit — FLAZZ GROUP

**Date:** 12 August 2026
**Canonical domain:** `https://www.flazzgroup.com` — the `www` form is intentional and was preserved everywhere. No redirect, canonical or setting was changed to the apex.
**Stack audited:** Next.js 15.5.21 (App Router) · React 19 · TypeScript · Prisma 7 · Neon PostgreSQL · Cloudinary · VPS behind Cloudflare.

## How to read this document

Every finding is labelled with where the evidence came from:

| Label | Meaning |
|---|---|
| **CODE** | Read in this repository. |
| **TESTED** | Executed locally against a production build (`next build` + `next start` on :3100), with the real Neon database and real Cloudinary assets. |
| **LIVE** | Observed on `https://www.flazzgroup.com` over HTTP during this audit. |
| **NOT VERIFIED** | Requires production/VPS/dashboard access this audit did not have. Stated as unknown, never guessed. |
| **RECOMMENDATION** | An improvement, not a defect. |

Nothing below is claimed as tested unless it was actually run. Commands executed are listed in **§ Verification log**.

---

## Executive summary

The technical SEO foundation here is genuinely strong, and unusually so in the areas that are hardest to retrofit: URL normalisation, crawl-trap prevention, parameter handling, cache invalidation, and structured data hygiene. The crawl found **zero orphan pages, zero broken internal links, zero soft-404 farms and no canonical conflicts**.

The audit found **one P0 that stopped the application building at all**, two P1 defects in social/discovery metadata, and a set of P2/P3 improvements. All P0 and P1 items are fixed and verified. The remaining open items are mostly infrastructure and content decisions that belong to the operator, not to the codebase.

The single largest *remaining* opportunity is not in the repository: **Cloudflare is not caching HTML** (`cf-cache-status: DYNAMIC`), so every page view reaches the VPS even though Next already marks pages cacheable for 300 s.

| Scorecard | Score | Principal deduction |
|---|---:|---|
| Technical SEO | 92 | HTML not edge-cached; one over-length `<title>` |
| On-page SEO | 86 | One 91-char title, keyword-shaped alt text, 4 empty categories |
| Internal linking | 90 | Small graph (4 articles); category URLs are query parameters |
| Structured data | 90 | Thin duplicate `Organization` on articles; author `@id` resolves to 404 |
| Image SEO | 88 | 2 MB source PNGs; alt text reads as keyword strings |
| Crawlability | 96 | Nothing material — verified clean |
| Indexability | 93 | Four new pages not yet deployed to production |
| Performance | 78 | `cf-cache-status: DYNAMIC`; cold TTFB 4.4 s; heavy originals |
| Accessibility | 85 | Skip-link regression; navbar search has no visible focus ring |
| Security affecting SEO | 94 | `robots.txt` is partly controlled by Cloudflare, not the app |
| **Overall SEO readiness** | **89** | |

**Counts:** P0 = 1 · P1 = 2 · P2 = 8 · P3 = 8
**Fixed in this pass:** 6 · **Intentionally left untouched:** 13

---

# FINDINGS

## P0 — Production blocker

### P0-1 · The production build was broken **[TESTED] — FIXED**

**Problem.** `npm run build` failed. The application could not be compiled or deployed.

**Evidence.**
```
Failed to compile.
./src/components/layout/PageShell.tsx
29:7  Error: Do not use an `<a>` element to navigate to `/`. Use `<Link />` from
      `next/link` instead.  @next/next/no-html-link-for-pages
```

**Cause.** The skip link in `src/components/layout/PageShell.tsx` was changed from `<a href="#main">` to `<a href="/">`. A bare `<a>` pointing at an internal route violates `@next/next/no-html-link-for-pages`, and Next runs ESLint as part of `next build` — so this is not a lint warning, it is a hard build failure.

**Why it matters.** Nothing else in this report matters if the app cannot be built. Every page, every canonical and the sitemap itself become undeployable.

**SEO impact.** Total, on the next deploy — no new content, no fix, nothing ships.
**User impact.** None until the next deploy, then total.
**Risk of the fix.** None.

**Fix applied.** Swapped the raw `<a>` for `next/link`, preserving the destination (`/`) and the label (`Lewati ke halaman utama`) exactly as they were changed.
**File:** `src/components/layout/PageShell.tsx` · **Migration:** no · **Affects production:** yes (unblocks deploy) · **Manual config:** no

> **Related, NOT fixed — see P2-7.** The change also turned a skip link into a "go to homepage" link, which is an accessibility regression. That is a deliberate product decision to confirm, not a bug to silently revert, so it was left in place and is reported separately.

---

## P1 — High priority

### P1-1 · The blog archive shipped no social card at all **[TESTED] — FIXED**

**Problem.** `/blog` and every category archive emitted `og:title` and `og:description` but **no `og:image` and no `twitter:image`**.

**Evidence (before fix).**
```
$ curl -s http://localhost:3100/blog | grep -iE 'og:|twitter:'
<meta property="og:title"       content="Blog — Panduan &amp; Tips Top Up Game | FLAZZ GROUP"/>
<meta property="og:description" content="Panduan top up Royal Dream, tips bermain…"/>
<meta property="og:url"         content="https://www.flazzgroup.com/blog"/>
<meta property="og:type"        content="website"/>
<meta name="twitter:card"       content="summary_large_image"/>
<meta name="twitter:title"      content="Blog — Panduan &amp; Tips Top Up Game"/>
<meta name="twitter:description" content="…"/>
                        ← no og:image, no twitter:image
```

**Cause.** Next merges metadata per top-level field. `openGraph` is one field: a route that declares its own `openGraph` object **replaces** the root layout's wholesale rather than merging into it. Omitting `images` therefore does not inherit the site card — it deletes it. The article page had already solved exactly this problem (its source carries a comment explaining it); the archive was missed.

**Why it matters.** `summary_large_image` with no image degrades to a bare line of text. This store's own code comments identify WhatsApp and Telegram as its primary channels, and `next.config.ts` goes out of its way to add Telegram to `htmlLimitedBots` — a link to the blog previewing as plain text undoes that effort.

**SEO impact.** Indirect but real: social cards drive the click-through and sharing that produce the links and engagement Google reads as popularity signals.
**User impact.** Direct — shared links look broken.
**Risk of the fix.** Low; metadata only.

**Fix applied.** `/blog` and category archives now emit a complete card. The newest post's featured image is used when one exists (it is the picture at the top of the archive), falling back to the site-wide social image, then to the generated 1200×630 route. `siteName` and `locale` were also restored, since declaring `openGraph` had been dropping those too.
**Files:** `src/app/(site)/blog/page.tsx`, `src/lib/seo.ts` (`resolveSocialImage`) · **Migration:** no · **Affects production:** yes · **Manual config:** no

**Verified after fix:**
```
/                              https://www.flazzgroup.com/opengraph-image?…
/blog                          …/f_jpg,q_auto,w_1200,c_limit/…top-up-royal-dream-via-pulsa….png
/blog?kategori=panduan-top-up  …/f_jpg,q_auto,w_1200,c_limit/…top-up-royal-dream-via-pulsa….png
/about /contact /privacy-policy /terms   …/f_jpg,q_auto,w_1200,c_limit/Top-Up-Royal-Dream_jjtelo.png
/blog/<article>                …/f_jpg,q_auto,w_1200,c_limit/…cara-top-up-royal-dream-dengan-qris.png
```
All seven routes now carry both `og:image` and `twitter:image`.

---

### P1-2 · Social cards served the 2 MB original **[TESTED] — FIXED**

**Problem.** `og:image` pointed at the raw Cloudinary original. Measured directly from Cloudinary:

| Asset | Before | After |
|---|---:|---:|
| `cara-top-up-royal-dream-dengan-qris.png` | **1,956 KB** PNG | **157 KB** JPEG |
| `Top-Up-Royal-Dream_jjtelo.png` (site card) | **2,172 KB** PNG | **164 KB** JPEG |

Cloudinary reports the first as `width=1672,height=941,bytes=2002629,format="png"` in its `server-timing` header.

**Why it matters.** WhatsApp silently drops the preview thumbnail on images this large. A ~2 MB card is not a slow preview on the store's main sales channel — it is frequently *no* preview.

**SEO impact.** Indirect (sharing and CTR).
**User impact.** Direct on WhatsApp and Telegram.
**Risk of the fix.** Low. `f_jpg` was chosen deliberately over `f_auto`: a social scraper sends no useful `Accept` header, so format negotiation buys nothing here and several scrapers cannot decode WebP/AVIF. `c_limit` only ever scales down, so smaller originals pass through untouched.

**Fix applied.** Added `socialImageUrl()` and routed every `og:image`/`twitter:image` through one resolver that guarantees three things: never an SVG, never relative, never the untransformed original.
**Files:** `src/lib/media/url.ts` (`socialImageUrl`), `src/lib/seo.ts` (`resolveSocialImage`), `src/app/(site)/blog/[slug]/page.tsx`, `src/app/(site)/blog/page.tsx` · **Migration:** no · **Affects production:** yes · **Manual config:** no

> Changing the `og:image` URL invalidates existing Facebook/WhatsApp scrape caches, which is the desired outcome — the next share fetches the small card.

---

## P2 — Medium priority

### P2-1 · Image sitemap **[TESTED] — IMPLEMENTED (explicitly requested)**

**Status before.** `sitemap.xml` declared only the base namespace. No image data.

**Implementation.** Next 15.5 supports image sitemaps natively — `MetadataRoute.Sitemap` accepts `images?: string[]`, and `next/dist/build/webpack/loaders/metadata/resolve-route-data.js` emits the namespace and elements. **No fragile hand-built XML was introduced**, and no custom route was needed; the existing `app/sitemap.ts` abstraction was used as designed.

**Verified output:**
```xml
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
<url>
<loc>https://www.flazzgroup.com/blog/cara-top-up-royal-dream-2026-…</loc>
<image:image>
<image:loc>https://res.cloudinary.com/yyvfn1f3/image/upload/v1785781325/flazzgroup/blog/cara-top-up-royal-dream-dengan-qris.png</image:loc>
</image:image>
<lastmod>2026-08-03T18:22:10.361Z</lastmod>
…
```

**Validation performed:**
- Parsed with a strict XML parser — well-formed, correct default namespace, correct `xmlns:image`.
- 12 `<url>` entries, **5 images, 5 unique** — no duplicates.
- **Every image URL fetched live: all 5 returned `HTTP 200` from Cloudinary** with `content-type: image/png`.

**Selection rule (deliberately narrow).** One image per URL, and only the image that is *the subject* of that page: an article's featured image, and the site's social card for the homepage. Logos, section artwork, payment badges, brand marks and UI icons are excluded — they illustrate a page, they are not what it is about, and padding an image sitemap with chrome is how the useful entries get ignored. `/about`, `/contact` and the two policy pages have no such image and therefore carry none, which is valid.

Vectors are excluded (`isVector`) because Google Images does not index SVG, and relative paths are excluded because an image sitemap requires absolute URLs.

> **Honest framing, as requested:** this improves *discovery* of images that would otherwise only be found by rendering the page. It is **not** a ranking factor and Google does not document it as one.

**Files:** `src/app/sitemap.ts` · **Migration:** no · **Affects production:** yes · **Manual config:** no

---

### P2-2 · The blog archive had no structured data **[TESTED] — FIXED**

**Problem.** `/blog` and its category views emitted **zero JSON-LD**. The homepage declares `Organization` + `WebSite`; an article declares a full graph; the page that sits between them and links to every article said nothing about itself.

**Fix applied.** Added `ArchiveSchema` emitting exactly three nodes:

- `CollectionPage` — what the page literally is. Using `Blog`/`BlogPosting` here would claim the archive is itself a piece of writing.
- `ItemList` — the articles currently listed, in display order, **`url` only**. Repeating each headline would restate what the article pages already say, and a mismatch between the two is worse than silence.
- `BreadcrumbList` — mirrors the visible breadcrumb.

`Organization` and `WebSite` are referenced by `@id`, never redefined. Nothing is emitted for a search result or an empty archive — both carry `noindex`, and describing a page that asks not to be indexed is noise.

**File:** `src/components/blog/ArchiveSchema.tsx` (new), `src/app/(site)/blog/page.tsx` · **Migration:** no · **Affects production:** yes · **Manual config:** no

---

### P2-3 · Static-page `lastmod` tracked unrelated settings saves **[TESTED] — FIXED**

**Problem.** `/about`, `/contact`, `/privacy-policy` and `/terms` reported `lastModified: settings.updatedAt`. Saving an unrelated analytics ID in the admin panel moved the `lastmod` of the privacy policy. Separately, the two policy pages each carried a hand-typed Indonesian date ("11 Agustus 2026") that nothing checked against the sitemap.

**Why it matters.** `lastmod` is only useful to Google if it is consistently truthful; a site that moves it for unrelated reasons trains Google to ignore it. And two hand-maintained copies of "when did this policy change" will drift.

**Fix applied.** One table, `src/lib/static-pages.ts`, holding path + priority + date. The sitemap reads it for `lastmod`; the policy pages read it for the visible "Terakhir diperbarui" line.

**Verified:** `<lastmod>2026-08-11T00:00:00.000Z</lastmod>` on all four, independent of `settings.updatedAt`.
**Files:** `src/lib/static-pages.ts` (new), `src/app/sitemap.ts`, `src/app/(site)/privacy-policy/page.tsx`, `src/app/(site)/terms/page.tsx` · **Migration:** no

---

### P2-4 · Cloudflare is not caching HTML **[LIVE] — NOT FIXED (infrastructure)**

**Evidence.**
```
$ curl -sI https://www.flazzgroup.com/
Server: cloudflare
cf-cache-status: DYNAMIC          ← Cloudflare is NOT caching this response
x-nextjs-cache: HIT               ← the origin's own ISR cache IS working
Cache-Control: s-maxage=300, stale-while-revalidate=31535700
```
Measured TTFB, homepage: **4.39 s cold**, then **1.01 s / 0.93 s / 0.40 s** on repeat.

**Why it matters.** Next is explicitly telling the CDN this page is shared-cacheable for 300 seconds. Cloudflare is ignoring that and passing every request to the VPS — the default Cloudflare behaviour, which does not cache HTML unless a Cache Rule says to. The VPS renders from its ISR cache (hence the fast warm path), but every visitor still pays a full round trip to the origin.

**SEO impact.** TTFB is an input to LCP, and slow server response measurably suppresses Googlebot's crawl rate — which is directly relevant to the "Discovered – currently not indexed" question in §13.
**User impact.** Every page load slower than it needs to be, worst for users far from the VPS region.

**Recommended fix (Cloudflare dashboard, not code).** Add a **Cache Rule** that caches HTML for the public routes and respects the origin's `Cache-Control`:
- Match: `http.request.uri.path` not starting with `/admin`, `/api`.
- Action: *Eligible for cache*, **Use cache-control header** (so `s-maxage=300` and `stale-while-revalidate` are honoured).
- Do **not** cache any response carrying the admin session cookie.

**NOT VERIFIED — requires production inspection:** whether a Cache Rule already exists but is being bypassed, the VPS region, and the reverse-proxy configuration in front of Node.

**Migration:** no · **Affects production:** yes · **Manual config:** **yes — Cloudflare dashboard**

---

### P2-5 · One article ships a 91-character `<title>` **[TESTED] — NOT FIXED (content)**

**Evidence.** From the database:
```
slug     : cara-top-up-royal-dream-2026-panduan-lengkap-sampai-chip-masuk-hitungan-detik
seoTitle : ""            ← empty, so `title` is used
title    : "Cara Top Up Royal Dream 2026: Panduan Lengkap Sampai Chip Masuk Hitungan Detik"  (78 chars)
```
The root template appends `| FLAZZ GROUP`, producing ≈91 characters. Google truncates display titles at roughly 60.

**Why it matters.** The tail — including "Hitungan Detik" and the brand — is cut in the SERP. The brand disappearing from the visible title is the costlier half.

**Recommended fix (admin panel, no code change).** Set `seoTitle` on this post to something in the 50–60 character range, e.g. **"Cara Top Up Royal Dream 2026: Panduan Lengkap"** (45 chars → 58 with the brand suffix). The `seoTitle` field already exists and already takes precedence — the machinery is correct, the field is simply blank. The other four posts have `seoTitle` set and are within range (43–57 chars).

**Not fixed here because** rewriting published article metadata is a content decision, and the instruction was not to rewrite article content without a clear technical reason. The mechanism works; only this row's value is missing.

**Migration:** no · **Affects production:** yes (content) · **Manual config:** admin panel

---

### P2-6 · Deploy-time cache staleness — two distinct failure modes **[TESTED] — NOT FIXED (deploy process)**

Both were reproduced during this audit. Neither is a code defect; both are deploy-procedure hazards specific to a host with a persistent working directory, i.e. this VPS.

#### (a) Stale **content** baked into prerendered HTML

`unstable_cache` entries persist in `.next/cache` **across builds**. A rebuild reuses them, so a page can be prerendered with data that is no longer in the database.

**Evidence.** A build during this audit emitted the seed placeholder WhatsApp number `wa.me/6280000000000` into `/contact`, `/about` and the footer, while the live database held `wa.me/6285150683554`. `rm -rf .next/cache && npm run build` produced the correct number everywhere. The same staleness masked the P1-1 fix until the cache was cleared.

**Why it matters.** A deploy can ship correct code with stale content and nothing reports it. Contact details, prices and metadata are exactly the values that would be wrong.

#### (b) Stale **assets** — rebuilding while the old process is still running

This one is sharper, and it produces visibly broken pages.

**Reproduced.** With a `next start` process still serving the previous build, running `rm -rf .next && npm run build` let the old process write its own ISR entries into the freshly created cache directory. The result:

```
$ curl -s http://localhost:3100/ | grep -o '/_next/static/css/[a-z0-9]*\.css'
/_next/static/css/2db27519b21f4804.css     ← served
/_next/static/css/55c80c15112e4baf.css

$ ls .next/static/css/
4e8b5fdc203046ed.css  55c80c15112e4baf.css  ← 2db275… does not exist

Browser console:
Refused to apply style from '…/2db27519b21f4804.css' because its MIME type
('text/html') is not a supported stylesheet MIME type.
```

The homepage was served **completely unstyled** — the stylesheet 404s and returns the HTML error page. The build output itself was correct (`.next/server/app/index.html` referenced the right hashes); the stale copy came from `stale-while-revalidate` serving the previous build's cached HTML, which references asset URLs the new build no longer emits.

It self-corrects when the entry revalidates, but on production that window is up to an hour for page routes — an hour of unstyled pages for anyone who hits a stale entry, including Googlebot.

**Verification that this was the cause, not a product defect.** A clean-room rebuild — server stopped, `rm -rf .next`, build with nothing running, then start — produced zero stale references and a fully clean pass at all six viewport widths.

**Recommended fix (deploy script — order matters more than the commands).**
```bash
git pull
npm ci
pm2 stop flazz-group      # or: systemctl stop … — STOP FIRST
rm -rf .next              # (or at minimum: rm -rf .next/cache)
npm run build             # build with nothing serving the old output
pm2 start flazz-group
```
The essential rule: **never rebuild while the previous process is still serving.** Stopping first costs a few seconds of downtime; not stopping risks serving unstyled pages and stale content for a full revalidate window.

If zero-downtime is required, build into a fresh directory and swap a symlink, so the running process never shares a `.next` with a build.

**NOT VERIFIED — requires production inspection:** the actual deploy script on the VPS, and whether it stops the process before building.

**Migration:** no · **Affects production:** yes · **Manual config:** yes — deploy script

---

### P2-7 · The skip link no longer skips **[CODE] — NOT FIXED (intentional change, flagged for decision)**

**Problem.** `PageShell` renders, as the first focusable element on `/about`, `/contact`, `/privacy-policy` and `/terms`:
```tsx
<Link href="/" className="sr-only focus:not-sr-only …">Lewati ke halaman utama</Link>
```
This is styled as a skip link — hidden until keyboard focus — but it navigates to the homepage rather than moving focus past the navigation to `#main`.

**Evidence.** The crawl recorded the inbound anchor `"/about :: Lewati ke halaman utama" → /`. The homepage still uses the correct form (`src/app/(site)/page.tsx:79`, `href="#main"`).

**Why it matters.** WCAG 2.4.1 (Bypass Blocks) is satisfied by a mechanism that skips *repeated content on the current page*. A link that leaves the page does not bypass anything; a keyboard user on `/terms` still has to tab through the whole navigation. The four new pages therefore have no working bypass mechanism, while the homepage does.

**SEO impact.** None directly.
**User impact.** Real for keyboard and screen-reader users.

**Deliberately not changed.** This was an explicit edit, and reverting a product decision unasked is not the auditor's call. Two options, both one line in `src/components/layout/PageShell.tsx`:

- **Restore the skip link** — `href="#main"`, label `Lewati ke konten utama`, matching the homepage. Recommended.
- **Keep the homepage link but stop presenting it as a skip link** — remove the `sr-only focus:not-sr-only` classes so it is a visible link, and add a separate `#main` skip link.

**Migration:** no · **Affects production:** yes (accessibility) · **Manual config:** no

---

### P2-8 · Navbar search has no visible keyboard focus indicator **[TESTED] — NOT FIXED (pre-existing, sitewide)**

**Evidence.** Tab-order probe on `/about`:
```
 1. <a>     'Lewati ke halaman utama'  outline=2px solid rgb(255,213,74)
 2. <a>     'FLAZZ GROUP…'             outline=2px solid rgb(255,213,74)
 3. <input> ''                         outline=2px none              ← no ring
 4. <a>     'Royal Dream'              outline=2px solid rgb(157,176,208)
```
The search input carries `focus:outline-none`, whose specificity (`.focus\:outline-none:focus`) beats the global `:focus-visible { outline: 2px solid gold }` in `globals.css`.

**Mitigating.** It is not invisible — the input also has `focus:border-volt/60` and `focus:bg-white/[.06]`, so there *is* a state change, just a subtle one that may not meet WCAG 2.4.11 non-text contrast.

**Not fixed because** it is pre-existing, sitewide chrome unrelated to this audit's scope, and removing `focus:outline-none` would also show a gold ring on mouse click, changing the navbar's look on every page. That is a design decision.

**Recommended fix.** In `src/components/layout/Navbar.tsx`, replace `focus:outline-none` with `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold` on both search inputs (desktop and mobile).

**Migration:** no · **Affects production:** yes (accessibility) · **Manual config:** no

---

## P3 — Nice to have

### P3-1 · Articles declare a thinner `Organization` than the homepage **[CODE] — RECOMMENDATION**

`ArticleSchema` emits `Organization` with `name`, `url`, `logo`. The homepage's `StructuredData` emits the same `@id` with `description`, `sameAs`, `contactPoint` and `subOrganization` as well.

This is **not a conflict** — same `@id`, and one is a strict subset of the other, which is valid. But an article page is where `publisher` matters most, and it currently presents the weakest version of the publisher entity.

**Recommendation.** Extract one `organizationNode(settings)` helper used by both. Deliberately not done in this pass: it touches working homepage schema for a benefit that is real but modest, and the current state is valid.
**Files if actioned:** `src/components/common/StructuredData.tsx`, `src/components/blog/ArticleSchema.tsx`

### P3-2 · Author `@id` points at a URL that 404s **[TESTED] — RECOMMENDATION**

`ArticleSchema` sets the author's `@id` to `${base}/blog/penulis/${slug}#person`. There is no `/blog/penulis/[slug]` route:
```
404  /blog/penulis/tim-flazz
```
Schema.org `@id` values are identifiers and are **not required to resolve**, so this is not an error — but a non-resolving URL as an entity identifier is a smell, and an author page is the natural place to build the E-E-A-T signal the `Person` node is reaching for.

**Two coherent options:** build the author archive (also gives those articles another internal hub), or change the `@id` to a non-URL-shaped identifier. Do not leave it pointing at a 404 *and* build no page.

### P3-3 · Tags are rendered but not linked; the tag event is dead code **[TESTED] — RECOMMENDATION**

Article tags render as inert `<span>` elements (`src/app/(site)/blog/[slug]/page.tsx:315-322`). No tag archive route exists.

**This is a defensible SEO decision** — tag archives are the classic source of thin, near-duplicate pages — and it is called out here only so it is understood as a choice rather than an oversight.

However `blog_tag_click` is declared in `src/lib/analytics/events.ts` and referenced nowhere:
```
$ grep -rn "blog_tag_click" src/ | grep -v events.ts
(no results)
```
**Recommendation.** Delete the unused event definition, or link the tags. Do not leave a catalogue entry for an event that cannot fire.

### P3-4 · Homepage `lastmod` reflects settings, not homepage content **[CODE] — RECOMMENDATION**

The homepage entry uses `settings.updatedAt`. Homepage content actually comes from eight other tables (banners, products, brands, popular, features, payments, community, FAQ) — a product price change does not move it.

**Deliberately not fixed.** Correcting it means eight `MAX(updatedAt)` aggregates on every sitemap regeneration (every 5 minutes) against Neon, for a signal Google largely discounts. The cost/benefit does not justify it at this size. Revisit if the catalogue starts changing daily.

### P3-5 · Four categories exist with zero published posts **[TESTED] — RECOMMENDATION**

`tips-strategi`, `pembayaran`, `flazz-group`, `top-up-royal-dream` all have `_count.posts = 0`.

**Correctly handled today** — the sitemap filters `_count.posts > 0` and the archive's filter chips do the same, so no empty archive is linked or advertised. **PASS, no change required.** Noted only because `top-up-royal-dream` as a *category* would compete with the homepage's `#royal-dream` commercial section for the same query if it were ever populated. See `INTERNAL-LINKING-AUDIT.md` § cannibalisation.

### P3-6 · Category archives are query-parameter URLs **[TESTED] — RECOMMENDATION**

Categories live at `/blog?kategori=panduan-top-up` rather than `/blog/kategori/panduan-top-up`.

They are handled correctly: self-referencing canonical, indexable, in the sitemap, reachable by crawling. Path-based URLs are modestly stronger (clearer hierarchy, better anchor context). **Not recommended right now** — changing the URL structure of already-indexed pages costs redirects and a re-indexing cycle for a marginal gain. Revisit only if the blog grows enough for category pages to become genuine landing pages, and do it with 301s.

### P3-7 · Next's sitemap serialiser does not XML-escape URLs **[CODE] — RECOMMENDATION (latent)**

`resolve-route-data.js` interpolates raw: `` `<loc>${item.url}</loc>` `` and `` `<image:loc>${image}</image:loc>` ``. A URL containing `&` would produce invalid XML and break the whole sitemap.

**Not reachable today** — the only parameter URLs emitted are `?kategori=<slug>` with a single parameter, and slugs are constrained to `[a-z0-9-]+`. Cloudinary URLs contain no ampersands. **No action needed**, but if a second query parameter is ever added to a sitemap URL, escape it.

### P3-8 · Alt text reads as keyword strings **[TESTED] — RECOMMENDATION**

```
"royal dream panduan lengkap pemula 2026"
"beli chip royal dream aman flazz group"
"Top Up Royal Dream Murah"
```
Every image has alt text — which is the part that matters, and it passes. But these describe the *target query* rather than the *picture*. Alt text is read aloud to screen-reader users; "beli chip royal dream aman flazz group" is not a description of an image.

**Recommendation (admin panel, no code change).** Describe what is actually shown, e.g. "Layar konfirmasi pembelian chip Royal Dream di aplikasi FLAZZ GROUP". Better for accessibility and no worse for image search. Not changed here — editing published content was out of scope.

---

# SECTION-BY-SECTION RESULTS

## §1 Global SEO foundation

| Item | Result |
|---|---|
| `<html lang="id">` | **PASS** — `src/app/layout.tsx:153` |
| charset / viewport | **PASS** — `<meta charSet="utf-8">`, `width=device-width, initial-scale=1` |
| Title generation | **PASS** — root template `%s \| FLAZZ GROUP`; static pages correctly bypass it via `title.absolute`. One over-length value → P2-5 |
| Meta descriptions | **PASS** — unique on all 8 tested routes, 130–156 chars |
| Canonical | **PASS** — self-referencing on every route, all on `www`. Verified programmatically |
| `metadataBase` | **PASS** — derived from `settings.siteUrl`, wrapped in `try/catch` so a malformed value cannot break rendering |
| robots directives | **PASS** — `index, follow` on all public pages; `noindex` on 404 and search |
| Open Graph / Twitter | **FIXED** — P1-1, P1-2 |
| Favicon | **PASS** — from settings, Cloudinary-hosted |
| Web app manifest | **absent** — RECOMMENDATION only; no SEO impact |
| `hreflang` | **Not applicable** — single-language (id-ID) site. Correctly omitted |
| Pagination | **PASS** — `rel="prev"`/`rel="next"`, page 1 is `/blog` not `/blog?page=1` |
| Trailing slash | **PASS** — `/about/` → 308 → `/about` |
| apex → www | **PASS [LIVE]** — `https://flazzgroup.com/` → 301 → `https://www.flazzgroup.com/` |
| http → https | **PASS [LIVE]** — 301 |
| Redirect chains | **PASS** — single hop in every case tested |
| Soft 404s | **PASS** — out-of-range pages return real 404s |
| Accidental noindex | **PASS** — none found. The root layout's DB-failure fallback deliberately emits *no* robots directive rather than `noindex`, which is the correct choice |

**Metadata resilience — PASS, worth calling out.** `generateMetadata` in the root layout catches database failures and returns a fallback that carries **no `robots` key**. An earlier version used `index: false`. That was a latent catastrophe: metadata is baked into cached HTML, so one transient Neon blip during ISR regeneration would have frozen `noindex` into a page for a full revalidate window — or, during a build, into every page until the next deploy. This is correctly handled.

## §2 robots.txt

**[LIVE] — the production `robots.txt` is not the one the application generates.**

Cloudflare's *Managed robots.txt* prepends its own block, so the served file contains **two `User-agent: *` groups**:

```
# BEGIN Cloudflare Managed content
User-agent: *
Content-Signal: search=yes,ai-train=no,use=reference
Allow: /
User-agent: Amazonbot      Disallow: /
User-agent: Applebot-Extended  Disallow: /
User-agent: Bytespider     Disallow: /
User-agent: CCBot          Disallow: /
User-agent: ClaudeBot      Disallow: /
User-agent: Google-Extended Disallow: /
User-agent: GPTBot         Disallow: /
User-agent: meta-externalagent Disallow: /
# END Cloudflare Managed Content

User-Agent: *              ← the application's own group
Allow: /
Disallow: /admin
Disallow: /api
Host: https://www.flazzgroup.com
Sitemap: https://www.flazzgroup.com/sitemap.xml
```

**Net effect on Google Search: correct.** Per RFC 9309 and Google's own parser, groups with the same user-agent are merged, so Googlebot reads `Allow: /` + `Disallow: /admin` + `Disallow: /api`. Verified against the checklist:

- Admin blocked — **PASS** · API blocked — **PASS** · Blog and static pages not blocked — **PASS**
- Rendering assets (`/_next/*`) not blocked — **PASS**
- Cloudinary not blocked — **PASS** (different host; `res.cloudinary.com/robots.txt` is Cloudinary's own and permits crawling)
- Sitemap URL on the canonical `www` domain — **PASS**
- `Content-Signal: search=yes` — permits search indexing — **PASS**

**Two things the operator should consciously own** (neither is a bug):

1. **`Google-Extended: Disallow: /`** blocks Gemini/Vertex AI grounding. It does **not** affect Google Search indexing, ranking, or AI Overviews (which use the Search index). Safe for SEO.
2. **`GPTBot`, `ClaudeBot`, `CCBot`, `Bytespider`, `meta-externalagent` blocked** removes the site from ChatGPT/Perplexity-style answer engines. Zero Google Search impact, but a real visibility decision as those surfaces grow.

**P2 (robots poisoning surface).** `robots.txt` is no longer solely under application control — a Cloudflare setting change alters it without a deploy and without a code review. **NOT VERIFIED:** whether Managed robots.txt was intentionally enabled. Recommendation: confirm it in the Cloudflare dashboard and monitor the served file, not just `src/app/robots.ts`.

## §3 sitemap.xml

**[TESTED]** — 12 URLs, all verified.

| Check | Result |
|---|---|
| Valid XML / namespace | **PASS** — parsed with a strict parser |
| Canonical `www`, HTTPS only | **PASS** — 12/12 |
| No localhost / staging / admin | **PASS** |
| No drafts | **PASS — verified by state change.** A post moved to `DRAFT` during this audit; after rebuild it left the sitemap and `/blog/royal-dream-apa-itu-…` returned **404**. Publish/unpublish → sitemap is correct end-to-end |
| No duplicates | **PASS** — 12 unique |
| No noindex / redirected / broken URLs | **PASS** — every URL fetched, all 200 |
| No parameter crawl junk | **PASS** — only `?kategori=`, which are real indexable archives |
| All public pages present | **PASS** — homepage, `/blog`, 4 static pages, 2 categories, 4 articles |
| `lastmod` meaningful | **PASS** after P2-3; homepage caveat in P3-4 |
| Image sitemap | **IMPLEMENTED** — P2-1 |

**[LIVE] production sitemap currently has 8 URLs** and is missing the four static pages — they have not been deployed yet (`https://www.flazzgroup.com/about` → **404 [LIVE]**). Expected, not a defect. They will appear on the next deploy.

## §4 Structured data

Full type-by-route map, rationale for every type, and the fabrication audit are in **`STRUCTURED-DATA-AUDIT.md`**.

Automated validation across 8 routes — **PASS, 0 problems**: valid JSON, one `@graph` per page, no duplicate `@id` within a page, no `aggregateRating`/`review`/`ratingValue` anywhere, every URL on `www` or Cloudinary, all required properties present.

## §5 Blog SEO

Per-article verification against the database and rendered HTML:

| Check | Result |
|---|---|
| Unique SEO title | **PASS** (4/4 published) — one is over-length, P2-5 |
| Unique meta description | **PASS** — 130–156 chars, no duplicates |
| Canonical / index,follow | **PASS** — author-set `canonicalUrl` honoured; all currently empty |
| Exactly one H1 | **PASS** |
| Heading hierarchy | **PASS** — no skipped levels |
| `BlogPosting` + author + publisher + dates + image | **PASS** |
| Featured image + alt + dimensions | **PASS** — all 4 have images and alt; alt quality → P3-8 |
| Internal links in/out | **PASS** — see linking report |
| Breadcrumb (visible + schema) | **PASS** |
| Slugs | **PASS** — descriptive, keyword-relevant, no dates-as-noise |
| Related articles / prev-next | **PASS** — related tops up from the wider archive so the strip is never half-empty |
| Orphans | **PASS — none** |
| Thin content | 4 articles at 7–12 minutes reading time. Not thin |
| Near-duplicate titles | **PASS** — distinct intents (cara / murah / via pulsa / beli chip) |
| Cannibalisation | Two overlap risks, analysed in the linking report |

## §6 Internal linking — see `INTERNAL-LINKING-AUDIT.md`

Headline result **[TESTED]**: crawled from `/`, **12 pages reachable, 0 orphans, 0 pages with fewer than 3 unique inbound links, maximum crawl depth 2**. Every sitemap URL is reachable by following links from the homepage. Every article links to the commercial `/#royal-dream` section three times.

## §7 Information architecture — see `INTERNAL-LINKING-AUDIT.md`

## §8 Image SEO

| Check | Result |
|---|---|
| Alt attributes | **PASS** — present on all content images; decorative images correctly `alt="" aria-hidden` |
| Alt quality | P3-8 |
| **Cloudinary public IDs SEO-friendly** | **PASS — explicitly verified.** Real production IDs: `flazzgroup/blog/cara-top-up-royal-dream-dengan-qris.png`, `flazzgroup/blog/top-up-royal-dream-via-pulsa-semua-operator-flazz.png`. **No UUIDs.** `src/lib/media/cloudinary.ts` slugifies the original filename (`slugify(withoutExtension).slice(0, 80)`) and passes an explicit `public_id` with `use_filename: false`, `unique_filename: false`, `overwrite: false` — so names are meaningful *and* a collision throws instead of silently overwriting. The requirement in §8 of the brief is already satisfied; **no change required** |
| Folder structure | **PASS** — `flazzgroup/blog/`, `flazzgroup/logo/` |
| Secure URLs | **PASS** — `secure: true`, all `https://` |
| Format negotiation | **PASS** — `f_auto,q_auto` via `image-loader.ts`; browsers get WebP/AVIF |
| Responsive `srcset` | **PASS** — `deviceSizes`/`imageSizes` configured, `c_limit` never upscales |
| width/height / CLS | **PASS** — `next/image` with explicit dimensions; hero aspect ratio resolved server-side from stored `MediaAsset` dimensions before first paint |
| Priority / lazy loading | **PASS** — `priority` on the first three cards, lazy elsewhere |
| Broken images | **PASS** — none at any of 6 viewport widths |
| Image sitemap | **IMPLEMENTED** — P2-1 |
| Source weight | 2 MB PNG originals. Page delivery is optimised; social was not until P1-2 |

## §9 Core Web Vitals / performance

**[LIVE] measured:** cold TTFB 4.39 s; warm 0.40–1.01 s. Response `Content-Encoding: zstd`. `alt-svc: h3=":443"` advertised.

> **Correction to a naive reading:** `curl` reported `HTTP/1.1`, but the installed libcurl has no `--http2` support, so protocol negotiation **could not be tested from this machine**. Cloudflare serves HTTP/2 and HTTP/3 to modern browsers by default and the `alt-svc` header confirms h3 is offered. **NOT VERIFIED, presumed fine** — do not treat the `HTTP/1.1` in a curl trace as a defect.

| Item | Result |
|---|---|
| Compression | **PASS [LIVE]** — zstd |
| HTTP/3 offered | **PASS [LIVE]** — `alt-svc: h3=":443"` |
| CDN HTML caching | **FAIL** — P2-4 |
| Font loading | **PASS** — self-hosted woff2, `display: swap`, no third-party request on first paint |
| First Load JS | **PASS** — 167 kB (`/about`), 166 kB (`/blog`), 179 kB (article). Reasonable for React 19 + framer-motion |
| Server/client boundaries | **PASS** — sections are server components; `TrackedLink` exists specifically so a click handler does not force a whole section client-side |
| Hydration cost | **PASS** — hero `select` is explicit to keep deprecated columns out of the RSC payload |
| Third-party scripts | **PASS** — none load before consent; strategies chosen per tag (`afterInteractive` for GTM/Pixel, `lazyOnload` for Clarity) |
| Database round trips | **PASS** — every read is `unstable_cache`d with tags; homepage fetches in one parallel batch |
| Neon connection handling | **PASS** — bounded pool (`DB_POOL_MAX`, default 10), idle and connect timeouts, `application_name`, singleton per process. `statement_timeout` is deliberately set on the database rather than in the startup packet, because a pooled Neon endpoint rejects the whole connection otherwise |
| ISR assumptions | **PASS** — no Vercel-specific behaviour assumed; `revalidate` + tags work on any Node host, with the multi-instance caveat below |

**NOT VERIFIED — requires production inspection:** VPS region relative to the Neon region (a cross-region hop would explain much of the TTFB); whether Node runs multi-instance under PM2/cluster. **If it does, `revalidateTag` only purges the instance that served the admin write** — the others keep serving stale HTML until their own revalidate window expires. This is the single most important thing to check about this deployment.

## §10 Crawlability — **[TESTED], and the strongest area of the site**

```
--- parameter normalisation (all 308 → clean URL)
/blog?page=1                      → /blog
/blog?page=0                      → /blog
/blog?page=abc                    → /blog
/blog?q=                          → /blog
/blog?kategori=                   → /blog
/blog?kategori=TIDAK-ADA          → /blog
/blog?kategori=<script>           → /blog
/blog?page=1&kategori=panduan-top-up → /blog?kategori=panduan-top-up
/blog?page=1e999                  → /blog
/blog?page=999999999999999999999  → /blog
/blog?q=%00                       → /blog

--- crawl-trap bounds
/blog?page=2 /99 /501 /100000     → 404   (no infinite URL space)

--- search pages
/blog?q=royal                     → 200, robots = noindex, follow

--- must not be indexable
/admin, /admin/settings           → 307 → /admin/login
/api/settings, /api/blog/posts    → 401
/blog/<draft-slug>                → 404
/blog/, /about/                   → 308 → non-slash
/blog/%2e%2e/admin                → 307 → /admin/login   (no traversal)
/tidak-ada                        → 404, robots = noindex

--- UTM handling
/blog?utm_source=google&utm_medium=cpc → 200, canonical = /blog   (self-consolidating)
```

No infinite URL spaces, no soft-404 farms, no parameter traps, no canonical loops, no redirect chains, no indexable admin or API routes. `src/lib/blog/params.ts` is the reason, and it is genuinely well built — it also closes two unauthenticated 500s (`?page=1e999` reaching Prisma's `skip` as `Infinity`; a NUL byte reaching Postgres through `$queryRaw`). Repeated 5xx on a site's main content route suppresses crawl rate for the whole domain, so this is an SEO fix as much as a stability one.

## §11 Security ∩ SEO

| Vector | Result |
|---|---|
| JSON-LD injection | **PASS** — `serializeJsonLd` escapes `<`, `>`, `&`, U+2028/9 as `\u00xx`. `JSON.stringify` alone does *not* escape `<`, so an admin-authored string containing `</script>` would otherwise break out of the block, and the CSP allows inline script. Correctly handled |
| Stored XSS in article body | **PASS** — `sanitizeArticleHtml` on write, not just render |
| SVG sanitisation bypass | **PASS** — and notably so. Type is decided by **byte sniffing** (`src/lib/media/sniff.ts`), not `File.type`. The previous version trusted the client's `Content-Type`, so the same bytes carrying `<script>` were sanitised when labelled `image/svg+xml` and stored untouched when labelled `image/png` — and Cloudinary then re-sniffed and served them as SVG. The SVG check is anchored at the XML root so an HTML file with an inline `<svg>` cannot pass |
| Malicious canonical / metadata injection | **PASS** — canonical is derived from `settings.siteUrl`, never from request input. Host-header poisoning is not possible: nothing reads `Host` to build a URL |
| Sitemap / robots poisoning | **PASS at the app layer** — both generated server-side from settings + database, no request input. Cloudflare caveat in §2 |
| Open redirects | **PASS** — the only redirect taking user input is the admin `?next=` parameter, which is a path from `pathname`, not an arbitrary URL |
| Protocol-relative URLs | **PASS** — none emitted; the crawler checked for `//` hrefs |
| External link handling | **PASS** — every external link carries `target="_blank" rel="noopener noreferrer"` (verified across all pages) |
| Unauthorised CMS changes | **PASS** — middleware gate + per-route `withAdmin` re-check against the database, deliberately layered so refusals are *logged* (the edge runtime cannot reach Prisma, so refusing at the edge would lose the audit trail) |
| Rate limiting | **PASS** — `/api/track` origin-checked and rate-limited; `clientIp` only trusts headers infrastructure wrote, so a caller cannot choose their own bucket or the IP attributed to Meta |
| CSP | **PASS** — `unsafe-eval` is dev-only; `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'` |

**No path was found by which an attacker can manipulate canonical, robots, sitemap, title, description, JSON-LD, OG URLs or public article content.**

## §12 Analytics / Search Console / Ads

| Check | Result |
|---|---|
| Duplicate `page_view` | **PASS by construction** — GA4 direct loads **only when GTM is absent** (`!config.gtmId && config.ga4Id`). Loading both is the most common double-count and it is explicitly guarded. Production has both IDs set (`GTM-TVGM79GB`, `G-MTRSXK0QV3`), so only GTM loads |
| SPA navigation views | **PASS** — `PageViewTracker` skips the first render because the tags already counted it |
| Consent | **PASS** — nothing loads before consent. Not "loads with a denied flag" — the `<Script>` elements are not rendered at all |
| Browser ↔ server dedup | **PASS** — one `event_id` (`crypto.randomUUID`) shared by `fbq(..., {eventID})` and the CAPI relay; Meta dedups on `event_name` + `event_id` |
| Conversion definition | **PASS** — `Lead` reserved for a pre-written opener; a bare social icon tap is `Contact`. Treating every outbound click as a Lead is how an ad account learns to optimise for people who never message |
| Accidental conversion firing | **PASS** — conversions fire on explicit link clicks only |
| CAPI secrets | **PASS** — `META_ACCESS_TOKEN` is server-only and never reaches `AnalyticsConfig` |
| Search Console | **PASS** — `google-site-verification` rendered server-side on every page, ungated by consent (correctly — it identifies the site to a crawler, not the visitor to anyone) |
| UTM handling | **PASS** — see §10 |
| Admin traffic exclusion | **NOT IMPLEMENTED** — RECOMMENDATION: add a GA4 internal-traffic filter for the team's IPs |

**NOT VERIFIED — requires GTM container access.** The site pushes `page_view` as a **custom dataLayer event**. Whether GA4 receives exactly one page view per navigation depends on the container's trigger configuration. If the container also has a GA4 tag on "Initialization – All Pages" *plus* a History Change trigger, SPA navigations will double-count despite the application being correct. **Check this in GTM Preview mode before trusting the numbers.**

## §13 Google indexing readiness — "Discovered – currently not indexed"

The brief asked specifically whether there is a *technical* reason. Working through the five candidate causes:

**1. Technical indexing blocker — RULED OUT.** Every published article: 200, `index, follow`, self-canonical, in the sitemap, server-rendered HTML (content present with JavaScript disabled), valid `BlogPosting`, not blocked by robots.txt, no `X-Robots-Tag` header anywhere.

**2. Internal-link weakness — RULED OUT.** Zero orphans; every article has 5–6 unique inbound pages at crawl depth 1–2.

**3. Duplicate/canonical issue — RULED OUT.** No duplicate canonicals, no cross-canonicals, no near-duplicate titles.

**4. Crawl prioritisation — LIKELY CONTRIBUTOR, and partly actionable.** Cold TTFB of 4.39 s with `cf-cache-status: DYNAMIC` (P2-4) is exactly the profile that makes Googlebot reduce crawl rate. Fixing CDN caching is the highest-value technical lever available for this symptom.

**5. Site/content age and authority — MOST LIKELY PRIMARY CAUSE.** The newest article was published 10 August 2026, days before this audit. "Discovered – currently not indexed" on a site with **four published articles** and a young domain is the ordinary state of a new site, not a defect. Google has crawled and queued it; it has not yet decided the content earns index space.

**Honest conclusion.** There is **no technical blocker**. Do not go looking for one. The two levers that will actually move this are (a) fixing CDN caching so crawl budget goes further, and (b) publishing more genuinely useful content and earning external links. That is a content and authority problem, which is precisely the position the brief said it wanted the site to reach.

## §14 Database / CMS SEO integrity

| Check | Result |
|---|---|
| Duplicate slugs | **PASS** — unique constraint; 5 posts, 5 distinct slugs |
| Missing SEO fields | One empty `seoTitle` → P2-5. Falls back to `title`, never to nothing |
| Null featured images | **PASS** — all 4 published posts have one |
| Stale Cloudinary references | **PASS** — all referenced assets return 200 |
| Status transitions | **PASS — verified live.** `DRAFT` with a non-null `publishedAt` is correctly excluded everywhere (`status = PUBLISHED AND publishedAt <= now()` in one shared `publishedWhere()`) |
| Scheduled posts | **PASS** — cached blog reads carry `revalidate: 300` *as well as* tags, because `new Date()` is evaluated inside the cached function and would otherwise freeze "now" into the entry; a Friday-scheduled post would appear whenever someone next saved something unrelated |
| Cache invalidation | **PASS** — `revalidateBlog()` drops `blog` + `blog-taxonomy`; taxonomy cascades to `blog` so a category rename propagates to every cached article |
| Sitemap / RSS invalidation | **PASS** — both read tagged cache entries, so the route inherits the tag and is purged on publish |
| Publish → unpublish end-to-end | **PASS — verified by real state change during this audit** |
| Date handling across the cache | **PASS** — `unstable_cache` serialises to JSON, so `Date` returns as a string on every hit after the first; every cached read is revived through `toDate`/`reviveCard`. Without this, `.toISOString()` throws *only after the cache warms*, which looks intermittent |
| Timezone | **PASS** — `SITE_TIME_ZONE` used for display formatting; ISO-8601 UTC in schema and sitemap |

## §15 Cloudinary

**PASS — no change required, and nothing was deleted or modified.** Covered in §8: SEO-friendly public IDs verified against production data, safe replacement semantics (`overwrite: false` throws rather than clobbering), byte-sniffed type validation, `f_auto,q_auto` delivery, secure URLs, sensible folders. Sitemap image URLs are the canonical stored `secureUrl` values — stable, public, permanent, not signed or expiring, all verified 200.

## §16 Static pages

| | /about | /contact | /privacy-policy | /terms |
|---|---|---|---|---|
| HTTP | 200 | 200 | 200 | 200 |
| Title | exact as specified | exact | exact | exact |
| Canonical (self, www) | ✓ | ✓ | ✓ | ✓ |
| `index, follow` | ✓ | ✓ | ✓ | ✓ |
| Exactly one H1 | ✓ | ✓ | ✓ | ✓ |
| Schema type | `AboutPage` | `ContactPage` | `WebPage` | `WebPage` |
| `BreadcrumbList` | ✓ | ✓ | ✓ | ✓ |
| In sitemap | ✓ | ✓ | ✓ | ✓ |
| og:image | ✓ (fixed) | ✓ | ✓ | ✓ |
| Nav + footer links | ✓ | ✓ | ✓ | ✓ |

**Legal pages are correctly typed as `WebPage`, not `Article`** — they are not editorial content and are not presented as such. **PASS.**

## §17 Accessibility

| Check | Result |
|---|---|
| Semantic HTML / landmarks | **PASS** — `<header>`, `<nav aria-label>`, `<main id="main">`, `<footer>`, `<article>`, `<section aria-labelledby>` |
| Heading hierarchy | **PASS** — exactly one H1 per page, no skipped levels, verified programmatically on all 8 routes |
| Alt text | **PASS** (quality → P3-8); decorative images `aria-hidden` |
| Link and button names | **PASS** — 0 links without an accessible name across all pages |
| Descriptive anchors | **PASS** — no "click here"; article links use full titles |
| Keyboard navigation | **PASS** — full tab order verified |
| Visible focus | **PASS except the navbar search** → P2-8 |
| Skip link | **REGRESSION** → P2-7 |
| Mobile menu | **PASS** — `aria-expanded`, `aria-controls`, Escape closes, focus visible, contains the new links |
| Interactive elements | **PASS** — no `div` used as a button or link |
| Contrast | **PASS** — `--color-fog` was previously lifted from `#6d80a3` to `#8296b8` because the old value fell to 3.9:1 on glass |
| Reduced motion | **PASS** — `prefers-reduced-motion` respected globally and inside `Reveal` |
| Horizontal overflow | **PASS** — none at 320/390/768/1024/1440/1920 px |

## §18 Regression audit

| Class | Result |
|---|---|
| Build integrity | **P0-1 — found and fixed** |
| Hydration errors | **PASS** — none at any of 6 widths. `useConsent` starts at `"unknown"` on both server and client specifically to keep hydration matching |
| Server/client boundary violations | **PASS** — `tsc` and `next build` clean |
| Stale cache bugs | **P2-6 — found** |
| Timezone bugs | **PASS** |
| Cloudinary upload/display | **PASS** |
| Broken links / dead fragments | **PASS** — 0 across all pages; every `href="#id"` has a matching target |
| External link security | **PASS** |
| JSON-LD escaping | **PASS** |
| Duplicate analytics conversions | **PASS** in app code; GTM container NOT VERIFIED |
| Scheduled-post caching | **PASS** |
| Admin RBAC / SUPER_ADMIN vs ADMIN | **PASS** by inspection — layered gate, refusals logged server-side. Not exercised with real credentials in this audit |
| Console errors in production build | **PASS** — the only network event observed was `net::ERR_ABORTED` on a `?_rsc=` router **prefetch**, which is a cancelled speculative request, not a failed resource. Probed directly: `/blog?_rsc=… → HTTP 200` |

---

# Verification log

Everything claimed as **TESTED** came from these commands.

```bash
# Static analysis
npx tsc --noEmit                                    # clean
npx eslint                                          # clean
rm -rf .next && npm run build                       # ✓ compiled, 48/48 static pages
PORT=3100 npm start                                 # production server

# Live production probes
curl -sI  https://www.flazzgroup.com/
curl -s -o /dev/null -w '%{http_code} %{redirect_url}' https://flazzgroup.com/
curl -s   https://www.flazzgroup.com/robots.txt
curl -s   https://www.flazzgroup.com/sitemap.xml

# Local production build
crawl.mjs        # 40 routes: status, redirects, params, traps, canonical, X-Robots-Tag
final.mjs        # 6 pages: h1 count, canonical, robots, JSON-LD parse, every
                 #   internal link, every fragment target, every <img>, sitemap, robots.txt
schema.mjs       # 8 pages: JSON-LD validity, duplicate @id, required props,
                 #   banned properties, off-domain URLs
linkgraph.mjs    # BFS crawl from "/": inbound/outbound/depth, orphan detection,
                 #   sitemap-vs-crawl reachability
imgcheck.mjs     # every <image:loc> fetched from Cloudinary
ogsize.mjs       # og:image byte size before/after
responsive.py    # Playwright: 7 pages × 6 widths — overflow, console errors,
                 #   failed requests, broken images
a11y.py          # tab order, focus rings, TOC anchor targets, mobile menu
```

Database state read directly from production Neon via `prisma.blogPost.findMany` / `websiteSettings.findUnique` (read-only; **nothing was written, deleted or migrated**).

---

# FINAL VERDICT

## READY WITH REQUIRED FIXES

The required fixes are **already applied and verified**. Read this as: the codebase is ready to deploy *now*, and it was not ready an hour ago — the build was broken.

### 1. Critical blockers
- **P0-1 — production build failed.** **FIXED.** Nothing could deploy until this was resolved.

### 2. High-priority fixes
- **P1-1** — blog archive shipped no social card. **FIXED.**
- **P1-2** — social cards served 2 MB originals. **FIXED** (92% smaller).

### 3. Medium-priority
**Fixed:** image sitemap (P2-1), archive structured data (P2-2), static-page `lastmod` (P2-3).
**Open, needs the operator:**
- **P2-4 — Cloudflare not caching HTML.** Highest-value remaining item. Cloudflare dashboard.
- **P2-5 — one 91-char title.** Admin panel, 30 seconds.
- **P2-6 — clear `.next/cache` on deploy.** One line in the deploy script.
- **P2-7 — skip-link regression.** Your decision; two options given.
- **P2-8 — navbar search focus ring.** Design decision.

### 4. SEO opportunities
Publish more genuinely useful content on the "top up Royal Dream" cluster; fill or retire the four empty categories; consider an author archive (P3-2) which would also serve E-E-A-T.

### 5. Internal linking opportunities
See `INTERNAL-LINKING-AUDIT.md`. The graph is already healthy — the recommendations are about *depth* for future growth, not about repairing anything.

### 6. Structured data improvements
Consolidate the `Organization` node (P3-1); resolve the author `@id` (P3-2). Both optional; the graph is valid and coherent today.

### 7. Image SEO improvements
Rewrite alt text to describe images rather than target queries (P3-8). Consider uploading web-sized originals rather than 2 MB PNGs.

### 8. Performance improvements
CDN caching (P2-4) dominates everything else. Then verify VPS↔Neon region proximity.

### 9. Production infrastructure concerns — **NOT VERIFIED, requires VPS/dashboard inspection**
- **Multi-instance `revalidateTag`.** If Node runs under PM2 cluster or multiple containers, an admin save only purges one instance. **Check this first.**
- Cloudflare Cache Rules and Managed robots.txt settings.
- VPS region vs Neon region.
- Deploy script: does it clear `.next/cache`?
- HTTP/2/3 negotiation (advertised, not measurable from this machine).

### 10. What does NOT need to be changed — **PASS, no change required**
- The `www` canonical domain, and every place it is derived from `settings.siteUrl`. Untouched, as instructed.
- URL normalisation and parameter handling (`src/lib/blog/params.ts`) — exemplary.
- Cloudinary integration, including SEO-friendly public IDs — the §8 requirement was already met.
- Prisma/Neon connection handling and pool sizing.
- Consent gating and the analytics double-count guards.
- Security posture: CSP, JSON-LD escaping, SVG byte-sniffing, RBAC layering.
- The metadata database-failure fallback that deliberately emits no `robots` directive.
- Cache-tag invalidation architecture.
- Homepage `Organization`/`WebSite` schema.
- No migration was created, no table changed, no media deleted, no production data written.
