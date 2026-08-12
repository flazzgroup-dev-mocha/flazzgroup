# Deployment

Everything needed to take FLAZZ GROUP from an empty account to a live site.

Follow it top to bottom the first time. Nothing here assumes prior knowledge of
the project, and every value you need to create is named where you create it.

> ## Production runs on a VPS behind Cloudflare
>
> ```
> visitor → Cloudflare → VPS → Next.js → Neon / Cloudinary
> ```
>
> **Not Vercel.** Confirmed from the live site: responses carry
> `Server: cloudflare` and `CF-RAY`, and the origin returns Next's own
> `x-nextjs-cache` headers.
>
> **For day-to-day operation — deploying, Cloudflare, Cloudinary, the admin
> panel, SEO, Search Console, analytics and troubleshooting — use
> [TUTOR.md](./TUTOR.md).** It is written for the owner/operator and describes
> this architecture only.
>
> This document remains the *reference* for first-time setup of the external
> services (Neon, Cloudinary, environment variables) and for the deployment
> mechanics in § 4b. **§ 4 and § 5 describe a Vercel install and do not
> describe production** — they are retained only for someone standing this
> project up on that platform instead.

- [What you are deploying](#what-you-are-deploying)
- [Before you start](#before-you-start)
- [1 · Neon (database)](#1--neon-database)
- [2 · Cloudinary (images)](#2--cloudinary-images)
- [3 · Environment variables](#3--environment-variables)
- [4 · Vercel](#4--vercel) — *reference only, not production*
- [4b · VPS deployment](#4b--vps-deployment) — **this is production**
- [5 · Domain and DNS](#5--domain-and-dns) — *Vercel values; take DNS from Cloudflare*
- [6 · Database migration and seed](#6--database-migration-and-seed)
- [7 · First sign-in](#7--first-sign-in)
- [8 · Analytics](#8--analytics)
- [9 · Google Search Console](#9--google-search-console)
- [Post-deployment verification](#post-deployment-verification)
- [Rollback](#rollback)
- [Backups](#backups)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## What you are deploying

A Next.js 15 App Router site with a database-driven homepage, a blog, and an
admin panel at `/admin`. Three external services:

| Service | Holds | Failure impact |
| --- | --- | --- |
| **Neon** (Postgres) | All content, settings, accounts, audit log | Site returns 500 |
| **Cloudinary** | Every uploaded image | Images fail to load; pages still render |
| **The host** (see below) | The application | Site down |

Analytics providers are optional and fail silently — the site works without any
of them configured.

Everything else in this document — environment variables, Neon, Cloudinary,
migrations, first sign-in, analytics, Search Console and verification — applies
to the VPS deployment as written.

---

## Before you start

Have a **VPS** (Node 20+, a process manager, and a domain pointed at it through
**Cloudflare**), plus accounts for **Neon** and **Cloudinary**. Node 20+ locally
as well.

```bash
git clone <repository-url>
cd flazz-group
npm install
```

> **Windows note.** All `npm run db:*` scripts and `npm start` go through
> `scripts/db-cli.mjs`, which disables Node's IPv6 auto-selection. Neon publishes
> AAAA records, and on a machine with broken IPv6 the connection dies in under a
> second with `P1001` or a bare `ETIMEDOUT`. Use the npm scripts rather than
> calling `prisma` directly, and this never comes up.

---

## 1 · Neon (database)

1. [console.neon.tech](https://console.neon.tech) → **New Project**
2. Region: **AWS ap-southeast-1 (Singapore)** for an Indonesian audience
3. Postgres 16 or later
4. **Connection Details** → copy **two** strings:

| Copy this | With | Into |
| --- | --- | --- |
| Pooled connection (hostname contains `-pooler`) | ✅ Connection pooling | `DATABASE_URL` |
| Direct connection (no `-pooler`) | ❌ Connection pooling off | `DIRECT_URL` |

**Both are required, and swapping them breaks things in ways that do not point
at their cause.** The app uses the pooled endpoint because Neon runs PgBouncer
there, so many concurrent requests share a small number of real backends — which
matters on a single VPS process just as much as it would on a serverless
platform, because `DB_POOL_MAX` client sockets still sit in front of it.
Migrations use the direct endpoint
because they take a session-level advisory lock and run DDL that must stay on
one backend — a transaction-mode pooler can hand those to different server
connections and the migration hangs or half-applies.

**Do not add `?options=-c statement_timeout=…` to either.** A pooled Neon
endpoint rejects the entire connection with `08P01 unsupported startup
parameter`. That is not a degraded guard, it is a dead application. Those
timeouts are set on the database itself by migration
`20260730170000_session_timeouts`.

Keep `?sslmode=require` on both.

---

## 2 · Cloudinary (images)

1. [cloudinary.com](https://cloudinary.com) → sign up (the free tier is ample)
2. **Settings → API Keys**
3. Copy three values:

```
CLOUDINARY_CLOUD_NAME   the cloud name, e.g. dxxxxxxxx
CLOUDINARY_API_KEY      15-digit number
CLOUDINARY_API_SECRET   long random string — server-side only, never NEXT_PUBLIC_
```

No further configuration. Uploads create `flazzgroup/{banner,blog,brand,payment,logo,favicon}/`
on first use and keep their original filename, slugified — `promo-juli-2026.webp`,
not a UUID, because the filename is part of the URL a search engine reads.

Without these three the panel still runs, but every upload answers
*"Image hosting is not configured"*.

---

## 3 · Environment variables

`.env.example` is the annotated reference. Below is what production needs.

### Required — the site will not work without these

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon **pooled** connection string |
| `DIRECT_URL` | Neon **direct** connection string |
| `AUTH_SECRET` | 32+ random bytes — see below |
| `ADMIN_EMAIL` | Owner's email; becomes the SUPER_ADMIN account |
| `ADMIN_PASSWORD` | 12+ characters, unique to this site |
| `CLOUDINARY_CLOUD_NAME` | From step 2 |
| `CLOUDINARY_API_KEY` | From step 2 |
| `CLOUDINARY_API_SECRET` | From step 2 |
| `NEXT_PUBLIC_SITE_URL` | `https://yourdomain.com` — seeds the initial `siteUrl` |

Generate the auth secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

A short or missing `AUTH_SECRET` means **every session silently fails to
verify** — everyone appears signed out with nothing in the logs explaining why.

### Optional — analytics

All blank by default; each can also be set in **Admin → Website Settings →
Analytics**, where the database value wins. Full guide: [docs/analytics.md](docs/analytics.md).

```
NEXT_PUBLIC_GTM_ID                        GTM-XXXXXXX
NEXT_PUBLIC_GA4_ID                        G-XXXXXXXXXX  ← only if NOT using GTM
NEXT_PUBLIC_META_PIXEL_ID                 15-16 digits
NEXT_PUBLIC_CLARITY_ID                    short alphanumeric
NEXT_PUBLIC_GOOGLE_ADS_ID                 AW-123456789
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL   AbC-D_efGhIjKlMnOp
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION      Search Console token
META_ACCESS_TOKEN                         server-only, never NEXT_PUBLIC_
META_PIXEL_ID                             defaults to the public one
META_TEST_EVENT_CODE                      routes to Events Manager → Test events
```

> **Never set both `NEXT_PUBLIC_GTM_ID` and `NEXT_PUBLIC_GA4_ID`.** GA4 belongs
> inside the GTM container. Both loaded means every page view is counted twice
> and neither tool reports a conflict. The code guards against it, but pick one.

### Optional — infrastructure

| Variable | Default | Set it when |
| --- | --- | --- |
| `TRUSTED_PROXY` | `none` | **Required in production: `cloudflare`** — see below |
| `DB_POOL_MAX` | `10` | Keep `DB_POOL_MAX × instances` well under Neon's limit |
| `DB_POOL_IDLE_MS` | `30000` | |
| `DB_CONNECT_TIMEOUT_MS` | `10000` | |

**`TRUSTED_PROXY` decides which forwarding header identifies a caller for rate
limiting.** On this deployment — Cloudflare in front of a VPS — the correct
value is **`cloudflare`**, which trusts `CF-Connecting-IP`.

```
none         nothing in front (a directly exposed Node process, and local dev)
cloudflare   trust cf-connecting-ip          <- production value
vercel       trust x-vercel-forwarded-for    (not used here)
hops:1       one reverse proxy you run (nginx, Caddy, a load balancer)
hops:2       two, e.g. Cloudflare in front of your own nginx
```

Use `hops:2` instead if you have put nginx between Cloudflare and Node:
Cloudflare appends the visitor to `X-Forwarded-For` and nginx appends
Cloudflare's edge, so the visitor is the second entry from the right.

**Leaving it unset is not the cautious choice.** Unset means `none`, which means
no header is believed and every request in the world shares one rate-limit
bucket. That fails closed — safe — and it is operationally broken:

- the admin login allows 10 attempts per 15 minutes **per bucket**, so any
  visitor can lock the owner out of `/admin` with ten bad passwords;
- `/api/track` allows 60 events per minute **site-wide**, above which
  conversions are silently dropped.

**`cloudflare` is only true if the origin refuses non-Cloudflare traffic.**
`CF-Connecting-IP` cannot be forged *through* Cloudflare, and can be forged
trivially by anyone who reaches the VPS on its own IP. Firewall ports 80/443 to
[Cloudflare's published ranges](https://www.cloudflare.com/ips/), or run
`cloudflared` and expose nothing. Verify from another machine:

```bash
curl -sI --max-time 5 http://<your-vps-ip>/     # must hang or be refused
```

Declaring a proxy that is not there is what re-opens the brute-force bypass this
setting exists to close.

---

## 4 · Vercel

> **Reference only — this is not how flazzgroup.com is deployed.** Production
> follows [§ 4b · VPS deployment](#4b--vps-deployment), and day-to-day operation
> is documented in [TUTOR.md](./TUTOR.md). Skip this section unless you are
> deliberately standing the project up on Vercel instead.

1. [vercel.com/new](https://vercel.com/new) → import the repository
2. Framework preset: **Next.js** (detected). Leave build settings alone —
   `npm run build` already runs `prisma generate` first.
3. **Settings → Environment Variables** → add everything from step 3 to
   **Production** (and Preview, if you use preview deploys)
4. **Region**: Settings → Functions → **Singapore (sin1)**, matching Neon.
   Every page renders with at least one database round trip; putting the
   functions on another continent adds that latency to every request.
5. **Deploy**

The build needs a reachable database — the homepage, the article pages and
`generateStaticParams` all read Postgres at build time. There is no static
fallback. If `DATABASE_URL` is wrong, the build fails rather than deploying a
broken site, which is the correct direction.

---

## 5 · Domain and DNS

1. Vercel → **Settings → Domains** → add `yourdomain.com` and `www.yourdomain.com`
2. At your DNS provider:

| Type | Name | Value |
| --- | --- | --- |
| `A` | `@` | `76.76.21.21` |
| `CNAME` | `www` | `cname.vercel-dns.com` |

3. Pick one as canonical in Vercel and let it redirect the other. Serving both
   is duplicate content.
4. Wait for the TLS certificate (usually minutes).

**Then set the same URL inside the app**: sign in and set
**Admin → Website Settings → Website URL** to the canonical origin, with no
trailing slash. Every canonical tag, the sitemap, the RSS feed and every social
card is built from that value — if it still says `localhost` or the Vercel
preview URL, Google indexes nothing.

---

## 4b · VPS deployment (this is what production actually runs)

Architecture as observed on the live site:

```
visitor → Cloudflare (TLS, CDN, WAF) → VPS reverse proxy → Node (next start) → Neon
                                                                             → Cloudinary
```

### Build and start

```bash
git pull
npm ci

# STOP FIRST. This line is not optional — see the warning below.
pm2 stop flazz-group        # or: systemctl stop flazz-group

# Clear the cache. `.next/cache` holds unstable_cache entries that persist
# ACROSS builds, so a rebuild can prerender pages with content that is no
# longer in the database.
rm -rf .next

npm run build               # runs prisma generate first; needs a reachable database
pm2 start flazz-group       # or: systemctl start flazz-group
```

> **⚠ Never run the build while the old process is still serving.**
>
> Both failure modes below were reproduced during the August 2026 audit. Neither
> is a bug in the application — both are deploy-order hazards that exist because
> the VPS working directory survives every deploy.
>
> **Stale content.** A build reused a cached settings row and emitted a
> superseded WhatsApp number into `/contact`, `/about` and the footer while the
> live database held the current one. Nothing reported it.
>
> **Stale assets — the visible one.** With the old process still running, it
> wrote its own ISR entries into the freshly created cache directory. The
> homepage was then served referencing `2db27519b21f4804.css`, which the new
> build does not produce:
>
> ```
> Refused to apply style from '…/2db27519b21f4804.css' because its MIME type
> ('text/html') is not a supported stylesheet MIME type.
> ```
>
> The stylesheet 404s, so the page renders **completely unstyled**. It corrects
> itself when the entry revalidates — up to an hour for page routes. That is an
> hour of unstyled pages for real visitors and for Googlebot.
>
> If you need zero-downtime deploys, build into a fresh directory and swap a
> symlink, so the running process never shares a `.next` with a build.

The build reads Postgres — the homepage, article pages and `generateStaticParams`
all query at build time. A wrong `DATABASE_URL` fails the build rather than
deploying a broken site, which is the correct direction.

### Process manager

Run `npm start` under systemd or PM2 so the app restarts on crash and on boot.

> **⚠ Check this before scaling to more than one instance.**
>
> Admin saves invalidate content through `revalidateTag`, which purges **only the
> process that handled the request**. Under PM2 cluster mode or multiple
> containers, the other instances keep serving stale HTML until their own
> revalidate window expires (5 minutes for blog reads, 1 hour for pages).
>
> A visitor would see the change or not depending on which instance answered.
> If you need more than one instance, put a shared cache handler behind Next's
> `cacheHandler` option, or accept the revalidate window as the real freshness
> guarantee and tell editors so.

### Cloudflare

DNS records point at the VPS with the proxy (orange cloud) enabled. The apex →
`www` and HTTP → HTTPS redirects are handled here — both verified working:

```
https://flazzgroup.com/       → 301 → https://www.flazzgroup.com/
http://www.flazzgroup.com/    → 301 → https://www.flazzgroup.com/
```

**`https://www.flazzgroup.com` is the canonical origin and must stay that way.**
It is the value in Admin → Website Settings → Website URL, and every canonical
tag, the sitemap, `robots.txt`, the RSS feed and every social card are built from
it. Do not switch to the apex.

Two Cloudflare settings that need a decision:

1. **HTML is not being cached** — responses return `cf-cache-status: DYNAMIC`
   even though Next sends `Cache-Control: s-maxage=300, stale-while-revalidate`.
   Every page view reaches the VPS. Add a **Cache Rule** matching paths that are
   not `/admin` or `/api`, action *Eligible for cache* with **Use cache-control
   header** so the origin's own timing is honoured. Never cache a response
   carrying the admin session cookie.

2. **Managed robots.txt is enabled**, and it prepends a Cloudflare block to the
   file the app generates — so `/robots.txt` contains two `User-agent: *` groups.
   Google merges them, so the effective rules are correct, but be aware that
   `robots.txt` is no longer fully under application control and that the
   managed block disallows `GPTBot`, `ClaudeBot`, `CCBot`, `Bytespider`,
   `meta-externalagent` and `Google-Extended`. None of those affect Google
   Search; they do affect AI answer engines. Confirm that is what you want.

### Region

Neon is in `ap-southeast-1` (Singapore). Put the VPS in the same region — every
page renders with at least one database round trip, and a cross-region hop adds
that latency to every request.

---

## 6 · Database migration and seed

Run from your machine, against production. Both are safe to re-run.

```bash
# .env must hold the PRODUCTION DATABASE_URL and DIRECT_URL for these
npm run db:migrate    # applies all migrations via the direct endpoint
npm run db:seed       # creates the admin account and starter content
```

`db:migrate` runs `prisma migrate deploy` — it applies pending migrations and
never resets anything.

`db:seed` is idempotent by design:

- The `ADMIN_EMAIL` account is **upserted as SUPER_ADMIN and active**. This is
  the account of last resort: if a role change or suspension has locked the
  owner out, re-running the seed is the documented way back in.
- Content tables are filled **only when empty**, so re-running never overwrites
  what the owner has since edited.
- Blank settings fields are repaired; populated ones are left alone.

---

## 7 · First sign-in

1. Open `https://yourdomain.com/admin/login`
2. Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`
3. **Change the password immediately** — Admin → Users → your row → the key icon
4. Set **Website Settings → Website URL** to the canonical domain
5. Fill in **SEO title**, **description**, **contact links** (WhatsApp/Telegram)

### Roles

| | SUPER_ADMIN | ADMIN |
| --- | --- | --- |
| Blog, banners, brands, products, payments, FAQ, media | ✅ | ✅ |
| Floating chat | ✅ | ✅ |
| Website settings, SEO, analytics, homepage sections | ✅ | ❌ 403 |
| User accounts | ✅ | ❌ 403 |

Create staff accounts under **Admin → Users**. A role change or a suspension
takes effect on that person's **next request**, not when their session expires.

---

## 8 · Analytics

Optional. Nothing loads until a visitor accepts the cookie banner, and the
banner only appears once at least one ID is configured.

### Google Tag Manager

1. [tagmanager.google.com](https://tagmanager.google.com) → **Create Account** → **Web**
2. Copy the `GTM-XXXXXXX` container ID
3. **Admin → Website Settings → Analytics → Google Tag Manager**

### GA4 (inside GTM)

1. [analytics.google.com](https://analytics.google.com) → create a property → **Web** data stream
2. Copy the `G-XXXXXXXXXX` measurement ID
3. In GTM: **Tag → Google Analytics: GA4 Configuration**, trigger *All Pages*
4. For each custom event, add a **GA4 Event** tag with a **Custom Event**
   trigger matching the event name exactly
5. Register the parameters you want in reports under
   **GA4 Admin → Custom definitions**. GA4 collects unregistered parameters but
   will not display them — the commonest reason a working event "does not appear".

**Leave `NEXT_PUBLIC_GA4_ID` blank when using GTM.**

### Meta Pixel + Conversions API

1. Events Manager → **Data sources** → copy the pixel ID → admin panel
2. **Conversions API → Generate access token** → set `META_ACCESS_TOKEN` in the
   VPS `.env`, then restart the process
3. Optional: copy the test event code into `META_TEST_EVENT_CODE`
4. Trigger a WhatsApp click and watch **Test events**

You should see each conversion **once**, marked as received from *both* Browser
and Server. Two separate rows means deduplication is broken.

Without `META_ACCESS_TOKEN` the endpoint returns `{ skipped: "not_configured" }`
and the browser pixel carries on alone. That is a valid state, not an error —
but roughly a third of real conversions never reach the ad account from the
browser alone, so set it.

### Google Ads

1. **Goals → Conversions → New** → *Website* → **Google tag** setup
2. Copy the conversion ID (`AW-…`) and the label into the admin panel

Fires on `contact_whatsapp`, `contact_telegram` and `support_chat_action`.

> Google Ads **remarketing** pixels are served from the visitor's local Google
> domain. `google.com` and `google.co.id` are allowed in the CSP. Advertising
> into a new country means adding that domain to `ANALYTICS.img` in
> `next.config.ts`, or remarketing audiences silently stop filling. Conversion
> *counting* is unaffected — that goes to `doubleclick.net`.

### Microsoft Clarity

1. [clarity.microsoft.com](https://clarity.microsoft.com) → new project
2. Copy the project ID into the admin panel

---

## 9 · Google Search Console

1. [search.google.com/search-console](https://search.google.com/search-console)
   → add property → **URL prefix** → your canonical domain
2. Verification method: **HTML tag**. Copy only the `content` value
3. **Admin → Website Settings → Analytics → Google site verification**
4. Redeploy or wait for the next revalidation, then click **Verify**
5. **Sitemaps** → submit `https://yourdomain.com/sitemap.xml`

The verification tag renders server-side on every page regardless of consent —
it identifies the site to a crawler, not the visitor to anyone.

---

## Post-deployment verification

Run all of it. Ten minutes now beats a week of silent damage.

### Infrastructure

- [ ] `https://yourdomain.com` returns 200
- [ ] `https://www.yourdomain.com` redirects to the canonical host
- [ ] TLS valid, no mixed-content warnings
- [ ] `curl -I https://yourdomain.com | grep -i content-security-policy` present
- [ ] `curl -I https://yourdomain.com | grep -i strict-transport` present

### SEO — the highest-cost things to get wrong

- [ ] `/robots.txt` shows **your domain**, not localhost
- [ ] `/sitemap.xml` lists real URLs on **your domain**
- [ ] `/feed.xml` returns valid RSS
- [ ] `view-source:` on the homepage → `<link rel="canonical">` is your domain
- [ ] `<meta name="robots">` does **not** say `noindex`
- [ ] [Rich Results Test](https://search.google.com/test/rich-results) on the
      homepage and one article — Organization, WebSite, FAQPage, Article
- [ ] `/sitemap.xml` declares `xmlns:image` and each article carries one
      `<image:image>` — and every `<image:loc>` returns 200 from Cloudinary
- [ ] `/about`, `/contact`, `/privacy-policy`, `/terms` all return 200, are in
      the sitemap, and carry `index, follow` with a self-referencing canonical
- [ ] **Paste four URLs into WhatsApp and Telegram** — the homepage, `/blog`,
      one article and `/about`. All four must preview with an image. `/blog`
      shipping no `og:image` was a real defect, and the failure is silent:
      the card just renders as a bare line of text

### Application

- [ ] Homepage: every enabled section renders, hero slider advances, no console errors
- [ ] `/blog` lists articles; opening one renders the body, table of contents and related posts
- [ ] `/blog?q=test` returns results and is `noindex`
- [ ] `/blog?page=9999` returns **404**, not an empty page
- [ ] A deliberately broken URL returns the styled 404
- [ ] Floating chat opens, and a quick action opens WhatsApp with the message pre-filled

### Admin

- [ ] Sign in works; wrong password is refused
- [ ] Every sidebar page loads
- [ ] Upload an image (banner) — it appears with an SEO filename
- [ ] Replace that image — the old file is removed from Cloudinary
- [ ] Reorder a list by dragging — the order survives a refresh
- [ ] Delete a test row — it disappears from the public page within seconds
- [ ] Create an ADMIN account, sign in as them, confirm `/admin/settings` and
      `/admin/users` both answer **403**
- [ ] Confirm that ADMIN can still open **Floating Chat** and save it

### Analytics (if configured)

- [ ] Cookie banner appears on first visit
- [ ] **Decline** → no requests to googletagmanager / facebook / clarity
- [ ] **Accept** → GTM loads; GTM Preview shows the container connected
- [ ] Click WhatsApp → GA4 DebugView shows `contact_whatsapp`
- [ ] Meta **Test events** shows the conversion **once**, Browser + Server

---

## Rollback

### Application only (no schema change)

On the VPS, roll back by checking out the previous commit and rebuilding — with
the process stopped, for the reason in § 4b:

```bash
pm2 stop flazz-group
git log --oneline -5              # find the last known-good SHA
git checkout <good-sha>
npm ci
rm -rf .next
npm run build
pm2 start flazz-group
curl -sI http://127.0.0.1:3000/ | head -1     # expect HTTP/1.1 200 OK
```

Then purge the Cloudflare cache if the rollback changed CSS or layout.

*(On Vercel the equivalent is Deployments → last known-good → ⋯ → Promote to
Production. Not applicable to this deployment.)*

### Application with a schema change

Prisma migrations here are **forward-only**. There are no down-migrations, so a
rollback that must also undo schema is a two-step, deliberate operation:

1. Check out and rebuild the previous commit as above (restores the code)
2. If the new migration added a column or table, **leave it**. Additive changes
   are backwards compatible — the old code ignores them. Every migration in
   this project so far is additive.
3. If a migration was genuinely destructive, restore the database from a Neon
   branch (below) and then promote the old deployment.

**Never edit or delete an applied migration file.** Prisma records a checksum
per migration; changing one makes `migrate deploy` fail on every environment
that already applied it, including production.

### Emergency: locked out of the admin panel

Re-run the seed against production. It restores the `ADMIN_EMAIL` account to
SUPER_ADMIN, active, with the password from `ADMIN_PASSWORD`:

```bash
npm run db:seed
```

---

## Backups

### Neon

Neon keeps a continuous history and can branch from any point in the retention
window. Before anything risky:

```
Neon Console → Branches → New Branch → "pre-<change>-<date>"
```

Restoring: create a branch from the timestamp before the incident, verify it,
then repoint `DATABASE_URL`/`DIRECT_URL` at it.

Check your plan's **history retention** and raise it if the default is shorter
than you would want to notice a problem in.

### Manual dump before a large change

```bash
pg_dump "$DIRECT_URL" --no-owner --no-acl -Fc -f backup-$(date +%F).dump
```

### Cloudinary

Images are **not** covered by database backups. Deleting a row deletes its image
from Cloudinary once nothing else references it, and that is not recoverable
from Postgres. Cloudinary's own trash/backup setting is under
**Settings → Backup** — enable it before the site is busy.

---

## Monitoring

| Watch | Where | Act when |
| --- | --- | --- |
| 5xx rate | `pm2 logs flazz-group` / `journalctl -u flazz-group` | Any sustained 500 |
| Origin response time | Cloudflare → Analytics → Performance | p95 above ~2 s |
| Edge cache ratio | Cloudflare → Caching → Overview | A sudden drop means a rule changed |
| Process restarts | `pm2 status` | Repeated restarts = a crash loop |
| Disk space | `df -h` | `.next` and logs grow; below 10 % free, builds fail |
| Database connections | Neon → Monitoring | Approaching the endpoint limit |
| Slow queries | Neon → Monitoring | Anything above 1 s |
| Failed logins | `audit_logs` where `action='LOGIN_FAILED'` | A burst from one address |
| Denied access | `audit_logs` where `action='ACCESS_DENIED'` | More than a handful |
| Cloudinary usage | Cloudinary → Dashboard | Approaching the plan limit |
| Index coverage | Search Console | Pages excluded or "Crawled, not indexed" |
| Conversions | Meta Events Manager | Duplicates, or a sudden drop to zero |

Useful queries:

```sql
-- failed sign-ins in the last hour, by address
SELECT "ipAddress", "targetEmail", count(*)
FROM audit_logs
WHERE action = 'LOGIN_FAILED' AND "createdAt" > now() - interval '1 hour'
GROUP BY 1, 2 ORDER BY 3 DESC;

-- who is probing endpoints above their role
SELECT "actorEmail", summary, "ipAddress", "createdAt"
FROM audit_logs
WHERE action = 'ACCESS_DENIED'
ORDER BY "createdAt" DESC LIMIT 50;

-- every account change, most recent first
SELECT action, "actorEmail", "targetEmail", summary, "createdAt"
FROM audit_logs
WHERE action IN ('ADMIN_CREATED','ADMIN_DELETED','ROLE_CHANGED',
                 'PASSWORD_RESET','ADMIN_DISABLED','ADMIN_ENABLED')
ORDER BY "createdAt" DESC;
```

---

## Troubleshooting

### Build fails: `P1001 Can't reach database server`

The build machine cannot reach Neon. Check `DATABASE_URL` is set in the VPS `.env`
and that the Neon project is not suspended.

Locally, this is usually broken IPv6 — Neon publishes AAAA records and Node
races both families. Use the npm scripts (they already work around it) or:

```bash
export NODE_OPTIONS="--no-network-family-autoselection"
```

### `08P01 unsupported startup parameter in options`

Someone added `options=-c statement_timeout=…` to a pooled connection string.
Remove it. Those settings live on the database, applied by migration
`20260730170000_session_timeouts`.

### Migration hangs, or `P1002` advisory lock timeout

A previous migration held the lock through the pooler. Confirm `DIRECT_URL` is
the **non-pooled** endpoint, then in the Neon SQL editor:

```sql
SELECT pid, application_name, state, query FROM pg_stat_activity
WHERE datname = current_database() AND application_name LIKE '%pgbouncer%';
-- then, for the stuck backend:
SELECT pg_terminate_backend(<pid>);
```

### Everyone is signed out / cannot sign in

`AUTH_SECRET` is missing, shorter than 32 characters, or changed. Changing it
invalidates every existing session — that is also how you force a global sign-out.

### Uploads fail with "Image hosting is not configured"

One of the three `CLOUDINARY_*` variables is missing from the VPS `.env`.
`npm run media:check` tests the whole pipeline end to end. Restart the process
after fixing them — env vars are read at startup.

### Uploads fail with "The file is a PNG image but is named .jpg"

Working as intended. The server identifies files by their bytes, not by the
name or the `Content-Type` header. Rename the file to match its contents.

### Site shows localhost URLs in the sitemap or canonicals

**Admin → Website Settings → Website URL** was never changed from the seeded
default. Fix it there — it is not read from `NEXT_PUBLIC_SITE_URL` after the
first seed.

### Admin edits do not appear on the public site

Every admin write drops the matching cache tag, so a change should appear on the
next request. If it does not, confirm the deployment is not serving a stale
build (§ 4b), then check `pm2 logs flazz-group` for a `revalidateTag` error.
If the app runs more than one instance, see the process-manager warning in
§ 4b — that is the usual cause.

Scheduled posts are the exception by design: the homepage carries a 5-minute
revalidate window, so a post scheduled for 14:00 appears by 14:05.

### Analytics reports nothing

In order: is at least one ID set? Does the cookie banner appear? Did you accept
it? Open the browser console in development — every `track()` call logs where it
went. `→ blocked: no consent` and `→ nowhere (no destination configured)` are
the two common answers.

### `403 Forbidden` in the admin panel

Working as intended — that account is an ADMIN and the page is SUPER_ADMIN only.
Change their role under **Admin → Users**. It takes effect on their next request.
