# Project structure

How FLAZZ GROUP is put together, and why. For deployment steps see
[DEPLOYMENT.md](DEPLOYMENT.md); for the measurement stack see
[docs/analytics.md](docs/analytics.md).

- [Architecture](#architecture)
- [Folder structure](#folder-structure)
- [The layers](#the-layers)
- [Data model](#data-model)
- [Rendering and caching](#rendering-and-caching)
- [Authentication and RBAC](#authentication-and-rbac)
- [Media pipeline](#media-pipeline)
- [External services](#external-services)
- [Conventions](#conventions)
- [Maintenance](#maintenance)

---

## Architecture

Next.js 15 (App Router) on Vercel, Postgres on Neon, images on Cloudinary.

```
                    ┌──────────────── Vercel (sin1) ────────────────┐
   visitor ───────► │  middleware  →  Server Components  →  Prisma  │ ──► Neon
                    │                                               │     (sin1)
   admin ─────────► │  /admin  →  route handlers  →  Prisma         │
                    └───────────────────┬───────────────────────────┘
                                        │
                     images ────────────┴──────────► Cloudinary CDN
                     events (consented) ───────────► GTM · Meta · Clarity · Ads
```

Every piece of copy, price, image and toggle on the public site comes from the
database, so the owner changes the whole page from `/admin` without a deploy.
That is the central design decision, and most of the rest follows from it:
tag-based caching so edits appear immediately, a settings singleton, and a
media lifecycle that can reclaim storage when a row is deleted.

**Runtime.** Node, not edge, everywhere except the middleware — Prisma needs it.
The middleware is deliberately kept free of Prisma so it stays edge-safe.

---

## Folder structure

```
├── prisma/
│   ├── schema.prisma          single source of truth for the data model
│   ├── migrations/            11 migrations, forward-only, hand-checked
│   ├── seed.ts                idempotent; the account of last resort
│   └── blog-seed.ts           starter articles
│
├── public/                    bundled first-party artwork only (18 SVGs)
│   ├── art/  brands/  logo.svg
│
├── scripts/
│   ├── db-cli.mjs             wraps every DB command with the IPv6 workaround
│   └── media-smoke-test.ts    end-to-end Cloudinary check (npm run media:check)
│
├── src/
│   ├── middleware.ts          auth + coarse role gate, edge runtime
│   │
│   ├── app/
│   │   ├── layout.tsx         <html>, fonts, database-driven metadata
│   │   ├── (site)/            public site
│   │   │   ├── layout.tsx     support chat, analytics, consent banner
│   │   │   ├── page.tsx       homepage
│   │   │   └── blog/          index + [slug]
│   │   ├── (admin)/admin/
│   │   │   ├── login/
│   │   │   └── (panel)/       every authenticated screen
│   │   ├── api/               route handlers (see below)
│   │   ├── robots.ts  sitemap.ts  feed.xml/  opengraph-image.tsx
│   │   ├── not-found.tsx  global-error.tsx
│   │
│   ├── components/
│   │   ├── sections/          homepage sections, one file each
│   │   ├── blog/              article chrome
│   │   ├── admin/             panel: shell, managers, forms
│   │   ├── analytics/         tags, consent, trackers
│   │   ├── support/           floating chat
│   │   ├── layout/            navbar, footer
│   │   ├── common/            shared presentational pieces
│   │   └── ui/                primitives (Radix + Tailwind)
│   │
│   ├── lib/                   all logic; see "The layers"
│   └── generated/prisma/      generated client — never edited, not reviewed
│
├── next.config.ts             CSP, security headers, image loader
├── image-loader.ts            next/image → Cloudinary transformation URLs
└── prisma.config.ts           Prisma CLI: uses DIRECT_URL
```

### Route groups

`(site)` and `(admin)` are Next route groups — they shape the layout tree
without appearing in URLs. `(panel)` exists so every authenticated admin screen
inherits one layout that checks the session, while `/admin/login` sits outside
it and does not.

---

## The layers

Everything in `src/lib` is either **server-only** or **client-safe**, and the
distinction is enforced by the `server-only` import rather than by convention.

### Server-only

| Module | Responsibility |
| --- | --- |
| `prisma.ts` | One pooled client per process, tuned for a pooled Neon endpoint |
| `api.ts` | `withAdmin` — auth, authorisation, uniform errors, optimistic concurrency |
| `crud.ts` | `collectionRoute` / `itemRoute` / `reorderRoute` — the shape every resource route shares |
| `auth.ts` | Sessions, `requireRole`, password hashing, sign-in |
| `admins.ts` | Account management and the rules that stop it locking everyone out |
| `audit.ts` | The security trail |
| `queries.ts` | Homepage reads, each cached under its own tag |
| `blog/queries.ts` | Blog reads; published-only, everywhere |
| `blog/write.ts` | Sanitise → derive → store |
| `media/` | Upload, sniff, name, deliver, reclaim |
| `activity.ts` | Change log + cache invalidation |
| `reorder.ts` | Whole-list ordering in one statement |
| `rate-limit.ts` | Fixed-window limiter, in process memory |
| `client-ip.ts` | Who the caller is, and when to believe a header |

### Client-safe

| Module | Responsibility |
| --- | --- |
| `rbac.ts` | The permission map — read by middleware, pages, handlers and navigation |
| `session.ts` | JWT sign/verify only; free of Prisma so middleware can import it |
| `validators.ts` | Every Zod schema; the single definition of what is valid |
| `analytics/` | Event catalogue, `track()` fan-out, consent |
| `chat.ts` | Chat config shape and link building |
| `client-api.ts` | `fetch` wrapper that surfaces field-level errors |
| `media/url.ts`, `media/sniff.ts` | String and byte work, no SDK |
| `utils.ts`, `cache.ts`, `models.ts`, `seo.ts`, `site-nav.ts` | Small shared pieces |

### The API surface

All under `/api`. Every route is wrapped by `withAdmin`, which is where
authentication and authorisation actually happen.

```
/api/auth/login          public   rate limited, origin checked, audited
/api/auth/logout         public   audited
/api/track               public   Meta Conversions API relay

/api/upload              ADMIN    multipart; type decided by file bytes
/api/settings/chat       ADMIN    floating chat only
/api/{banners, hero-stats, popular, products, brands, features,
      payments, community, faq}[/id][/reorder]          ADMIN
/api/blog/{posts, categories, tags, authors}[/id]       ADMIN

/api/settings            SUPER_ADMIN   identity, SEO, analytics, sections
/api/admins[/id][/password]  SUPER_ADMIN
```

Nine of those resources share `collectionRoute` / `itemRoute` / `reorderRoute`,
so each route file is a dozen lines naming its model, its schema and its images.
Validation, error mapping, optimistic concurrency, cache invalidation and the
activity log all live in the shared wrapper — a resource cannot forget them.

---

## Data model

Eighteen models. `prisma/schema.prisma` is the source of truth and carries the
reasoning inline.

**Content** — `HeroBanner`, `HeroStat`, `PopularService`, `Product`, `Brand`,
`Feature`, `PaymentMethod`, `CommunityLink`, `Faq`. All share `isActive` and
`order`, which is what makes one `ResourceScreen` component work for all of them.

**Blog** — `BlogPost`, `BlogCategory`, `BlogTag`, `Author`, `BlogImage`.

**Settings** — `WebsiteSettings`, a singleton at `id = "settings"`, enforced by a
CHECK constraint rather than by convention.

**Access** — `Admin` (with `AdminRole`), `ActivityLog`, `AuditLog`, `MediaAsset`.

### Notable decisions

**A hero banner is one image.** The headline, chips and buttons live in the
artwork a designer exports. The old copy columns are still declared, defaulted
and unread so the change could be rolled back without losing what was written;
they can be dropped once the deploy has settled.

**Publication state is derived from a date.** A published post with a future
`publishedAt` is a scheduled post. No cron job can forget to flip a flag.

**Full-text search uses a generated `tsvector`** with weighted fields (title >
excerpt > body) and a GIN index. Prisma cannot express a generated column, so
migration `20260728230000_blog` is the source of truth for it and the schema
declares `Unsupported("tsvector")` only so a later migration does not offer to
drop it.

**`ActivityLog` and `AuditLog` are separate on purpose.** Activity feeds the
dashboard and is pruned to 200 rows. Audit answers "who did something sensitive,
when, from where" — a trail an afternoon of FAQ edits can flush is not a trail.
`audit_logs.actorId` is `ON DELETE SET NULL` with the email stored verbatim, so
deleting an account never erases the record of what it did.

**`BlogImage` is currently unused** — declared, zero rows, no code path. It is
the intended home for tracking images inserted into an article body so they can
be reclaimed. Left in place deliberately; see [Maintenance](#maintenance).

---

## Rendering and caching

| Route | Mode | Revalidate |
| --- | --- | --- |
| `/` | Static + tags | 5 min |
| `/blog` | Dynamic (reads `searchParams`) | — |
| `/blog/[slug]` | SSG for the first 200 posts, then on demand | 1 hour |
| `/sitemap.xml`, `/feed.xml` | Static + tags | 5 min / 1 hour |
| `/admin/*` | Dynamic, never cached | — |

**Tags are the fast path; the time window is the floor underneath it.** Every
read in `lib/queries.ts` is wrapped in `unstable_cache` with a tag, and every
admin write calls `revalidateTag`, so a saved change appears on the very next
request. The time bound exists for the two things that depend on the clock
rather than on an admin action: a scheduled post becoming visible, and the
copyright year.

That distinction matters and was a real bug: `publishedWhere()` evaluates
`new Date()` *inside* the cached function, so without a revalidate window "now"
freezes at the moment the cache filled and a scheduled post appears only when
somebody happens to save something unrelated.

**Images.** `loaderFile` in `next.config.ts` disables Next's own
`/_next/image` endpoint for every image, so the loader must never return such a
URL. Cloudinary URLs get `f_auto,q_auto,w_<n>,c_limit`; bundled vectors are
returned untouched and served straight from `/public`.

---

## Authentication and RBAC

**Two roles, deliberately.** `SUPER_ADMIN` owns the site — everything an admin
can do, plus the settings that decide what the site *is* and who else may sign
in. `ADMIN` is customer service: all the day-to-day content, none of the
switches that can take the site off the internet.

**The token proves identity; the database supplies authority.** The session JWT
is signed and carries the role, which lets the edge middleware refuse a request
without a database round trip. But `getSession()` reloads the account on every
call and trusts the row over the token, so a demotion or a suspension takes
effect on the person's *next request* rather than in eight hours.

Three layers, and only the last is the control:

1. **Middleware** — fast refusal, 403 rewrite for pages. Deliberately does *not*
   decide API authorisation: the audit log lives behind Prisma, which cannot run
   in that runtime, so a refusal decided there would leave no trace.
2. **Pages** — role check *before any query*, so nothing is read even if the
   middleware were bypassed or its matcher changed.
3. **`withAdmin(handler, { role })`** — runs before the handler body. This is
   what stands between a request and the data.

Hiding a nav link is presentation, never protection.

**Optimistic concurrency.** Every edit carries the row's `updatedAt`, spread into
the `where` clause so the check and the write are one statement. A stale form
gets 409. This is not only about lost updates: without it, admin A replacing an
image (which deletes the old file from Cloudinary) followed by admin B saving a
stale form would leave the row pointing at a file that no longer exists.

---

## Media pipeline

```
File → size check → sniff bytes → extension must agree → sanitise if SVG
     → claim an SEO public_id → upload → record MediaAsset row
```

**Type is decided by the file's bytes, never by the request.** `File.type` is
the `Content-Type` the client wrote into the multipart part; keying anything off
it meant the same SVG carrying `<script>` was sanitised when labelled
`image/svg+xml` and stored untouched when labelled `image/png`. Cloudinary then
sniffed the real type and served the unsanitised file as an SVG.

**Names are SEO names.** `Promo Juli 2026.png` becomes `promo-juli-2026`, with
`-2`, `-3` on collision — never a UUID, because the filename is part of the URL
a search engine reads.

**Reclaiming storage.** `releaseImage` destroys a Cloudinary asset when nothing
references it any more, checking every column that can hold an image first — the
same file is legitimately reused across rows. The `MediaAsset` row is dropped
only once the remote delete confirms, so a rate-limited Cloudinary cannot leave
an orphan nothing can find again.

---

## External services

| Service | Used for | If it goes down |
| --- | --- | --- |
| **Neon** | Everything | The site returns 500. Pages need the database to render. |
| **Cloudinary** | Uploaded images | Pages render; images fail to load. The panel reports the real error class — 401, 403, 429 and 5xx each get their own message. |
| **Vercel** | Hosting | Site down. |
| **GTM / GA4 / Meta / Clarity / Ads** | Measurement | Nothing. All consent-gated, loaded after hydration, and failure is silent by design. |

`/api/track` returns `{ skipped: "not_configured" }` when `META_ACCESS_TOKEN` is
absent and answers `202` when Meta rejects or times out — a visitor clicking
WhatsApp must never see an analytics failure.

---

## Conventions

**Validation lives in `lib/validators.ts`.** Both the API and the form use the
same schema, so they cannot disagree. Zod strips unknown keys, which is load
bearing: it is what stops an ADMIN posting `siteUrl` to the chat endpoint.

**Errors are shaped once.** `withAdmin` maps `UnauthorizedError` → 401,
`RoleDeniedError` → 403 (audited), `ForbiddenError` → 403, `ZodError` → 422 with
field messages, `P2025` → 404, `P2002` → 409 with an inline field error.

**Query strings are never trusted.** `lib/blog/params.ts` normalises every
parameter before anything reaches the database — a page number that is not a
plain run of digits redirects, and out-of-range pages 404 rather than serving an
indexable empty page.

**Comments explain why, not what.** Most of the non-obvious decisions in this
codebase are recorded next to the code that depends on them.

---

## Maintenance

### Routine

```bash
npm run dev            # local development
npm run db:migrate     # apply pending migrations
npm run db:seed        # idempotent; also the way back in if locked out
npm run db:studio      # browse the database
npm run media:check    # end-to-end Cloudinary verification
npm run build          # production build (runs prisma generate first)
```

### Adding a content resource

1. Model in `schema.prisma` → migration
2. Schema in `lib/validators.ts`
3. `src/app/api/<name>/route.ts` + `[id]/route.ts` + `reorder/route.ts` using
   `collectionRoute` / `itemRoute` / `reorderRoute`
4. Tag in `lib/cache.ts`, cached read in `lib/queries.ts`
5. Manager component using `ResourceScreen`, page under `(panel)`
6. Nav entry in `AdminShell`

### Adding a tracked event

1. Name and payload type in `lib/analytics/events.ts`
2. If Meta should see it, add to `META_EVENT_MAP`; for server-side delivery add
   to `SERVER_SIDE_EVENTS`
3. Call `track("your_event", { … })`, or use `<TrackedLink>`
4. Add a GA4 Event tag in GTM with a matching Custom Event trigger

### Migrations

Forward-only. **Never edit or delete an applied migration file** — Prisma stores
a checksum per migration, and changing one makes `migrate deploy` fail on every
environment that already ran it, production included. To undo a schema change,
write a new migration.

Every migration so far is additive, which is what makes an application rollback
safe without a database rollback: older code ignores a column it does not know
about.

### Known deliberate gaps

**Images inserted into an article body are never reclaimed.** `releaseImage`
covers the image *columns*; images placed inside rich-text content are recorded
nowhere. `BlogImage` and `blog_images` exist for this and are unused. Doing it
correctly needs a content diff plus extending the reference check to search
article bodies, and it adds an irreversible deletion path — worth building
carefully, not bolting on. There are zero orphans today.

**The rate limiter is in process memory.** Correct on a single instance; on
Vercel each instance keeps its own counter, so the login limit is per warm
instance. Move it to Redis or a Postgres table before traffic justifies more
than one instance. Only `lib/rate-limit.ts` changes.

**`'unsafe-inline'` remains in `script-src`.** Removing it needs per-request
nonces threaded through the middleware, which makes every page dynamic.
`'unsafe-eval'` is already development-only.
