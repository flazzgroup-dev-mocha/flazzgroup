# Production readiness audit — FLAZZ GROUP

Final pre-release review. Every area below was inspected in source and, where a
claim could be tested, verified against a production build served locally and
driven through a real browser.

**Verdict: approved for release, conditional on the four deployment items in
§11 being completed first.** Twelve defects were found and fixed. Nine remain
documented, none of them release-blocking.

**Production readiness score: 88 / 100.**

The 12 points are: unbounded orphan growth in Cloudinary (−4), a rate limiter
that does not survive a multi-instance deploy (−4), the settings PUT
replace-semantics footgun (−2), and a navbar search control that does not
search (−2). None of these break the site; all of them are things you will meet
later rather than at launch.

---

## 1. Executive summary

The codebase is in unusually good shape for a first release. Boundaries between
server and client components are correct, every write path is validated by a
shared schema, migrations are hand-checked and Neon-aware, the database's own
guards (`statement_timeout`, `idle_in_transaction_session_timeout`, the settings
singleton CHECK) are in place, and the analytics stack is consent-gated to the
letter — a declining visitor causes **zero** requests to any tracker.

What the audit found were not architectural problems. They were a small number
of quiet, expensive ones: things that fail silently, cost money, or produce
wrong numbers that nothing in any dashboard flags as wrong. The two most
serious — the Google Ads double-count and the JSON-LD escape — are both in that
category.

### Verification performed

| Check | Result |
| --- | --- |
| `tsc --noEmit` | clean |
| `next lint` | clean |
| `next build` | exit 0 |
| Public pages, 9 viewports (320 → 1920) | no horizontal overflow, no hydration errors |
| All 14 admin pages, authenticated | 200, single `<h1>`, no console errors |
| Consent gate | 0 tracker requests before consent, 0 after declining, 0 dataLayer pushes |
| Conversion de-duplication | exactly 1 Google Ads conversion per interaction |
| Auth boundary | anonymous API → 401, cross-origin write → rejected, admin page → 307 |
| JSON-LD | all blocks parse; `</script>` in content no longer escapes the tag |
| Live database | timeouts applied, every FK indexed, **0 orphaned media rows** |

Test settings written during the conversion check were restored to their
original values, and that restoration was itself asserted.

---

## 2. Critical issues — fixed before launch

### C1 · Google Ads counted every chat conversion twice

`SupportChatWidget` fired both `support_chat_action` and the matching
`contact_*` for one click. Both are in `GOOGLE_ADS_CONVERSIONS`, and there is
exactly one conversion action configured behind them, so Google Ads received
two `conversion` events with different `transaction_id`s and counted them
separately.

Nothing in the Ads interface reports this. The campaign simply optimises against
a number roughly twice the truth and overpays for every conversion — which
matters immediately, because paid traffic starts at launch.

**Fixed.** `track()` takes a third argument, `{ adsConversion: false }`, passed
on the companion call. GA4 and Meta still receive both events; they distinguish
by name, so the pair is information there rather than duplication.
*Verified: 1 conversion per click, down from 2. Direct contact buttons still
count 1.*

### C2 · `</script>` in admin content broke out of the JSON-LD block

Both schema components serialised with bare `JSON.stringify` under a comment
claiming it "escapes the content". It does not — it escapes for JavaScript, and
leaves `<` untouched. Any admin-editable field rendered into structured data
(FAQ answer, site description, product description, article title) containing
the literal text `</script>` would terminate the tag, and the remainder would be
parsed as markup. `script-src` allows `'unsafe-inline'`, so injected script
executes.

Only an authenticated admin can write those fields, which makes this
privilege escalation rather than an open door — but it is stored XSS on the
public site, reachable from a CMS field, and the fix is one replace.

**Fixed.** New `components/common/JsonLd.tsx` escapes `<`, `>`, `&`, U+2028 and
U+2029 to their `\uXXXX` forms. *Verified: payload containing
`</script><script>alert(...)</script>` emits no raw tag and still round-trips
through `JSON.parse`.*

---

## 3. High priority — fixed

### H1 · Scheduled posts never appeared on the homepage

`publishedWhere()` evaluates `new Date()` **inside** `unstable_cache`, so "now"
was frozen at the cache fill. `fetchLatestPosts` had no `revalidate` and `/` was
fully static with tag-only invalidation, so a post scheduled for Friday appeared
whenever somebody next happened to save an unrelated article — a publishing
feature that silently did not work.

**Fixed.** `revalidate: 300` on the fetcher and `export const revalidate = 300`
on the homepage. `revalidateTag` still purges immediately, so admin edits
continue to appear on the very next request. This also unfreezes the footer
copyright year, which was pinned to build time. *Verified: build table now
reports `Revalidate 5m` for `/`.*

### H2 · Every article shipped a social card no platform would render

Seeded articles use SVG featured images. Facebook, X, WhatsApp and Telegram all
refuse `image/svg+xml` for link previews, so shared article links showed no
image — on the channel this store actually sells through.

The obvious fix made it worse: dropping the tag revealed that Next does **not**
inherit the file-convention `opengraph-image` once a route declares its own
`openGraph` object, so articles ended up with no card at all. Caught because the
served HTML was inspected rather than assumed.

**Fixed.** Explicit fallback chain — featured image if raster, then
`settings.ogImageUrl`, then the generated 1200×630 card, named explicitly.
*Verified in served HTML; the fallback route returns 200.*

### H3 · The RSS feed was undiscoverable

`/feed.xml` existed and was correct, but no page linked to it, so no reader,
aggregator or crawler could find it without being told the URL.

Declaring it once in the root layout did not work either: Next merges metadata
per top-level field, and `alternates` is one field, so any page setting
`alternates: { canonical }` replaces it wholesale — which is every content page.

**Fixed.** `lib/seo.ts` exports `RSS_ALTERNATE`, spread alongside `canonical` on
`/`, `/blog` and `/blog/[slug]`. *Verified present on all three.*

### H4 · Hero banner links had no accessible name

`imageAlt` is optional in the CMS. When empty, the slide's link contained only
an `<img>` with an empty `alt` and had `aria-label={undefined}` — a link with no
accessible name at all, and the largest click target on the page. WCAG 2.4.4 and
4.1.2.

**Fixed.** Falls back to `Slide promo {n}`. Deliberately generic: it says where
the link goes without inventing a description of artwork nobody has described.
*Verified: an automated sweep of every `<a href>` on the homepage now finds zero
unnamed links.*

### H5 · Dates were formatted in the server's timezone

Four `Intl.DateTimeFormat` instances had no `timeZone`. Two consequences, both
real: a post published at 20:00 UTC is 03:00 the next day in Jakarta, so
Indonesian readers were told articles were a day older than they are; and in the
two client components (`PostTable`, `BannerManager`) the server and hydrated
renders disagreed about the day, an intermittent hydration mismatch affecting
only rows created in that seven-hour window.

**Fixed.** `SITE_TIME_ZONE = "Asia/Jakarta"` in `lib/utils.ts`, applied to all
four. *Verified: no hydration errors across 9 viewports and all 14 admin pages.*

### H6 · Two high-intent conversions were untracked

The FAQ "Tanya admin" button and the article CTA "Tanya admin" both open
Telegram and neither reported anything. These are the highest-intent clicks on
their pages — somebody who has read the whole FAQ and still has a question. The
blog looked like traffic that never contacts anyone.

**Fixed.** Both are `TrackedLink` now, firing `contact_telegram` with
`location: "faq"` and `location: "article_cta"`.

---

## 4. Medium priority — fixed

| # | Issue | Fix |
| --- | --- | --- |
| M1 | `'unsafe-eval'` shipped in the production CSP. Only `next dev` needs it; a production bundle never evals. It hands anyone who finds an injection point the ability to turn data into code. | Scoped to development. *Verified absent from the production header.* |
| M2 | The article CTA's glow was absolutely positioned inside an `.glass` element that sets no `position`, so it resolved against `<main>` and rendered as a stray gold blur at the top of every article instead of behind the card. | Added `relative`. *Verified geometrically in the browser.* |
| M3 | `GET /api/settings` used `upsert` — a write, a row lock and a dirtied page on every admin settings page load, for a row that always exists. The same fix was already applied to the public `getSettings()`; this was the copy left behind. | Read first, create only if genuinely absent. |

---

## 5. Medium priority — documented, not fixed

### D1 · Article body images are never reclaimed (highest of these)

`releaseImage` handles the *columns* that hold images. Images inserted into an
article body through the rich text editor are recorded nowhere and released
never, so Cloudinary storage grows monotonically with editing activity.

The `BlogImage` model and the `blog_images` table exist for exactly this and are
**completely unreferenced** by application code — zero reads, zero writes, 0
rows. A comment in `lib/media/index.ts` also refers to a `findOrphanedAssets`
function that does not exist.

Not fixed deliberately. Doing it correctly means diffing `<img src>` sets across
a save and extending `isStillReferenced` to search `content` — otherwise an
image used in two articles is destroyed when one is edited. That is an
irreversible deletion path, and a release audit is the wrong moment to add one
untested. It is the first thing to build after launch.

Today there are **0 orphans**, so nothing is lost by waiting.

### D2 · The rate limiter does not survive a multi-instance deploy

`lib/rate-limit.ts` holds counters in process memory. On Vercel every lambda
instance has its own, so the login limiter's "10 attempts per 15 minutes"
becomes 10 *per concurrently-warm instance* — the ceiling rises with traffic,
which is exactly backwards. The file says so honestly in its own header, but the
deployment target makes it matter more than that note implies.

Move the counter to Redis (Upstash) or a Postgres table before or shortly after
launch. Call sites do not change — only that file.

### D3 · `PUT /api/settings` is replace-not-merge

The handler passes the parsed body straight to `update`. The admin form always
posts every field, so this is invisible today — but any partial PUT blanks every
optional field it omits, including all analytics IDs and every social URL. Worth
a merge or an explicit `PATCH` before anything else talks to this endpoint.

### D4 · The navbar search box does not search

`onSearch` discards the query (`void query;`) and scrolls to the products
section regardless of what was typed. It carries `role="search"`, a
`type="search"` input and the placeholder "Cari game…", so it announces itself
as a search landmark to assistive technology and to sighted users alike, and
then does not search. Either wire it to product filtering or change it to a
button — this is a product decision, not a code fix.

### D5 · Two catalogue events are defined but never fired

`blog_tag_click` and `cta_click` are typed, documented and have no call site.
Article tags render as inert chips rather than links, and `listPosts` already
supports `tagSlug` filtering that nothing in the UI can reach. Docs now say so
explicitly; wiring tag archives is a small feature, not a fix.

### D6 · `export const revalidate = 3600` on `/blog` is dead

The route reads `searchParams`, which makes it dynamic — confirmed by the build
table marking it `ƒ`. Harmless, but misleading to the next reader.

---

## 6. Low priority

- **`jose` pulls JWE into the Edge bundle.** `src/lib/session.ts` imports from
  the package root, dragging in `CompressionStream`/`DecompressionStream` and
  producing two Edge-runtime build warnings. The code path is never executed
  (only JWS is used) so it is warning noise plus middleware weight — 38.3 kB.
  `jose` v6 removed deep subpath imports, so there is no clean fix; leave it.
- **`STORAGE_DRIVER` in `.env` is read by nothing.** Left over from the
  pre-Cloudinary driver. Remove it.
- **`ArticleSchema` uses `@id` values under `/blog/penulis/{slug}`**, a route
  that does not exist. Valid as a schema.org node identifier, confusing as a URL.
- **`robots.txt` emits `Host:`** — a Yandex-only directive, ignored elsewhere.
- **Sitemap `changefreq`/`priority`** are ignored by Google. Harmless.
- **Unused Neon Auth tables** (`user`, `session`, `account`, `organization`, …)
  exist in the database from an enabled-but-unused Neon integration. They are not
  in `schema.prisma` and migrations do not touch them, but they are visible to
  anyone reading the database. Disable the integration or leave a note.

---

## 7. Performance

Homepage first-load JS is **211 kB** — good for a page carrying Swiper, Framer
Motion and the full section set. Nothing here needs work before launch.

Already right: self-hosted woff2 with `display: swap` (no third-party request on
first paint), `optimizePackageImports` for lucide/framer/dnd-kit, Cloudinary
`f_auto,q_auto` with per-breakpoint `w_*,c_limit`, hero aspect ratio reserved
from stored dimensions so there is no CLS before the first byte of artwork,
art-directed mobile crops via `<source>` rather than CSS-hidden duplicates,
`priority` on the LCP slide only, `lazyOnload` for Clarity, and rAF-throttled
scroll handlers in both `ReadingProgress` and `ArticleEngagement`.

Worth considering later, in order:

1. **`priority` on the navbar logo** adds a high-priority preload for a 40 px
   image on every page, competing with the hero for early bandwidth. Drop it.
2. **`mobileSrcSet` emits three identical candidates** for non-Cloudinary URLs
   (`cloudinaryUrl` passes them through unchanged), so the `w` descriptors lie.
   Harmless while all banners are Cloudinary-hosted.
3. **`ParticleField` animates 12 elements with `box-shadow`**, which is not
   compositor-friendly. Measure on a low-end Android before deciding.

---

## 8. SEO

Verified correct in served output: canonicals (self-referencing per page,
never inherited from the root — deliberately), OpenGraph and Twitter cards,
`article:published_time`/`modified_time`/`section`/`tag`, JSON-LD for
Organization, WebSite, ItemList, FAQPage, Article, BreadcrumbList and Person,
`robots.txt`, a sitemap that cannot advertise a draft or a `noIndex` page
because the query itself excludes them, search-result pages set to `noindex`,
correct `rel="prev"/"next"`, one `<h1>` per page, and `htmlLimitedBots` extended
to cover Telegram — which Next's default list omits and which is this store's
main channel.

Fixed this pass: the SVG social cards (H2) and RSS discovery (H3).

Remaining opportunities, none blocking:

- **Category archives are indexed but thin.** The sitemap lists
  `/blog?kategori=…` and each carries a self-canonical, which is consistent —
  but with five articles across several categories, some archives hold one post.
  Consider `noindex` until a category has three or more.
- **`Product` offers omit `priceValidUntil` and `url`.** Search Console will
  warn. Add both if rich results for products matter.
- **No `hreflang`.** Correct — the site is single-locale Indonesian. Add only if
  an English version appears.

---

## 9. Security

No injection path found. Parameterised queries throughout (the two raw SQL sites
interpolate only literals from their own module); `sanitize-html` on write with
a closed tag/attribute allowlist and iframe hosts restricted to YouTube and
Vimeo; SVG uploads sanitised and served under `default-src 'none'; sandbox` with
`Content-Disposition: attachment`; `safeKey` rejects traversal; upload folders
validated against a closed map so nothing can be written outside
`flazzgroup/`; bcrypt cost 12 with a dummy compare on unknown accounts so
response timing does not enumerate emails; one login error message for both
failure modes; `httpOnly` + `SameSite=Lax` + `Secure` session cookie with an
8-hour TTL; origin checks on every state-changing request including the two auth
routes that sit outside `withAdmin`; and defence in depth on the admin — the
middleware verifies the JWT, and `PanelLayout` and `requireSession` check again,
so a matcher mistake alone exposes nothing.

Fixed this pass: the JSON-LD escape (C1) and production `unsafe-eval` (M1).

Remaining:

- **`'unsafe-inline'` in `script-src`.** Cannot be removed without per-request
  nonces threaded through middleware, which makes every page dynamic. A real
  change, correctly deferred rather than smuggled into a header edit.
- **`sanitizeSvg` is regex-based.** It strips `<script>`, `<foreignObject>`,
  `on*=` handlers, `javascript:` URLs and `<!ENTITY>`, but a regex sanitiser is
  never complete — `<animate attributeName="href">` and similar are not covered.
  The risk is bounded: uploads require admin auth, and Cloudinary serves from
  `res.cloudinary.com`, a different origin, so a surviving payload cannot reach
  this site's cookies or DOM. Worth replacing with DOMPurify in a Node context
  if untrusted uploads ever become possible.
- **`isSameOrigin` returns true when no `Origin` header is present.** Standard,
  and necessary for server-to-server callers, but it means the origin check is a
  second layer rather than a barrier. `SameSite=Lax` is the first.
- **No startup assertion on `AUTH_SECRET`.** If it is missing or too short,
  `readSessionToken` swallows the throw and returns `null`, so every admin is
  silently signed out with nothing in the logs explaining why. Worth a boot-time
  check.

---

## 10. Accessibility

Good foundations: a skip link, one `<h1>` per page, `aria-label` on every
landmark nav, `aria-current="page"` on active filters and pagination,
`aria-expanded`/`aria-controls` on both disclosure buttons, a full focus trap
with Escape and focus restoration in the support panel, `useReducedMotion`
honoured throughout — including disabling hero autoplay, which is a real WCAG
2.2.2 concern — `sr-only` headings where a section would otherwise be unlabelled,
44 px minimum touch targets, `aria-hidden` on every decorative icon and image,
and a comment in `globals.css` recording that a text colour was lifted
specifically because it measured 3.9:1 on glass.

Fixed this pass: the unnamed hero links (H4).

Remaining:

- **The mobile menu is not a modal.** No focus trap and no `aria-modal`, so
  keyboard focus can move to content behind the open overlay. The support panel
  gets this right; the navbar does not.
- **`role="search"` on a control that does not search** (D4) — the
  accessibility half of that finding.
- **`role="dialog"` + `aria-live="polite"` on the consent banner** is a slightly
  unusual pairing. Not wrong, but `role="region"` would be more honest for
  something that does not trap focus.
- **Colour contrast was not measured** in this pass beyond reading the CSS.
  Run axe or Lighthouse against the deployed site.

---

## 11. Deployment checklist

**Must be done before launch**

- [ ] **`META_ACCESS_TOKEN`** — server-side only, never `NEXT_PUBLIC_`. Without
      it the Conversions API half is inert and `/api/track` returns
      `{ skipped: "not_configured" }`. Roughly a third of real conversions never
      reach the ad account from the browser alone.
- [ ] **Analytics IDs** — currently blank in both the database and `.env`, so no
      tags load and the consent banner does not appear. Set them in
      **Admin → Website Settings → Analytics**.
- [ ] **`AUTH_SECRET`** — 32+ random bytes, and not the one from `.env.example`.
- [ ] **`DATABASE_URL` = pooled (`-pooler`), `DIRECT_URL` = direct.** Migrations
      and the seed use `DIRECT_URL`; the app uses the pooler. Getting these
      backwards produces failures that do not point at their cause.

**Verify after deploying**

- [ ] `npm run db:migrate` — 8 migrations, all applied
- [ ] `npm run db:seed` — idempotent; re-running resets the admin password
- [ ] `npm run media:check` — proves Cloudinary credentials end to end
- [ ] `/robots.txt` and `/sitemap.xml` show the real domain, not `localhost`
- [ ] `siteUrl` in settings matches the deployed origin — canonicals, the
      sitemap, the feed and every social card are built from it
- [ ] Submit the sitemap in Search Console; confirm the verification meta tag
- [ ] Fire one WhatsApp click and confirm Meta **Test events** shows it **once**,
      marked as received from both Browser and Server. Two rows means
      deduplication is broken.
- [ ] Confirm the build has access to the database — the homepage, articles and
      `generateStaticParams` all read Postgres at build time

**Know before you scale**

- The build needs `DATABASE_URL`; there is no static fallback.
- `DB_POOL_MAX` × instance count must stay well under Neon's connection limit.
- Legacy `/media/*` uploads live on local disk. On Vercel that filesystem is
  ephemeral and per-instance — those 18 images are in `public/uploads` today and
  are served statically, but nothing may write there again.

---

## 12. Post-launch recommendations

**First week**

1. Build the orphan sweep (D1). It is the only finding that gets worse with time.
2. Move rate limiting to Redis (D2) once real traffic shows whether the login
   limiter is being hit.
3. Run Lighthouse and axe against the deployed origin. Local numbers are not
   real numbers.
4. Watch Search Console for the thin category archives (§8) before adding more.

**First month**

5. Decide what the navbar search is for (D4) and either wire it or remove it.
6. Make `PUT /api/settings` merge rather than replace (D3).
7. Add the CSP nonce and drop `'unsafe-inline'`. This is the single largest
   remaining security improvement, and it is a real change — budget for it.
8. Drop the eleven deprecated `hero_banners` copy columns once the current model
   has proven itself; the migration that kept them says as much.

**Ongoing**

9. Add a `google.<tld>` to `img-src` before advertising into a new country.
   Remarketing audiences fail silently otherwise; conversion counting is
   unaffected.
10. Add an error reporter (Sentry or similar). `global-error.tsx` surfaces a
    digest to the visitor, but nothing collects it.
11. Add uptime monitoring on `/` and `/api/auth/login`.
