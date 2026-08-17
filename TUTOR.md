# TUTOR.md — Running FLAZZ GROUP

A practical manual for the **owner/operator**, not for another engineer. Every
command here is one that actually exists in this project; nothing is invented.

**The architecture, once, so nothing below surprises you:**

```
visitor
  ↓
Cloudflare        DNS, TLS, CDN, cache
  ↓
VPS               a Linux box you rent
  ↓
Next.js 15.5.21   this application, started with `npm start`
  ↓
Neon PostgreSQL   the database (Singapore region)
Cloudinary        every image
```

**This is not Vercel.** If a guide on the internet tells you to click something
in a Vercel dashboard, it is not describing your site.

**Canonical domain: `https://www.flazzgroup.com`** — with the `www`. Do not
change this. Every canonical tag, the sitemap, robots.txt and the social cards
are all built from one setting, and changing it re-points all of them at once.

---

## Contents

- [A · Local development](#a--local-development)
- [B · Neon database](#b--neon-database)
- [C · VPS deployment](#c--vps-deployment)
- [D · Cloudflare](#d--cloudflare)
- [E · Cloudinary](#e--cloudinary)
- [F · Admin panel](#f--admin-panel)
- [G · SEO operations](#g--seo-operations)
- [H · Google Search Console](#h--google-search-console)
- [I · Analytics](#i--analytics)
- [J · Troubleshooting](#j--troubleshooting)

---

## A · Local development

### A1. Install

Node 20 or newer.

```bash
git clone <repository-url>
cd "flazz group baru"
npm install
```

`npm install` runs `prisma generate` for you afterwards. If you ever see
"`@prisma/client` did not initialise", run `npx prisma generate` and it goes
away.

### A2. The `.env` file

Copy the template and fill it in:

```bash
cp .env.example .env
```

`.env.example` explains every variable in place — read it, it is written for
this purpose. The ones you cannot skip:

| Variable | Where it comes from |
| --- | --- |
| `DATABASE_URL` | Neon dashboard → **Pooled** connection string (has `-pooler`) |
| `DIRECT_URL` | Neon dashboard → the same string with pooling **off** |
| `AUTH_SECRET` | Generate one, see below |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | You choose. Used by the seed |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | Cloudinary → Settings → API Keys |
| `NEXT_PUBLIC_SITE_URL` | `https://www.flazzgroup.com` |
| `TRUSTED_PROXY` | `cloudflare` in production, leave unset locally |

Generate a signing key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Never commit `.env`.** It is already in `.gitignore`. `AUTH_SECRET`,
`CLOUDINARY_API_SECRET` and `META_ACCESS_TOKEN` are the three that would hurt
most: the first lets someone mint an admin session, the last can spend money.

### A3. Start it

```bash
npm run dev          # http://localhost:3000
```

Then, the first time only:

```bash
npm run db:migrate   # create the tables
npm run db:seed      # create your admin account + starter content
```

Sign in at `http://localhost:3000/admin/login` with `ADMIN_EMAIL` /
`ADMIN_PASSWORD`.

### A4. Every command you have

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server, hot reload |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Typecheck |
| `npm run db:migrate` | Apply pending migrations (`prisma migrate deploy`) |
| `npm run db:seed` | Seed / reset the admin password |
| `npm run db:studio` | Browse the database in a GUI |
| `npm run db:reset` | **Destroys all data** and re-migrates. Never in production |
| `npm run media:check` | End-to-end Cloudinary test — uploads, transforms, deletes |

Every `db:*` script and `npm start` run through `scripts/db-cli.mjs`, which
disables Node's IPv6 auto-selection. Neon publishes IPv6 records, and on a
machine with broken IPv6 the connection dies in under a second with a confusing
error. **Use the npm scripts rather than calling `prisma` directly** and this
never comes up.

### A5. Common local errors

| Symptom | Fix |
| --- | --- |
| `P1001: Can't reach database server` | Use the npm scripts (see A4). If it persists, the Neon project is suspended — open the Neon dashboard to wake it |
| `Image hosting is not configured` | One of the three `CLOUDINARY_*` variables is missing from `.env` |
| `AUTH_SECRET is not set` | Generate one, see A2 |
| Port 3000 in use | `PORT=3001 npm run dev` |
| Changes not showing in `npm start` | You rebuilt while the server was running. See [C4](#c4--why-the-order-matters) — this is real, and it bites |

---

## B · Neon database

### B1. Two URLs, and why

| Variable | Endpoint | Used by |
| --- | --- | --- |
| `DATABASE_URL` | **Pooled** — hostname contains `-pooler` | The running app |
| `DIRECT_URL` | **Direct** — no `-pooler` | The Prisma CLI (migrations) |

The app uses the pooled endpoint because Neon runs PgBouncer there, which is
what lets many short-lived requests share a small number of real database
connections.

Migrations must use the **direct** endpoint. A migration takes a session-level
advisory lock and runs statements that have to stay on one backend; a
transaction-mode pooler is free to hand them to different backends, which
corrupts the migration halfway through. `prisma.config.ts` already points the
CLI at `DIRECT_URL` — you do not have to remember this, but you do have to keep
both variables set.

**Do not add `?options=-c statement_timeout=...` to either URL.** A pooled Neon
endpoint rejects the entire connection with error `08P01`, taking the whole site
down. Those timeouts are set on the database itself by migration
`20260730170000_session_timeouts`.

### B2. Migrations

**Migrations are the source of truth. Never `prisma db push` in production.**

`db push` compares your schema file to the live database and mutates the live
database until they match. It writes no migration file, so nothing records what
happened, the next real migration has no idea what state it is starting from,
and `db push` will happily **drop a column** — with your customers' data in it —
to make the shapes agree. It is a scratchpad tool for local experiments.

Check what is applied:

```bash
npx prisma migrate status
```

You want: `Database schema is up to date!`

Apply pending migrations:

```bash
npm run db:migrate
```

That runs `prisma migrate deploy`, which only ever applies migration files that
already exist. It never invents a change and never drops anything you did not
write down.

### B3. Safe migration procedure

1. **Back up first.** Neon → your project → **Branches** → create a branch from
   `main`. That is a copy-on-write snapshot and it takes seconds. This is your
   undo button.
2. Apply: `npm run db:migrate`
3. Verify: `npx prisma migrate status`
4. Check the site still loads.

If it goes wrong, you restore by pointing `DATABASE_URL`/`DIRECT_URL` at the
branch you made in step 1.

### B4. What not to do

| Never | Why |
| --- | --- |
| `prisma db push` against production | Silently drops columns and data |
| `npm run db:reset` against production | Deletes everything. It is a local tool |
| Edit or delete an applied migration file | Prisma checksums them; the next deploy refuses to run |
| Edit rows by hand in Studio to "fix" something | The app invalidates its caches on writes made *through the app*. A hand edit shows up whenever the cache happens to expire |
| Point `DATABASE_URL` at the direct endpoint | Works, then exhausts connections under load |

---

## C · VPS deployment

### C1. The safe sequence

Run these in order. The order is not cosmetic — see [C4](#c4--why-the-order-matters).

```bash
# 1 — connect
ssh you@your-vps

# 2 — go to the project
cd /path/to/flazz-group

# 3 — STOP THE APP FIRST. This step is the one people skip.
pm2 stop flazz-group          # or: sudo systemctl stop flazz-group

# 4 — get the new code
git pull

# 5 — install any new dependencies
npm ci

# 6 — apply database migrations, BEFORE the build (see below)
npm run db:migrate

# 7 — build, with nothing serving
npm run build

# 8 — start again
pm2 start flazz-group         # or: sudo systemctl start flazz-group

# 9 — check it came up
curl -sI http://127.0.0.1:3000/ | head -1        # expect: HTTP/1.1 200 OK
```

Or as one line, which is what you will actually paste:

```bash
pm2 stop flazz-group && git pull && npm ci && npm run db:migrate && npm run build && pm2 start flazz-group
```

**Why migrations come before the build, not after.** `next build` is not a pure
compile step on this project — it queries Neon, to prerender every published
article and to read the settings row for titles and metadata. Those queries are
issued by the Prisma client that `npm run build` has just regenerated from the
*new* `schema.prisma`. So if the schema adds a column and the migration has not
run yet, the build asks the database for a column that does not exist and fails
outright, with a Postgres error that says nothing about deploy ordering.

Migrating first means the database is always at or ahead of the code that is
about to query it, which is the direction that works. It is also why a failed
`db:migrate` should stop the deploy: there is no point building against a schema
you could not apply.

**Why the stop comes before `git pull` and `npm ci`, not after.** Only the build
genuinely corrupts a running deploy (§ C4), but `npm ci` deletes `node_modules`
and recreates it — doing that underneath a live process gives you a site throwing
module-not-found errors for however long the install takes. Stopping first costs
the same downtime and removes the whole window.

**If the build fails, the site stays down.** That is the trade-off of stopping
first, and it is the right one: a failed build with the old process still running
is how you end up serving a mix of old and new. Either fix the error and re-run,
or roll back (§ C3). To avoid the surprise entirely, run `npx tsc --noEmit` and
`npm run lint` on your laptop before pushing — a build that passes locally
almost always passes on the VPS. The exception is the database being
unreachable, because the build queries Neon to prerender articles.

### C2. Verify the deploy from outside

```bash
curl -sI https://www.flazzgroup.com/               | head -1   # 200
curl -s  https://www.flazzgroup.com/robots.txt                 # sitemap line present
curl -s  https://www.flazzgroup.com/sitemap.xml | head -20     # URLs, all www
curl -sI https://www.flazzgroup.com/admin/login    | head -1   # 200
curl -sI https://www.flazzgroup.com/blog           | head -1   # 200
```

Then in a browser: open the homepage, open one article, sign in to `/admin`.

Logs:

```bash
pm2 logs flazz-group --lines 100
# or
sudo journalctl -u flazz-group -n 100 --no-pager
```

### C3. If a deploy goes wrong

```bash
pm2 stop flazz-group
git log --oneline -5                # find the previous good commit
git checkout <previous-good-sha>
npm ci
npm run build
pm2 start flazz-group
```

Code rolls back cleanly. **Database migrations do not** — if the bad deploy
included a migration, restore from the Neon branch you made in [B3](#b3--safe-migration-procedure).

### C4 · Why the order matters

**Building while the app is running produces a broken or stale deploy. This was
reproduced during the audit, on this project, deliberately.**

What happened: source files were edited, `npm run build` was run with
`next start` still alive, the build reported success — and the running site kept
serving the **old** output. The rebuilt files were on disk. The process served
the previous version anyway. Running the same build with the server stopped
produced the correct output immediately.

The mechanism is that `next build` rewrites `.next/` in place while `next start`
is reading from it. Depending on timing you get stale pages, a mix of old and
new, or genuinely broken HTML served with no styling at all — and nothing errors,
so you find out from a customer.

**Rule: stop, migrate, build, start. Never build against a running server.**

If a deploy ever looks half-applied, the reliable cure is a clean rebuild:

```bash
pm2 stop flazz-group
rm -rf .next
npm run build
pm2 start flazz-group
```

#### The other half of `.next`: the data cache survives deploys

`.next` holds two different things, and only one of them is rebuilt.

`.next/server` is compiled output and prerendered HTML — a build replaces it.
`.next/cache` is the **data cache**, where every `unstable_cache` query result is
stored, and a build deliberately preserves it: that is what makes rebuilds fast.

The consequence is that a cached query result can outlive any number of deploys.
Until this audit those entries had no expiry to speak of — Next stores an
unbounded `unstable_cache` entry with a one-year lifetime — and they are only
dropped early when an admin save calls `revalidateTag` on the process holding
them. A database change made any other way is invisible to that.

This was not hypothetical. Building this project from a clean checkout produced a
homepage and footer advertising two brands that had been deleted from the
database months earlier, linking out to their sites and naming them in the
Organization schema. `lib/queries.ts` now caps every one of those entries at an
hour, so the worst case is an hour rather than a year.

You still do not have to think about this day to day — saving in `/admin` purges
instantly, as it always did. It matters in exactly two situations:

- **You changed content outside the panel** — restored a Neon backup, ran SQL by
  hand, edited a row in Neon's console. Either wait an hour, or force it:
  ```bash
  pm2 stop flazz-group && rm -rf .next && npm run build && pm2 start flazz-group
  ```
- **The site shows content you know is gone.** Same cure. Check the database
  first so you are not chasing a cache that is telling the truth.

One more trap, and it is the reason the "reproduced during the audit" paragraph
above exists twice over: `next dev` and `next build` share `.next/cache`. Running
a build on a machine where a dev server is live lets the dev server's stale
entries end up baked into the prerendered HTML. On the VPS this is the same rule
as before — stop the app first — but it is worth knowing if you ever build on a
laptop that has `npm run dev` open in another terminal.

### C5. Process manager

Run `npm start` under PM2 or systemd so it restarts on crash and on boot.

**Use exactly one instance** — `pm2 start npm --name flazz-group -- start`, not
cluster mode, not `-i max`. Two things in this app live in the memory of one
process:

- **The rate limiter.** Two instances mean two independent counters, so the
  login limit is effectively doubled.
- **Cache invalidation.** When you save an article, the app purges its cached
  HTML. It purges it *in the instance that handled the save*. Other instances go
  on serving the old page until their own timer expires — which looks exactly
  like "my edit did not save".

If you ever genuinely need more than one instance, both of those need moving to
shared storage first. Until then, one instance is the correct configuration, not
a limitation.

### C6. Environment variables on the VPS

They live in `.env` in the project directory. After changing any of them:

```bash
pm2 restart flazz-group
```

A change to a `NEXT_PUBLIC_*` variable additionally needs a **rebuild**, because
those are compiled into the browser bundle:

```bash
pm2 stop flazz-group && npm run build && pm2 start flazz-group
```

Confirm `TRUSTED_PROXY="cloudflare"` is set. See [D5](#d5--lock-the-origin-to-cloudflare) —
that value is only true once the origin is firewalled.

---

## D · Cloudflare

### D1. DNS

| Type | Name | Content | Proxy |
| --- | --- | --- | --- |
| `A` | `@` | your VPS IP | **Proxied** (orange cloud) |
| `A` | `www` | your VPS IP | **Proxied** (orange cloud) |

The orange cloud is what puts Cloudflare in the request path. Grey cloud means
DNS only — visitors hit your VPS directly, and you lose the CDN, the TLS
termination and the firewall all at once.

The canonical host is `www`. Add a redirect rule so the apex does not serve a
duplicate copy of the site:

**Rules → Redirect Rules** → if hostname equals `flazzgroup.com`, then
**301** to `https://www.flazzgroup.com/${http.request.uri.path}`.

### D2. SSL/TLS

- **SSL/TLS → Overview → Full (strict)**. Not "Flexible" — Flexible sends
  unencrypted traffic from Cloudflare to your VPS and creates redirect loops.
- **Edge Certificates → Always Use HTTPS: On**
- **Edge Certificates → Automatic HTTPS Rewrites: On**

The app already sends an HSTS header, so once this is right browsers stop trying
`http://` at all.

### D3. Caching — what should and should not be cached

By default Cloudflare caches static assets (JS, CSS, images) and **does not**
cache HTML. That default is safe and this app is built for it.

| Path | Cache? | Why |
| --- | --- | --- |
| `/_next/static/*` | Yes, aggressively | Content-hashed filenames — a change makes a new URL |
| Images from Cloudinary | Yes | Cloudinary's own CDN handles this |
| `/`, `/blog/*`, `/about` … | Cloudflare default is fine | Next already sends the right `s-maxage` |
| `/blog` (the archive) | Not cached | It reads `?q=`, `?kategori=`, `?page=`, so it is dynamic by nature |
| `/admin/*` | **Never** | Sends `Cache-Control: private, no-store` |
| `/api/*` | **Never** | Same |

**If you turn on "Cache Everything", you must exclude `/admin/*` and `/api/*`.**
The app now sends `private, no-store` and `CDN-Cache-Control: private, no-store`
on both, which Cloudflare honours — but a "Cache Everything" rule set to
*override* origin headers would ignore that and put a login page in the edge
cache. Do not do that.

#### Optional: caching public HTML at the edge

Measured during this audit: every HTML response comes back `cf-cache-status:
DYNAMIC`, including the homepage. The origin is sending `Cache-Control:
s-maxage=300, stale-while-revalidate=31535700` and Cloudflare is ignoring it,
because **Cloudflare does not cache `text/html` unless you tell it to** — no
amount of `s-maxage` changes that on its own.

Nothing is broken. Next's own ISR cache means those requests are answered from
disk without touching Neon, so the origin is cheap. But every visitor still pays
a round trip to Singapore instead of to their nearest Cloudflare edge, and that
round trip is the largest single component of TTFB on this site.

If you want it, the safe shape is a **Cache Rule**, not "Cache Everything":

> Cloudflare → **Caching → Cache Rules → Create rule**
>
> **If** — `URI Path` does *not* start with `/admin` **and** `URI Path` does not
> start with `/api`
>
> **Then** — Eligible for cache; **Edge TTL:** *Use cache-control header if
> present, otherwise 5 minutes*; **Browser TTL:** *Respect origin*

Two things make this safe rather than reckless, and both are already true of the
app: the admin and API paths are excluded by the rule *and* send `no-store`
independently, and nothing on a public page varies per visitor — there is no
logged-in state outside `/admin`.

Two things to know before switching it on. **Content edits stop being instant at
the edge:** saving in `/admin` purges Next's cache, not Cloudflare's, so a change
takes up to the edge TTL to appear unless you purge (§ D4). And **`/blog` will
not be cached anyway** — it sends `private, no-store` because it reads `?q=`,
`?kategori=` and `?page=`, so it is dynamic by construction.

Leave the default if that trade is not worth it. `DYNAMIC` is a working
configuration, not a fault.

### D4. Purging the cache

**Caching → Configuration → Purge Cache.**

- **Purge Everything** after a deploy that changed the design or the layout.
- **Custom Purge** by URL for a single page.

You usually do not need to purge for a content edit: the app invalidates its own
cache when you save in `/admin`, and Cloudflare is not caching those HTML pages
by default anyway.

Check whether a response came from the edge:

```bash
curl -sI https://www.flazzgroup.com/ | grep -i "cf-cache-status\|cf-ray"
```

| `cf-cache-status` | Meaning |
| --- | --- |
| `HIT` | Served from Cloudflare |
| `MISS` | Fetched from your VPS, now cached |
| `DYNAMIC` | Not cached — normal for HTML on the default configuration |
| `BYPASS` | A rule or a `no-store` header told Cloudflare not to cache |
| `EXPIRED` | Was cached, went stale, revalidated |

`DYNAMIC` on your pages is **not a fault**. It means Cloudflare is applying its
default of not caching HTML.

### D5 · Lock the origin to Cloudflare

This one matters for security, not for speed.

`TRUSTED_PROXY="cloudflare"` tells the app to believe the `CF-Connecting-IP`
header when deciding who is making a request. Cloudflare always overwrites that
header, so it cannot be faked *through* Cloudflare. It can be faked by anyone
who connects to your VPS's IP address directly and sets the header themselves —
and that gets them unlimited admin password guesses, because every attempt looks
like a different visitor.

So do one of these:

```bash
# allow web traffic only from Cloudflare, deny everything else
# (the current ranges are published at https://www.cloudflare.com/ips/)
sudo ufw allow from <each-cloudflare-range> to any port 443 proto tcp
sudo ufw deny 443/tcp
sudo ufw deny 80/tcp
```

…or run `cloudflared` and expose no public port at all.

**Verify from a machine that is not your VPS:**

```bash
curl -sI --max-time 5 http://<your-vps-ip>/
```

Hanging or refused is correct. An HTTP response means the origin is exposed.

---

## E · Cloudinary

### E1. How uploads work

You upload through the admin panel; there is no reason to use the Cloudinary
dashboard directly. Images land under:

```
flazzgroup/banner/     hero slider
flazzgroup/blog/       article featured images
flazzgroup/brand/      brand logos
flazzgroup/payment/    payment method logos
flazzgroup/logo/       site logo
flazzgroup/favicon/    favicon
```

Limits: **5 MB**, and PNG, JPG, WEBP, AVIF or SVG only. The server checks the
actual bytes of the file, not what the filename or the browser claims, so
renaming `evil.html` to `photo.png` does not get it through.

### E2. Filenames are SEO

**The uploaded filename becomes the URL.** `cara-top-up-royal-dream-qris.png`
stays `cara-top-up-royal-dream-qris.png` — it is not replaced with a random ID.
Google Images reads that.

So rename your file **before** uploading:

- ✅ `top-up-royal-dream-via-pulsa-telkomsel.png`
- ❌ `IMG_20260812_094512.png`
- ❌ `Screenshot 2026-08-12 at 09.45.12.png`

Lowercase, hyphens between words, describe what is in the picture, include the
keyword when it is honest to do so.

### E3. Transformations happen automatically

You upload one image. The site delivers whatever each visitor needs:

```
https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto,w_1200,c_limit/v123/flazzgroup/blog/your-image.png
                                                └──────────────┬──────────────┘
                                                    added automatically
```

- `f_auto` — sends AVIF or WebP to browsers that accept them, PNG to those that
  do not
- `q_auto` — picks a quality that still looks right
- `w_…,c_limit` — scales **down** to the size actually displayed, never up

This is why you should upload the **large original** and let Cloudinary shrink
it. A 2 MB source PNG is delivered as a ~120 KB WebP.

### E4. Replacing an image

Upload the new one through the admin panel and save. The record points at the
new URL.

The old file stays in Cloudinary. That is deliberate — deleting it immediately
would break any page still serving the cached old HTML. Clean up old files from
the Cloudinary **Media Library** later, once you are sure nothing references
them.

**Before deleting anything from Cloudinary, search the Media Library for the
filename and check nothing in the panel still uses it.** A deleted image that is
still referenced becomes a broken picture on a live page.

### E4b. Files nothing points at any more

```bash
npm run media:orphans              # list them; changes nothing
npm run media:orphans -- --delete  # remove them, after you have read the list
```

An orphan is a file this app uploaded whose row nothing references any more —
an upload that succeeded at Cloudinary and then failed to record itself, or an
image whose owning row was deleted before the reference check covered every
place an image can be used.

Listing is the default and deleting needs the flag on purpose. Media is the one
thing in this system with no undo: the database has Neon's branch history and
the code has git, but a destroyed Cloudinary asset is gone. **Read the list
before you pass `--delete`** — a name you recognise is a reason to stop and find
out why nothing references it, not a reason to proceed.

Files added through the Cloudinary dashboard rather than the admin panel have no
row here. They are never listed and never at risk.

This audit found ten: 8×8 and 10×10 pixel probes named `h-b.svg`, `h-k.jpg`,
`adv-probe-lied.png` and similar, all uploaded on 2 August 2026 while the upload
validation was being tested. About 1 KB in total. They were left in place —
deleting from a production account is your call, not an audit's.

### E5. Test the whole pipeline

```bash
npm run media:check
```

Uploads a test file, checks the SEO filename survived, checks collisions
resolve, checks transformations serve, checks WebP/AVIF negotiation, then
deletes what it made. It touches nothing of yours.

---

## F · Admin panel

### F1. Roles

| Role | Can do |
| --- | --- |
| **SUPER_ADMIN** | Everything: articles, banners, brands, payments, chat — **plus** website settings, SEO, analytics IDs and user accounts |
| **ADMIN** | Day-to-day content: articles, banners, brands, payments, FAQ, the chat widget. **Cannot** touch settings, SEO, analytics or users |

SUPER_ADMIN-only areas are `/admin/settings` and `/admin/users`. An ADMIN who
opens one gets a "not allowed" screen and the attempt is written to the audit
log.

Give customer-service staff **ADMIN**. Keep SUPER_ADMIN for yourself. The split
exists so a compromised staff account cannot change your canonical domain or
read your analytics keys.

### F2. Accounts

- **First account:** created by `npm run db:seed` from `ADMIN_EMAIL` /
  `ADMIN_PASSWORD` in `.env`.
- **More accounts:** `/admin/users` → **Add user** (SUPER_ADMIN only).
- **Forgot the password:** change `ADMIN_PASSWORD` in `.env` and re-run
  `npm run db:seed`. Re-seeding updates the password for that email; it does not
  wipe your content.
- **Sessions** last 8 hours, then you sign in again.
- **Login is rate limited** to 10 attempts per 15 minutes.

Use a long, unique password. This account can edit everything the public sees.

### F3. What each screen does

| Screen | Controls |
| --- | --- |
| **Dashboard** | Recent activity |
| **Blog** | Articles — write, edit, schedule, publish |
| **Blog taxonomy** | Categories, tags, authors |
| **Banners** | Homepage hero slider |
| **Brands** | Partner brand logos and links |
| **Products** | Coin packages and prices |
| **Popular / Features / Hero stats** | Homepage sections |
| **Payments** | Accepted payment method logos |
| **FAQ** | Homepage FAQ (this is also structured data) |
| **Community** | Telegram/WhatsApp group links |
| **Chat** | The floating support widget |
| **Settings** | Site name, URL, SEO defaults, social image, analytics IDs — **SUPER_ADMIN** |
| **Users** | Admin accounts — **SUPER_ADMIN** |

Most list screens support drag-and-drop reordering, and the order is what
visitors see.

### F4. The setting to be careful with

**Settings → Site URL** must stay `https://www.flazzgroup.com`.

It is the single source for every canonical tag, the sitemap, robots.txt, the
Open Graph URLs and the structured data. Changing it to the non-`www` version,
or to `http://`, re-points all of them at a domain that then redirects — and
Google treats "canonical points somewhere that redirects" as a reason to
de-index the page.

---

## G · SEO operations

### G1. Publishing an article, in order

1. **Pick one keyword.** One article, one primary search phrase. Two articles
   aimed at the same phrase compete with each other and both lose.
2. **Title** — put the keyword near the front. Aim for **50–60 characters**;
   above roughly 60 Google truncates it in results. The site appends
   `| FLAZZ GROUP` automatically, so leave room for it.
3. **Slug** — short, lowercase, hyphens, contains the keyword.
   `cara-top-up-royal-dream`, not `artikel-1`.
4. **Meta description** — **140–160 characters**. This is advertising copy, not
   a summary: it does not affect ranking, it affects whether anyone clicks.
   Include the keyword; end with a reason to click.
5. **Excerpt** — the card text on the blog listing.
6. **Featured image** — rename the file before uploading (see [E2](#e2--filenames-are-seo)),
   then write **alt text** that describes the picture in a sentence. Not
   `image1`. Not a pile of keywords.
7. **Category** — exactly one. Tags — two or three.
8. **Body structure:**
   - The page's `<h1>` is generated from your title. **Do not add another H1.**
   - Section headings are **H2**. Sub-points are **H3**. Never skip a level.
   - Short paragraphs. Lists where the content is a list.
9. **Internal links — the step people skip.** Every new article should link to
   **2–4 existing articles** and to **at least one commercial page**
   (the homepage or a product section). Use descriptive anchor text —
   "panduan top up Royal Dream", never "klik di sini".
10. **Publish**, or set a future date to schedule it. Scheduled articles become
    visible on their own; you do not have to come back.

### G2. After publishing — verify, do not assume

```bash
# the page is live
curl -sI https://www.flazzgroup.com/blog/your-slug | head -1        # 200

# canonical points at itself
curl -s https://www.flazzgroup.com/blog/your-slug | grep -o '<link rel="canonical"[^>]*>'

# it is indexable
curl -s https://www.flazzgroup.com/blog/your-slug | grep -o '<meta name="robots"[^>]*>'
# want: index, follow

# it is in the sitemap
curl -s https://www.flazzgroup.com/sitemap.xml | grep your-slug
```

Then paste the URL into the **Rich Results Test**
(https://search.google.com/test/rich-results) — it should find `BlogPosting`
and `BreadcrumbList` with no errors.

### G3. Sitemap and robots

Both are generated; there is no file to edit.

- `https://www.flazzgroup.com/sitemap.xml` — homepage, `/blog`, the four static
  pages, every category with articles, every published article, plus one image
  per article
- `https://www.flazzgroup.com/robots.txt` — allows everything except `/admin`
  and `/api`, and points at the sitemap

A new article appears in the sitemap within about five minutes of publishing.

#### The image in the sitemap is the one on the page

Worth knowing before you "tidy" anything here. Each article entry carries one
`<image:loc>`, and it is not the stored original — it is the exact delivery URL
the page renders, transformation string and all. For an article that is the
`f_auto,q_auto,w_1200,c_limit` variant, which is byte-for-byte one of the entries
in that page's `srcset`; for the homepage it is the `f_jpg,…` variant, because the
site card only ever appears as `og:image` and that is the form it takes there.

The point of the exercise is that Google is being told "this image belongs to
this page" about a URL that genuinely appears in that page's HTML. Nominating the
bare original instead — which is what happened before, and separately for the
homepage until this audit — asks Google to associate a page with an image it
cannot find in it, and hands crawlers a 2 MB PNG with no format negotiation.

#### Why the served robots.txt is longer than the one this app generates

`curl https://www.flazzgroup.com/robots.txt` returns considerably more than the
four lines above, and nothing in this repository produces the extra part.

**Cloudflare injects it.** The managed block — the `Content-Signal` header
comment, then `User-agent: *` with `Content-Signal: search=yes,ai-train=no,use=reference`,
then a list of AI crawlers each given `Disallow: /` — is added at the edge by
Cloudflare's **AI Crawl Control → Manage robots.txt** feature. The final document
is Cloudflare's block, then this app's, concatenated:

```
# BEGIN Cloudflare Managed content
User-agent: *
Content-Signal: search=yes,ai-train=no,use=reference
Allow: /
User-agent: GPTBot
Disallow: /
… Amazonbot, Applebot-Extended, Bytespider, CCBot, ClaudeBot,
  CloudflareBrowserRenderingCrawler, Google-Extended, meta-externalagent …
# END Cloudflare Managed Content

User-Agent: *          ← everything from here down is app/robots.ts
Allow: /
Disallow: /admin
Disallow: /api

Sitemap: https://www.flazzgroup.com/sitemap.xml
```

**This does not harm search.** Two things are worth being precise about, because
the file looks alarming at a glance:

- The two `User-agent: *` groups are **merged**, not fought over. RFC 9309 and
  Google's parser both combine groups that name the same user agent, so the
  effective policy is "allow everything except `/admin` and `/api`". Duplication
  is untidy rather than dangerous.
- **Not one search crawler is blocked.** Googlebot, Bingbot, DuckDuckBot,
  Applebot, Yandex and Baidu are all unrestricted. The blocked list is entirely
  AI training and inference agents. `Google-Extended` in particular governs
  Gemini grounding and training only — Google documents that it has no effect on
  Search ranking or inclusion — and `Applebot-Extended` is Apple Intelligence
  training, not the `Applebot` that feeds Siri and Spotlight.

What the current setting *does* cost is AI-assistant visibility: ChatGPT
(`GPTBot`), Claude (`ClaudeBot`), Perplexity and others are told not to read the
site, so the blog will not be cited in their answers. That is a business
decision, not a bug — leave it if you want the content kept out of AI training,
change it if being quoted by assistants is worth more to you than that.

**Change it at the right layer.** Editing `src/app/robots.ts` cannot remove the
Cloudflare block; the edge will keep prepending it. To change that half:

> Cloudflare dashboard → your domain → **AI Crawl Control** → **Manage robots.txt**
> — turn the managed file off entirely, or edit which crawlers it lists.

Then re-check with `curl https://www.flazzgroup.com/robots.txt` and confirm the
`Sitemap:` line is still the last thing in the file.

---

## H · Google Search Console

### H1. Set-up

1. https://search.google.com/search-console → **Add property** → **URL prefix**
   → `https://www.flazzgroup.com` (with the `www` — it must match the canonical)
2. Verify. The easiest route: **Settings → Analytics → Google site verification**
   in this admin panel, paste the code, save. The tag is then on every page.
3. **Sitemaps → Add a new sitemap →** `sitemap.xml` → Submit.

### H2. Getting a new article looked at

**URL Inspection** (the search bar at the top) → paste the full URL → Enter.

- **"URL is not on Google"** → **Request Indexing**. Once. Requesting twice does
  not make it faster.
- **"URL is on Google"** → done.

Then wait. Indexing takes days to weeks for a young site. Requesting again does
not speed it up.

### H3. Reading the reports

**Pages** (under Indexing) — how many URLs are indexed and why the rest are not.

| Status | What it means | Do what |
| --- | --- | --- |
| **Indexed** | It is in | Nothing |
| **Discovered – currently not indexed** | Google knows the URL, has not prioritised crawling it | See [H4](#h4--discovered--currently-not-indexed) |
| **Crawled – currently not indexed** | Google read it and judged it not worth indexing yet | Improve the content; add internal links |
| **Page with redirect** | Expected for `?page=1`, `?q=` and similar | Nothing |
| **Excluded by 'noindex'** | Expected for search-result URLs | Nothing |
| **Duplicate, Google chose different canonical** | Investigate — two pages saying the same thing | Merge or differentiate |

**Performance** — Impressions (how often you appeared), Clicks, CTR
(clicks ÷ impressions), Average position.

How to read it:

- **High impressions, low CTR** → you rank but nobody clicks. Rewrite the title
  and meta description.
- **Position 11–20** → page two. These are your best opportunities: add internal
  links to that page and extend the content.
- **Low impressions everywhere** → not enough content or not enough authority
  yet. Publish more and earn links.

### H4 · "Discovered – currently not indexed"

You will see this, and it is the status that causes the most unnecessary panic.

It means: **Google knows the URL exists and has chosen not to crawl it yet.**
It is a scheduling decision, not an error, and it is overwhelmingly the normal
state for a site that is a few months old with a handful of articles.

The technical checks were all run against this site during the audit and all
passed — pages return 200, canonicals point at themselves, robots says
`index, follow`, everything is in the sitemap, every article has 5–6 internal
links, and the structured data is valid. **There is no technical fault to fix.**

What actually moves it:

1. **More articles, published steadily.** Crawl budget follows sites that
   reliably have new things.
2. **Internal links** from your existing pages to the new one.
3. **External links.** One mention from a real Indonesian gaming site or forum
   does more than any change in this repository can.
4. **Time.** Weeks, not days.

What does **not** help: requesting indexing repeatedly, resubmitting the
sitemap, adding more markup, or changing the canonical.

---

## I · Analytics

### I1. What is wired up

All IDs go in **Settings → Analytics** (SUPER_ADMIN), or as environment
variables as a fallback. Nothing loads until the visitor accepts the consent
banner.

| Tool | Setting |
| --- | --- |
| Google Tag Manager | `NEXT_PUBLIC_GTM_ID` |
| GA4 | `NEXT_PUBLIC_GA4_ID` — **only if you have no GTM container** |
| Meta Pixel | `NEXT_PUBLIC_META_PIXEL_ID` |
| Meta Conversions API | `META_ACCESS_TOKEN` — server-side, never `NEXT_PUBLIC_` |
| Google Ads | `NEXT_PUBLIC_GOOGLE_ADS_ID` + `..._CONVERSION_LABEL` |
| Clarity | `NEXT_PUBLIC_CLARITY_ID` |

**Do not set both GTM and GA4.** GA4 belongs *inside* your GTM container.
Running both counts every page view twice, and you will spend a week wondering
why your traffic doubled.

### I2. Conversions

These fire as conversions: **contact_whatsapp**, **contact_telegram**,
**support_chat_action** — a visitor reaching out is the goal of this site.

Meta receives each one **twice on purpose** — once from the browser pixel, once
from your server via the Conversions API. The browser copy is blocked for a
large share of real visitors by ad blockers and iOS; the server copy fills that
in. Both carry the same `event_id`, and Meta collapses them into one. This is
the correct setup, not a bug.

### I3. Checking for duplicate conversions

**Meta** — Events Manager → your pixel → **Overview**. Look for the
**"Deduplicated"** label on Contact/Lead events. If you see a warning about
redundant events, the `event_id` is not matching; that is a real problem.

**Google Ads** — Tools → Conversions → your action → **"Count"** should be
**"One"** for contact conversions, not "Every". Set to "Every", one visitor
messaging you twice is counted as two conversions and the campaign optimises
toward a number that is not real.

**GA4** — Reports → Realtime. Click a WhatsApp button on the live site and watch
for exactly **one** `contact_whatsapp`. Two means something is double-firing.

**Do not send test conversions to a live ad account** unless you have to. Use
`META_TEST_EVENT_CODE` for Meta, which routes events to Events Manager → Test
Events instead of your real reporting. Remove it when finished.

---

## J · Troubleshooting

| Problem | Likely cause | How to verify | How to fix |
| --- | --- | --- | --- |
| **`P1001: Can't reach database server`** | Broken IPv6 locally, or Neon suspended | `npx prisma migrate status` | Use the `npm run db:*` scripts (they disable IPv6 auto-select). Otherwise open the Neon dashboard to wake the project |
| **Neon connection failures under load** | Pool too large, or using the direct URL for the app | Neon → Monitoring → connections | `DATABASE_URL` must be the **`-pooler`** endpoint. Lower `DB_POOL_MAX` |
| **Migration fails halfway** | Ran against the pooled endpoint, or a hand-edited migration file | `npx prisma migrate status` | Never edit applied migrations. Restore the Neon branch from [B3](#b3--safe-migration-procedure), fix the file, re-run |
| **`prisma migrate` says "drift detected"** | Someone ran `db push` or changed the DB by hand | `npx prisma migrate status` | Do not "resolve" blindly. Work out what changed, write a real migration |
| **Cloudinary upload fails** | Missing/wrong credentials, or file over 5 MB | `npm run media:check` | Fix the three `CLOUDINARY_*` variables, then `pm2 restart flazz-group` |
| **Images broken on the live site** | Asset deleted from Cloudinary, or the record points at a stale URL | Open the image URL directly | Re-upload through the panel. Never delete from Cloudinary without checking references ([E4](#e4--replacing-an-image)) |
| **Sitemap empty or missing articles** | Articles are drafts, scheduled, or flagged noIndex | `curl -s https://www.flazzgroup.com/sitemap.xml` | Only published, past-dated, indexable articles are listed. That is correct behaviour |
| **robots.txt shows the wrong domain** | Settings → Site URL is wrong | `curl -s https://www.flazzgroup.com/robots.txt` | Set it back to `https://www.flazzgroup.com` ([F4](#f4--the-setting-to-be-careful-with)) |
| **500 errors on the site** | App crash, or database unreachable | `pm2 logs flazz-group --lines 100` | Read the log. Usually Neon suspended or a missing env var |
| **`npm run build` fails** | Type error, lint error, or DB unreachable at build time | `npx tsc --noEmit` then `npm run lint` | Fix what it names. The build reads the database to prerender articles, so `DATABASE_URL` must work |
| **Deploy done, site unchanged** | **Built while the server was running** | Compare the page against your edit | Stop → `rm -rf .next` → build → start ([C4](#c4--why-the-order-matters)) |
| **Site unstyled / broken CSS after deploy** | Same cause | View source, check the CSS 404s | Same fix, then purge Cloudflare |
| **Old content still showing** | Cloudflare edge cache | `curl -sI <url> \| grep cf-cache-status` | Purge Everything in Cloudflare |
| **Cloudflare redirect loop** | SSL mode is "Flexible" | SSL/TLS → Overview | Set **Full (strict)** ([D2](#d2--ssltls)) |
| **Cannot log in to /admin** | Wrong password, or rate limited | Look for HTTP 429 | Wait 15 minutes, or reset via `.env` + `npm run db:seed` ([F2](#f2--accounts)) |
| **Visitors get 429 / "too many attempts"** | `TRUSTED_PROXY` unset, so everyone shares one bucket | `grep TRUSTED_PROXY .env` | Set `TRUSTED_PROXY="cloudflare"`, restart, and firewall the origin ([D5](#d5--lock-the-origin-to-cloudflare)) |
| **Hydration error in the browser console** | Server and client HTML disagree — often a date or a random value | Reproduce with `npm run dev`, read the diff it prints | Fix the mismatch. Do not suppress the warning |
| **New article not appearing on the blog** | Still a draft, or scheduled for later | Check status and publish date in `/admin/blog` | Publish it, or wait for the scheduled time (visible within ~5 minutes) |
| **Article not indexed by Google** | Almost always normal for a young site | Search Console → URL Inspection | See [H4](#h4--discovered--currently-not-indexed). Do not manufacture a technical fix |
| **Conversions counted twice** | GTM *and* GA4 both configured, or Ads "Count" set to "Every" | GA4 Realtime; Ads → Conversions | Remove one of GTM/GA4. Set Ads count to "One" ([I3](#i3-checking-for-duplicate-conversions)) |

---

## K Cheat code for update

Step 1 — On your laptop: commit and push

cd "c:/Users/whosl/Downloads/flazz group baru"
git add -A
git commit -m "Add static pages, fix image delivery in sitemap/schema/social cards"
git push origin main
Pushing does not update the live site. It only backs the code up to GitHub. The site changes in step 2.

Step 2 — On the VPS: deploy

ssh you@your-vps
cd /path/to/flazz-group

git pull
npm ci

pm2 stop flazz-group        # ← STOP FIRST. This is the step that matters.

npm run build
npm run db:migrate          # no-op this time, but harmless and keeps the habit

pm2 start flazz-group
Do not skip the pm2 stop. I hit this during the audit: building while the app runs makes the build report success while the site keeps serving the old version — or worse, serves pages with a stylesheet URL that no longer exists, so everything renders unstyled for up to an hour.

If anything looks half-applied afterwards: pm2 stop → rm -rf .next → npm run build → pm2 start.

Step 3 — Add the one new setting
This is separate from the code and easy to forget:


nano .env
# add:  TRUSTED_PROXY="cloudflare"
pm2 restart flazz-group
And confirm your origin is firewalled — from a machine that is not the VPS:


curl -sI --max-time 5 http://<your-vps-ip>/
It must hang or be refused. If it returns HTML, your VPS is reachable directly and cloudflare becomes a lie an attacker can exploit. Fix the firewall before setting this.

Step 4 — Verify

curl -sI https://www.flazzgroup.com/ | head -1                      # 200
curl -sI https://www.flazzgroup.com/about | head -1                 # 200 (new page)
curl -s https://www.flazzgroup.com/sitemap.xml | grep -c "f_auto"   # expect 5
curl -s https://www.flazzgroup.com/ | grep -o '<meta name="twitter:image"[^>]*>'
That last one should show f_jpg,q_auto,w_1200,c_limit — not a bare /upload/v…/ URL. Then purge the Cloudflare cache (Caching → Purge Everything), and resubmit sitemap.xml in Search Console so the corrected image URLs get picked up.

If it goes wrong

pm2 stop flazz-group
git log --oneline -5
git checkout <previous-good-sha>
npm ci && rm -rf .next && npm run build
pm2 start flazz-group
Safe to roll back freely here — no migration ran, so there's no database state to unwind.

Full version with troubleshooting is in TUTOR.md § C. Want me to run the commit and push for you? The SSH part you'll need to do yourself since I can't reach the VPS.

## The five things that actually matter

1. **Stop the app before you build.** Everything else in section C is detail;
   this is the one that silently ships a broken site.
2. **`TRUSTED_PROXY="cloudflare"` *and* firewall the origin.** One without the
   other is either a lockout or a hole.
3. **Never `prisma db push` in production.** Migrations only.
4. **Site URL stays `https://www.flazzgroup.com`.**
5. **Rename image files before uploading.** The filename becomes the URL, and
   the URL is what Google Images reads.
