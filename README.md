# FLAZZ GROUP

Premium dark gaming marketplace, built on Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Framer Motion, Swiper and shadcn/ui primitives — with a PostgreSQL + Prisma admin panel behind it.

Every word, image, price and ordering on the homepage is edited from `/admin`. Nothing on the public page is hardcoded.

## Getting started

```bash
cp .env.example .env      # then fill in DATABASE_URL, AUTH_SECRET, ADMIN_*
npm install               # runs `prisma generate` automatically
npm run db:migrate        # apply migrations
npm run db:seed           # creates the admin account + the approved content
npm run dev               # http://localhost:3000, panel at /admin
```

`npm run build` runs `prisma generate` before `next build`, so a clean CI checkout works with `npm ci && npm run build`.

### Database (Neon)

Two connection strings, and swapping them breaks things in ways that look unrelated:

| Variable | Endpoint | Used by |
| --- | --- | --- |
| `DATABASE_URL` | `ep-xxx-**pooler**.…` | the app — [src/lib/prisma.ts](src/lib/prisma.ts) |
| `DIRECT_URL` | `ep-xxx.…` | the Prisma CLI — [prisma.config.ts](prisma.config.ts) |

Migrate takes a **session-level advisory lock**. Run it through the pooler and the lock is taken on one PgBouncer backend and released on another — it leaks, and every later migration fails with `P1002: Timed out trying to acquire a postgres advisory lock`. Clearing it means finding the holder in `pg_locks` and terminating that backend. Point `DIRECT_URL` at the unpooled endpoint and the problem cannot occur.

Never put `options=-c statement_timeout=…` in either URL: a pooled endpoint rejects the connection outright with `08P01 unsupported startup parameter`. Those timeouts are set on the database by [20260730170000_session_timeouts](prisma/migrations/20260730170000_session_timeouts/migration.sql).

Use `db:migrate`, not `prisma db push`. This schema contains a generated `tsvector` column and two GIN indexes that Prisma cannot express; `db push` diffs them away.

**`P1001: Can't reach database server`** is usually not the database. Neon publishes AAAA records, and on a machine with broken IPv6 Node races both families and fails in under a second. Check with `ping -6 2606:4700:4700::1111`; if it times out, set `NODE_OPTIONS=--no-network-family-autoselection` and fix IPv6 on the network.

### Deploying

Set `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` and the `CLOUDINARY_*` keys, then run `npm run db:migrate && npm run db:seed` once as a deploy step.

Uploads go to Cloudinary. The legacy `var/uploads` directory is only still read for images uploaded before that move, and local disk is **ephemeral on most hosts** — mount a volume and point `UPLOAD_DIR` at it if you still need those files.

## Admin panel

`/admin`, protected by a single account. Sessions are a signed JWT (`jose`, HS256) in an httpOnly, sameSite cookie that expires after 8 hours. Passwords are bcrypt hashes at cost 12; the plaintext only ever exists in `.env` for seeding.

Protection is two-layered: [middleware.ts](src/middleware.ts) verifies the cookie signature at the edge for `/admin/*` and `/api/*`, and every route handler independently calls `requireSession()`. A misconfigured matcher alone cannot expose data.

| Section | What it controls |
| --- | --- |
| Dashboard | Totals per resource, last updated, recent activity, section switches at a glance |
| Hero Banner | Slides in the hero slider — image, headline, chips, buttons, order, visibility |
| Popular | The three "Populer Hari Ini" cards |
| Products | Royal Dream coin denominations and services, with prices and badges |
| Brands | The six brand cards — logo, status, accent colour, homepage visibility |
| Features | The "Why FLAZZ" grid |
| Payments | Marquee of accepted methods (logo optional; falls back to an initials tile) |
| Community Links | Telegram, WhatsApp, channel and group cards |
| FAQ | Accordion entries, which also generate the FAQ structured data |
| General Settings | Name, logo, favicon, SEO, social links, footer, and the section switches |

Every list supports create, edit, delete (with a confirmation dialog), drag-and-drop ordering, and an enable/disable switch. Ordering saves optimistically and rolls back if the request fails.

## How a change reaches the homepage

1. The admin form `PUT`s to a REST route handler.
2. The handler validates with the shared Zod schema, writes through Prisma, and records an activity entry.
3. `revalidateTag` drops that resource's cache tag.
4. The next homepage request re-renders with fresh data.

The homepage renders to cached HTML that is invalidated by tag, so a view costs no database round trip and the markup is served straight from cache. Because `revalidateTag` expires the entry rather than handing out a stale copy, a saved edit is visible on the very next request — measured at 8/8 across consecutive write-then-read rounds.

Keeping the page cacheable also keeps metadata in `<head>` instead of streamed into the body, which is what link-preview scrapers read.

## API

REST, JSON, session-protected. Every resource follows the same shape, generated from [lib/crud.ts](src/lib/crud.ts):

```
GET    /api/<resource>            list
POST   /api/<resource>            create
PUT    /api/<resource>/[id]       update
DELETE /api/<resource>/[id]       delete (also removes the stored image)
POST   /api/<resource>/reorder    persist a drag-and-drop ordering
```

Resources: `banners`, `hero-stats`, `popular`, `products`, `brands`, `features`, `payments`, `community`, `faq`. Plus `GET|PUT /api/settings`, `POST /api/upload`, and `POST /api/auth/login|logout`.

Errors are uniform: `{ error, fields }`, where `fields` maps a field name to a message so forms can show it inline.

## Uploads

`POST /api/upload` takes one `file` field and returns `{ url, key, size }`.

- Accepts PNG, JPG, WEBP and SVG, up to 4 MB.
- Rasters are re-encoded to WebP at up to 1600px — this shrinks them and discards anything hidden in the original container.
- SVGs cannot be re-encoded, so they are sanitised instead: scripts, event handlers, `javascript:` refs, `foreignObject` and entities are stripped.
- Files are written **outside** `public/`, because Next indexes `public/` at boot and a file written there at runtime 404s until restart. They are served by [/media/[key]](src/app/media/[key]/route.ts) with an immutable cache header.

To move to S3 or UploadThing, implement the `StorageDriver` interface in [lib/storage/types.ts](src/lib/storage/types.ts) and register it in [lib/storage/index.ts](src/lib/storage/index.ts). Nothing above that file changes.


## Blog

A full CMS at `/blog`, managed from `/admin/blog`. It exists for search, so
every part of it is built around being indexed.

| Route | What it is |
| --- | --- |
| `/blog` | Archive with search, category filter and pagination |
| `/blog/[slug]` | Article — prerendered, ISR every hour |
| `/feed.xml` | RSS of every published article |
| `/admin/blog` | List with server-side search, status/category filter, sort, pagination |
| `/admin/blog/new`, `/admin/blog/[id]` | Tiptap editor with the SEO panel |

### Writing

The editor covers headings, bold/italic/underline/strike, lists, quotes, code
blocks, tables, images, YouTube embeds, dividers and callouts. Images upload
through the same pipeline as the rest of the site — re-encoded to WebP and
served from `/media`.

Slugs generate from the title and then freeze once edited by hand, because a
live slug is a URL and changing it breaks every link to it.

### Draft, publish, schedule

Status is `DRAFT` or `PUBLISHED`. A published post dated in the future is a
**scheduled** post: it stays out of the blog, the sitemap, the RSS feed and
related-post strips until its date passes, then appears on its own. There is no
cron job to forget, because the state is derived from the date rather than
stored separately.

### Search

Postgres full-text search over a generated `tsvector` column, weighted title >
excerpt > body, with a trigram index for partial words. It stays fast into the
thousands of articles because the ranking happens in the database, not in Node.
The `simple` dictionary is deliberate — Postgres ships no Indonesian stemmer,
and `english` would mangle Indonesian words.

### SEO

Per-article title, description, focus keyword, canonical and a noindex switch,
all editable. Each article emits OpenGraph and Twitter tags plus a JSON-LD graph
containing `BlogPosting`, `BreadcrumbList`, `Person` and `Organization`, linked
by `@id` rather than repeated. Search-result pages are `noindex` — they are thin
and effectively infinite. The sitemap and RSS build themselves from published
posts only.

### Security

HTML is sanitised **on write**, so what is stored is already safe and rendering
never has to trust the database. Scripts, event handlers and `javascript:` URLs
are stripped; iframes are limited to YouTube and Vimeo; external links get
`noopener noreferrer nofollow`.

## Data model

[prisma/schema.prisma](prisma/schema.prisma) — `Admin`, `ActivityLog`, `WebsiteSettings` (single row), `HeroBanner`, `HeroStat`, `PopularService`, `Product`, `Brand`, `Feature`, `PaymentMethod`, `CommunityLink`, `Faq`. Sortable tables are indexed on `(isActive, order)`.

Prisma 7 names generated row types `BrandModel`, `FaqModel` and so on; [lib/models.ts](src/lib/models.ts) re-exports them under clean names so that detail lives in one file.

## Security

- Every write validates against a Zod schema ([lib/validators.ts](src/lib/validators.ts)) — the API never trusts the client, and the same schemas drive the forms.
- Link fields reject anything that is not `https://`, `/path` or `#anchor`, so `javascript:` cannot be stored.
- Prisma parameterises every query; there is no raw SQL.
- Login returns one message for both unknown email and wrong password, and burns comparable time either way, so accounts cannot be enumerated.
- `/admin` is `noindex`, and `robots.txt` disallows `/admin` and `/api`.
- Deleting a row only deletes images it owns under `/media/` — bundled art in `public/` and remote URLs are left alone.

## Design system

Tokens live in [globals.css](src/app/globals.css) under `@theme`.

| Token | Value | Role |
| --- | --- | --- |
| `ink` | `#071321` | Page base |
| `abyss` | `#0D1B3D` | Raised surface |
| `deep` | `#123C7B` | Structure, borders |
| `volt` | `#2E7CF6` | Primary action, blue glow |
| `gold` | `#FFD54A` | Accent, reserved for the single most important action |

**Type** — Poppins for display and body, JetBrains Mono for numbers and status chips. Both are self-hosted from [src/fonts/](src/fonts/) via `next/font/local`: no third-party request on first paint, no layout shift.

**Signature** — the *Flazz seam*: one diagonal light pass at `--seam: 115deg`, the same angle as the bolt in the logo, applied through `.seam` on every premium card so hover lighting reads as one system.

Reusable classes: `.glass`, `.glass-soft`, `.seam`, `.lift`, `.eyebrow`, `.rule-gold`, `.text-royal`, `.text-volt`, `.rail`, `.fade-x`.

## Structure

```
prisma/            schema, migrations, seed
src/
├── app/
│   ├── (site)/page.tsx        public homepage
│   ├── (admin)/admin/         login + the panel
│   ├── api/                   REST route handlers
│   ├── media/[key]/           serves uploads
│   ├── layout.tsx             fonts + DB-driven metadata
│   └── opengraph-image.tsx    OG card built from settings + first banner
├── components/
│   ├── layout/                Navbar, Footer
│   ├── sections/              the homepage sections
│   ├── admin/                 shell, ResourceScreen, uploader, managers
│   ├── common/                Reveal, SectionHeading, Icons, StructuredData
│   └── ui/                    shadcn-style primitives
├── lib/                       prisma, auth, storage, validators, queries, crud
└── middleware.ts              admin + API gate
```

Admin CRUD screens are one component: [ResourceScreen](src/components/admin/ResourceScreen.tsx) handles the table, drag ordering, dialog, validation errors, toasts and delete confirmation. Each manager only declares its columns and form fields.

## Accessibility

Semantic landmarks, a skip link, labelled inputs, `aria-expanded`/`aria-controls` on menus, Escape to close, gold focus rings, Swiper keyboard and a11y modules, and decorative art marked `aria-hidden`. Scroll animations return plain elements under `prefers-reduced-motion`.

## SEO

Title, description, keywords, favicon, canonical and social cards all come from `WebsiteSettings` via `generateMetadata`. JSON-LD ([StructuredData](src/components/common/StructuredData.tsx)) emits `Organization`, `WebSite`, an `ItemList` of products and a `FAQPage`, all from live data. `robots.ts` and `sitemap.ts` follow the configured site URL. The OG image is generated at request time from the settings and the first hero banner.

## Not included

`/order`, `/login` and `/register` are referenced by buy buttons but have no routes yet, so those links use `prefetch={false}`. Seeded prices, stats and member counts are placeholders — edit them in the panel before launch.
