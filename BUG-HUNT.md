# Production bug hunt — FLAZZ GROUP

Date: 2026-07-29 · Next.js 15.5.21 · React 19.1 · Prisma 7.9 (pg driver adapter)

Verified against a real build (`next build`) and a running production server
(`next start`) with a live Postgres, using an authenticated admin session.
`tsc --noEmit` and ESLint are clean.

---

## 1. The reported error — root cause and fix

```
Attempted to call toLocalInput() from the server but toLocalInput is on the client.
src/app/(admin)/admin/(panel)/blog/[id]/page.tsx
```

**Root cause.** `toLocalInput` was declared and exported from
`src/components/admin/blog/PostEditor.tsx`, which carries `"use client"`.
Every export of a `"use client"` module is a client reference — a component can
be *rendered* from a server component, but a plain function cannot be *called*.
The edit page called it at line 52 to format `post.publishedAt`.

**The bug it was hiding.** Making the function importable would have shipped a
worse defect. `toLocalInput` converts a UTC instant to wall-clock time using
`date.getTimezoneOffset()`, which answers for whichever machine runs it — UTC on
a Railway container, WIB on an editor's laptop. Calling it on the server would
have:

1. rendered a publish time seven hours off for an Indonesian editor;
2. mismatched on hydration, because the browser computes a different string;
3. **walked every scheduled post backwards by the offset on each save**, since
   the editor posted the field back through `new Date(value).toISOString()`,
   parsed in the browser's zone.

**Fix — the boundary moved instead of the function.**

- `blog/[id]/page.tsx` now sends `post.publishedAt?.toISOString() ?? ""`: a
  timezone-neutral instant. No client import.
- `PostDraft.publishedAt` is documented as an ISO instant, not a wall-clock
  string, so the value the API receives no longer depends on where it was typed.
- `toLocalInput` / `fromLocalInput` are now private to `PostEditor` and
  unexported — the boundary can't be crossed again by accident.
- The field renders empty until mount, so the server HTML and the first client
  render agree and hydration is exact. The browser's timezone genuinely does not
  exist during SSR; gating on mount states that rather than suppressing it.

**Project-wide sweep.** Every `"use client"` module was cross-referenced against
its importers, and every `server-only` module against every client component.
`toLocalInput` was the only violation in either direction. There are no
`"use server"` files, so no server-action boundary to audit.

Verified: `/admin/blog/{id}` returns **200** and renders the editor.

---

## 2. Critical

| # | Issue | Status |
|---|-------|--------|
| C1 | `toLocalInput` client/server boundary violation + latent timezone corruption on every scheduled save | **Fixed** |
| C2 | `settings.siteUrl` is `http://localhost:3000` in the live database | **Config — must change before launch** |

**C2 is the single highest-risk item and is not a code bug.** Canonical tags,
`sitemap.xml`, `robots.txt`'s `Host`/`Sitemap` lines, RSS links, OpenGraph URLs
and all JSON-LD `@id`s are derived from that one column. Shipped as-is, every
canonical on the production site points at localhost and Google indexes nothing.
Set it in **Admin → General Settings** immediately after deploy.

---

## 3. High priority — all fixed

**H1 · Duplicate slug returned HTTP 500.** Creating a category, tag, author or
article with a slug already in use raised Prisma `P2002`, which `withAdmin` did
not handle — the editor saw "Something went wrong. Please try again." and no
indication of which field was wrong, on a save that could never succeed.
Now returns **409** with an inline field error. Note that Prisma 7's pg driver
adapter reports the offending column at
`meta.driverAdapterError.cause.constraint.fields`, not the `meta.target` the
query engine uses; both shapes are handled, plus a constraint-name fallback.

> Verified: `POST /api/blog/categories` with a taken slug →
> `409 {"fields":{"slug":"That slug is already used by another item…"}}`

**H2 · Every navbar and footer link was dead on the entire blog.**
`buildNavLinks` emitted bare fragments (`#royal-dream`, `#brands`, …). The same
navbar and footer render on `/blog` and on every article, where a bare fragment
resolves against the article's own URL — so clicking "Royal Dream" from an
article went to `/blog/<slug>#royal-dream`, an anchor that does not exist.
Now root-absolute (`/#royal-dream`), which scrolls in place on the homepage and
navigates from anywhere else.

**H3 · Navbar search silently did nothing on blog pages.** It called
`document.querySelector('#royal-dream')?.scrollIntoView()`; on blog pages that
element is absent and the optional chain swallowed it. Now falls back to a real
navigation when the target is not in the document.

**H4 · No admin UI existed for blog categories, tags or authors.** The REST
endpoints, schemas and unique constraints were all there, and the post editor
pointed at "Blog taxonomy" for adding tags — but that screen did not exist. After
the seed, none of the three could be changed without going to the database.
Added **`/admin/blog-taxonomy`** (route segment matches the already-defined
`RESOURCE_ROUTES.blogTaxonomy`), built entirely from the existing
`ResourceScreen` primitive — no new UI design, three tabs, per-row article
counts, slug-follows-name with a freeze on rows that already have a live URL.
Linked from the sidebar and from the post editor's empty-tags hint.

**H5 · Taxonomy edits never invalidated any cache.** Category, tag and author
writes revalidated the tag `blog-taxonomy`, which was attached to **no cache
entry anywhere** — a dead tag. Renaming a category reported success while the
public site kept serving the old name until the unrelated 5-minute timer
happened to expire. Added an explicit cascade (`blogTaxonomy → blog`) in
`lib/cache.ts` and tagged `getCategories` with both.

**H6 · Stored-XSS hardening gap on uploaded SVGs.** `/media/[key]` sets a
hardened `default-src 'none'; …; sandbox` CSP in code, but headers declared in
`next.config.ts` win — so uploaded media was actually served under the *site*
policy, which permits `'unsafe-inline'` script. An uploaded SVG is same-origin
XML served as `image/svg+xml` with no `Content-Disposition`; anything that
slipped past the regex-based SVG sanitiser (a class of filter with a long
bypass history — `<set attributeName="onload">`, `<animate>`, CDATA) would have
executed with the site's origin. The hardened policy plus
`Content-Disposition: attachment` now live in `next.config.ts` where they take
effect.

> Verified: `/media/*` serves `default-src 'none'; style-src 'unsafe-inline'; sandbox`
> + `Content-Disposition: attachment`, while `<img>` loads and `/_next/image`
> both still return 200 — neither is affected by the disposition header.

**H7 · Category archives were told to de-index themselves.** `sitemap.xml`
advertises `/blog?kategori=<slug>` as indexable, but `/blog` hard-coded
`alternates.canonical: "/blog"` for every variant — telling Google the URLs it
had just been handed were duplicates of the bare archive. Titles and
descriptions were identical across all of them too. Each archive now carries its
own title, its own description (the category's own text) and a self-referencing
canonical, page number included.

> Verified: `/blog?kategori=panduan-top-up` →
> `<title>Panduan Top Up — Blog | FLAZZ GROUP</title>` +
> `<link rel="canonical" href="…/blog?kategori=panduan-top-up">`

---

## 4. Medium priority — all fixed

**M1 · RSS stayed stale for up to an hour after publishing.** `feed.xml` read
`getAllPublishedPosts()`, the one blog query with no cache tag. A statically
rendered route only inherits the tags of the cache entries it reads, so
`revalidateTag("blog")` had nothing to invalidate and the feed served the
pre-publish list until its own hourly window expired. The query is now tagged;
the build reports `feed.xml` at a 5-minute revalidate instead of 1 hour, and
publishing updates it immediately. Its dates are revived across the cache's JSON
round trip, avoiding the `Invalid time value` failure mode the module already
documents.

> Verified: publishing a post makes it appear in `/blog/<slug>`, `sitemap.xml`
> **and** `feed.xml` on the very next request.

**M2 · The root layout's canonical leaked to every page.** `alternates:
{ canonical: "/" }` on the root layout is inherited by any page that does not
override it — the 404 page, `/admin/login`, and anything added later all
declared themselves duplicates of the homepage. Moved onto the homepage, which
is the page it describes.

> Verified: `/admin/login` now emits no canonical; `/` still emits its own.

**M3 · The two auth endpoints had no origin guard.** `/api/auth/login` and
`/api/auth/logout` are exempt from `withAdmin` by definition — they run before a
session exists — so they were the only writes on the site with no CSRF check.
Both now call the same `isSameOrigin` helper. Exploitability was low
(`Set-Cookie` on a cross-origin fetch is dropped, and a plain HTML form cannot
send `application/json`), but the guard is one line and closes a login-CSRF
class outright.

> Verified: cross-origin login → **403**; same-origin login → **200**.

---

## 5. Confirmed working — tested, not assumed

**Blog.** Create · edit · delete · draft · publish · schedule · featured image ·
categories · tags · author · search · pagination · slug · related posts ·
reading time · table of contents · RSS — all exercised end to end.

- A scheduled post (future `publishedAt`) is invisible in **all five** places
  simultaneously: article page **404**, sitemap **0 matches**, feed **0**,
  search **0**, listing **0**. Deriving the state from the date rather than a
  stored flag means no cron job can forget to flip it.
- Flipping that post to a past date makes it appear in page, sitemap and feed on
  the next request — tag revalidation is genuinely wired end to end.
- Reading time and the plain-text search mirror are derived server-side from
  sanitised HTML, not trusted from the client.
- Heading anchors are injected at render, so renaming a heading cannot leave a
  stale anchor in the database.

**Security.**

- **XSS:** a post body containing `<script>alert(1)</script>`,
  `<img src=x onerror=…>`, `javascript:` href and a third-party `<iframe>` was
  stored and rendered as `<p>ok</p>` and nothing else. Sanitising on write means
  render never has to trust the database.
- **SVG upload:** `<script>`, `javascript:` href and `onclick` all stripped.
- **SQL injection:** no string interpolation of request data anywhere. The three
  raw queries use bound parameters; `reorder.ts` interpolates only table-name
  literals from a closed map in its own file.
- **Upload validation:** disallowed MIME → 415; a non-image sent as `image/png`
  → 415 (sharp cannot decode it); no session → 401; cross-origin → 403. Rasters
  are re-encoded to WebP capped at 1600px, which also discards any payload
  hidden in the original container. 4000×4000 JPEG → 4.6 kB WebP.
- **Rate limiting:** login locks out at exactly the 11th attempt (429).
- **Path traversal:** `/media/..%2F..%2Fpackage.json` → 404.
- **Authorization:** middleware plus a server-side `getSession()` in the panel
  layout plus `requireSession()` in every handler — three independent layers, so
  a misconfigured matcher alone cannot expose data. `/api/*` unauthenticated →
  401; `/admin/*` → 307 to `/admin/login?next=…`.
- **Headers:** CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy,
  Permissions-Policy all present; `X-Powered-By` absent.

**SEO.** `robots.txt` and `sitemap.xml` generate correctly and revalidate on
publish. Drafts, scheduled posts and `noIndex` articles are excluded by the
query itself, so the sitemap cannot advertise a page that 404s. Search-result
pages are `noindex, follow`. JSON-LD emits Organization, WebSite, BlogPosting,
BreadcrumbList, WebPage, Person and FAQPage in one `@graph`. Crawler coverage
(`htmlLimitedBots`) already includes Telegram, WhatsApp, Facebook, Twitter,
Bing, Google and Discord, so metadata is rendered into `<head>` rather than
streamed for all of them.

**Error handling.** Bad slug → 404 · missing image → placeholder tile ·
malformed JSON → 422 · deleted row → 404 · a deleted category/tag/author leaves
its articles intact (`onDelete: SetNull`) · a database outage on the metadata
path degrades to a safe fallback rather than a hard failure.

**Database.** Composite indexes match the actual query shapes
(`[status, publishedAt desc]`, `[categoryId, status, publishedAt desc]`); FK
columns are indexed, which Postgres does not do automatically; `Timestamptz(3)`
throughout; slugs unique on every model; reordering is one atomic
`UPDATE … FROM (VALUES …)` rather than N round trips.

---

## 6. Open — known, not fixed

Deliberately left alone: each is either an infrastructure decision, a product
feature rather than a defect, or a change with more risk than the problem.

### Architecture / operations

- **Rate limiter is in-process memory.** Correct for the single-container target
  and documented as such, but it silently degrades to *N* × the limit across
  instances. Move to Redis or Postgres before scaling out; only `rate-limit.ts`
  changes.
- **Uploads go to local disk.** Ephemeral on a container — every image is lost
  on redeploy unless `UPLOAD_DIR` points at a mounted volume. The driver
  interface is already in place for an S3 swap.
- **`searchVector` is a generated column that `schema.prisma` does not know
  about.** It is created by `20260728230000_blog/migration.sql`. `prisma migrate
  dev` will read that as drift and offer to **drop the column**, silently
  breaking full-text search. Worth a comment in the schema at minimum.
- **CSP allows `'unsafe-inline'` and `'unsafe-eval'` for scripts.** Already
  documented in `next.config.ts`; removing it needs per-request nonces threaded
  through middleware.

### Features on the audit checklist that are not built

- **No author pages.** `ArticleSchema` uses `/blog/penulis/<slug>#person` as the
  Person node's `@id`. That is valid as an identifier and nothing links to it,
  but the URL 404s if a crawler tries to resolve it.
- **No unused-image cleanup or broken-image detection.** The `BlogImage` model
  exists in the schema with the right shape but **no application code reads or
  writes it** — the media library is unimplemented. Uploads that are never
  attached to a row stay on disk forever.
- **No autosave** in the post editor. A long article is lost on a tab crash.
- **The navbar search box is decorative** — it discards the typed value
  (`void query`) and only scrolls to the catalogue. On `/blog`, where real
  full-text search exists, wiring it to `/blog?q=` would be a small win.

### Minor

- Deleting a post deletes its featured image even if another post points at the
  same URL.
- Category and tag *names* are not unique (only slugs), so two categories can
  display identically.
- `blogPostSchema` requires `featuredImage`, `canonicalUrl`, `authorId` and
  `categoryId` to be *present* (possibly empty) rather than optional. The admin
  UI always sends them; a partial `PUT` from any other client gets a 422.
- `export const revalidate = 3600` on `/blog` is inert — reading `searchParams`
  makes the route dynamic.
- The footer's `new Date().getFullYear()` renders into a tag-cached page, so the
  year can lag into January until something invalidates the homepage.
- `robots.txt` uses `Disallow: /admin`, a prefix match that also covers
  `/administrator`. Harmless here.

### Not verifiable in this environment

- **Responsive layout at 320/375/390/768/1024/1440** and **Lighthouse / CLS /
  LCP / TBT** need a real browser, which this environment does not have. What
  can be said statically: the layout is fluid grid + flex with no fixed pixel
  widths, images always carry `sizes`, above-the-fold images use `priority`,
  fonts are self-hosted woff2 with `display: swap` (no third-party request, no
  layout shift), Tiptap (~100 kB) is behind a dynamic import, and
  `optimizePackageImports` covers the icon and motion packages. First Load JS is
  103 kB shared, 210 kB on the homepage and 177 kB on an article.

---

## 7. Files changed

| File | Change |
|------|--------|
| `src/components/admin/blog/PostEditor.tsx` | ISO-instant draft field; private, client-only date conversion; mount-gated input; taxonomy link |
| `src/app/(admin)/admin/(panel)/blog/[id]/page.tsx` | Sends an ISO instant; no client import |
| `src/lib/api.ts` | `P2002` → 409 with an inline field error; `isSameOrigin` exported |
| `src/lib/cache.ts` | `tagsFor()` + the `blogTaxonomy → blog` cascade |
| `src/lib/activity.ts` | Revalidates the full cascade |
| `src/lib/blog/queries.ts` | `getAllPublishedPosts` tagged and date-revived; `getCategories` tagged with `blogTaxonomy` |
| `src/lib/site-nav.ts` | Root-absolute section links |
| `src/components/layout/Navbar.tsx` | Search falls back to navigation off-homepage |
| `src/app/(site)/blog/page.tsx` | Per-category title, description and self-canonical |
| `src/app/layout.tsx` | Root canonical removed |
| `src/app/(site)/page.tsx` | Owns its canonical |
| `src/app/api/auth/login/route.ts`, `logout/route.ts` | Origin guard |
| `next.config.ts` | Hardened, effective CSP + `Content-Disposition` for `/media` |
| `src/components/admin/blog/TaxonomyManager.tsx` | **New** — categories / tags / authors |
| `src/app/(admin)/admin/(panel)/blog-taxonomy/page.tsx` | **New** — route |
| `src/components/admin/AdminShell.tsx` | Sidebar entry |

No UI redesign. No rewrites. Every change is additive or a corrected boundary.
