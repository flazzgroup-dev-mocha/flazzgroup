# FLAZZ GROUP — Production Audit

Date: 28 July 2026 · Next.js 15.5.21 · Prisma 7.9 · React 19

Scope: every source file, component, page, API route, database model and
configuration. The design was not changed — findings were fixed in place.

## Lighthouse

Measured with Lighthouse 13.4 against a production build (`next start`), mobile
emulation, three warm runs.

| Category | Before | After | Target |
| --- | --- | --- | --- |
| Performance | 83 | **95–97** | 95+ |
| Accessibility | 93 | **100** | 100 |
| Best Practices | 92 | **100** | 100 |
| SEO | 91 | **100** | 100 |

| Metric | Before | After |
| --- | --- | --- |
| Largest Contentful Paint | 3.7 s | 2.8 s |
| Total Blocking Time | 240 ms | 60 ms |
| Cumulative Layout Shift | 0.001 | 0.001 |
| Speed Index | 3.4 s | 1.8 s |

Local numbers, no CDN. Production behind Railway's edge should be better on
LCP and Speed Index.

Also verified after the changes: `tsc --noEmit` clean, `eslint` clean, and the
26-check admin/browser regression suite still 26/26.

---

## Critical

### 1. Blank site settings on a fresh deploy — silent, and it broke SEO
`getSettings()` creates a settings row on first read using schema defaults.
Any traffic before `db:seed` — a health check, a warm-up request, the build's
own metadata pass — created that row empty. The seed then used
`update: {}`, so re-running it **silently did nothing**, and the site shipped
with no meta description, no ticker, no footer text and no social links.

Reproduced: the audit database had `seoDescription: ""`, and Lighthouse
reported "Document does not have a meta description".

Fixed in [prisma/seed.ts](prisma/seed.ts): the seed now fills any field that is
still blank and leaves configured values alone. Re-running it on the audit
database repaired 12 fields. **Run `npm run db:seed` once against production** —
it is idempotent and will not overwrite anything you have set.

### 2. Link previews lost their metadata
Next 15 streams metadata into the body for non-bot user agents. Its built-in
crawler list covers Google, Bing, Facebook, Twitter, Slack and WhatsApp — but
**not Telegram**, which is this store's main channel. A link shared to Telegram
would preview with no title, description or image.

Fixed with an extended `htmlLimitedBots` in [next.config.ts](next.config.ts).
Verified per user agent: TelegramBot, facebookexternalhit and Lighthouse now all
receive metadata inside `<head>`.

### 3. No error, loading or 404 boundaries anywhere
A database outage produced Next's raw default error page; there was no 404 page
and no loading state. Added:

- [src/app/global-error.tsx](src/app/global-error.tsx) — last-resort boundary, self-contained styling
- [src/app/(site)/error.tsx](src/app/(site)/error.tsx) — public-site failures, with retry
- [src/app/(admin)/admin/error.tsx](src/app/(admin)/admin/error.tsx) — panel failures, routes to re-login
- [src/app/not-found.tsx](src/app/not-found.tsx) — branded 404, `noindex`
- [src/app/(admin)/admin/(panel)/loading.tsx](src/app/(admin)/admin/(panel)/loading.tsx) — skeleton table

`generateMetadata` also falls back to static defaults instead of throwing, so a
database blip no longer takes down pages that do not otherwise need it.

---

## High priority

### 4. No security headers
Nothing was set. Added HSTS, `X-Frame-Options: DENY`, `nosniff`,
`Referrer-Policy`, `Permissions-Policy` and a CSP with `frame-ancestors 'none'`,
`base-uri 'self'`, `form-action 'self'`, `object-src 'none'`.

Worth knowing: the first CSP I wrote (`default-src 'self'` only) **broke the
site** — it blocked the inline `style` attributes the design uses for per-brand
accent colours, which Lighthouse then reported as contrast failures against a
white background. Caught in testing and corrected; the shipped policy allows
inline styles and scripts.

### 5. No rate limiting
The login endpoint accepted unlimited attempts. Added
[src/lib/rate-limit.ts](src/lib/rate-limit.ts): 10 login attempts per address
per 15 minutes (reset on success), and 30 uploads per 5 minutes since image
processing is CPU-bound. Uploads now also reject oversized bodies by
`content-length` before buffering them.

In-memory, so it is per-instance. Move the counter to Redis before running more
than one container — the call sites will not change.

### 6. CSRF had only one layer
The session cookie is `SameSite=Lax`, which is good. Added a second layer in
[src/lib/api.ts](src/lib/api.ts): state-changing requests must carry an `Origin`
matching the host.

### 7. Touch targets below the accessible minimum
Navbar and footer links were rendered as inline elements, so their padding
created no hit area — 85×17px against a 24×24px minimum. Made them
`inline-flex` with a minimum height. This is why Accessibility was 93.

---

## Medium priority

### 8. Auto-advancing hero ignored reduced-motion
The slider rotated every 6 seconds regardless of `prefers-reduced-motion` — a
vestibular trigger and a WCAG 2.2.2 concern. It now stops entirely when reduced
motion is requested, and stops permanently once a visitor interacts.

### 9. The page could ship without an `h1`
The only `h1` lived in the hero. Switching the hero off in the admin panel — a
supported action — left the page with no `h1` at all. A visually hidden `h1`
now covers that case.

### 10. Logo links had a conflicting accessible name
`aria-label="FLAZZ GROUP — beranda"` did not contain all the visible text
("TOP UP STORE"), failing `label-content-name-mismatch`. The tagline is now
decorative and the visible wordmark is the accessible name.

### 11. Muted text was borderline on contrast
`--color-fog` measured 4.69:1 on the page background but **3.86:1** on glass
surfaces, below AA. Lifted to `#8296b8` — 6.2:1 and 5.1:1. Visually near
identical.

### 12. Orphaned admin page
`/admin/hero-stats` existed and worked but was not linked from the sidebar, so
the hero stats strip was uneditable in practice. Now linked.

### 13. Deprecated Framer Motion API, called on every render
`Reveal` used `motion(as)` — deprecated, and it rebuilt the component on every
render, which remounts the subtree. Now `motion.create()` inside a `useMemo`.

### 14. No search in admin lists
Added to [ResourceScreen](src/components/admin/ResourceScreen.tsx), so all nine
lists get it at once. It appears only past 8 rows, and drag-ordering is disabled
while a filter is active — reordering a filtered subset would write a
misleading order.

---

## Low priority / cleanup

- Removed 4 unused dependencies: `@radix-ui/react-select`,
  `react-dropdown-menu`, `react-separator`, `react-tooltip`.
- Removed dead exports: `Separator`, `CardDescription`, `hashPassword`,
  `revalidateResource`, `ACCEPT_ATTRIBUTE`, a stray `NextResponse` re-export.
- `Skeleton` was defined but never used — now drives the admin loading state.
- Escape now closes the admin mobile drawer, matching the public navbar.
- Tuned `deviceSizes`/`imageSizes` to the breakpoints the layout actually uses,
  and set a 30-day minimum image cache TTL.

---

## Reversed from the previous session

The homepage was `force-dynamic`, on my earlier conclusion that a prerendered
page serves stale HTML once after an edit.

**That conclusion was wrong.** The flakiness I saw then had two other causes,
both since fixed: the browser's own HTTP cache in the test, and the blank
settings row from finding #1. Re-tested properly — 8 consecutive
write-then-read rounds, no browser cache, first request every time — cached
rendering returned fresh content **8/8**.

So the page is cacheable again, which is strictly better: TBT fell from 240 ms
to 60 ms, Speed Index from 3.4 s to 1.8 s, metadata sits in `<head>`, and
back/forward cache works again. Edits are still visible on the next request.

---

## Verified as already sound

- **Prisma safety** — no raw SQL outside one read-only introspection query;
  every write goes through the client. Sortable tables are indexed on
  `(isActive, order)`; the activity log is indexed on `createdAt DESC`.
- **Validation** — one Zod schema per resource, shared by the API and the forms.
  Link fields reject anything that is not `https://`, `/path` or `#anchor`, so
  `javascript:` cannot be stored. Confirmed: a payload with
  `javascript:alert(1)` is rejected with 422.
- **Upload hardening** — rasters re-encoded to WebP (which discards anything
  hidden in the container), SVGs sanitised, served from outside `public/`.
- **Auth** — bcrypt cost 12, httpOnly + `Secure` in production, 8-hour
  expiry, identical response for unknown email and wrong password.
- **Two-layer route protection** — middleware plus a `requireSession()` call in
  every handler.
- **Responsive** — 0 px horizontal overflow at 390, 820 and 1440 px.

---

## Recommended next

Roughly in order of value.

1. **Rotate the Railway database password.** It was printed in cleartext during
   this session.
2. **Nonce-based CSP.** The current policy allows `'unsafe-inline'` for scripts
   because Next injects an inline bootstrap. Threading a per-request nonce
   through middleware closes the main XSS gap. Behavioural change, so it wants
   its own testing pass.
3. **Move rate limiting to Redis** before scaling past one instance.
4. **Object storage for uploads.** Local disk is ephemeral on Railway; the
   `StorageDriver` interface already exists for this.
5. **Remaining ~5 Performance points** are Framer Motion and Swiper execution
   (`unused-javascript`, `mainthread-work-breakdown`). Replacing scroll reveals
   with CSS scroll-driven animations and the slider with CSS scroll-snap would
   close it — but both change how the page feels, so they need your sign-off
   rather than an auditor's judgement.
6. **Sessions cannot be revoked** before their 8-hour expiry. A `tokenVersion`
   column on `Admin`, bumped on password change, would fix that.
7. **Server-side pagination** if any list passes a few hundred rows. Current
   search is client-side, which is correct at today's volumes.

## Deliberately not done

- **BreadcrumbList schema** — requested, but this is a single-page site. A
  one-item breadcrumb carries no information and Google may flag it. Worth
  adding the moment real subpages (`/order`, brand pages) exist.
- **`/login`, `/register`, `/order` routes** — still unbuilt, still
  `prefetch={false}`. Out of scope for an audit.
