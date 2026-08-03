# Production hardening

Eight confirmed blockers from the adversarial audit, fixed and re-attacked.

No features were added. Every change either removes trust in something the
caller controls, or turns a silent wrong answer into an explicit one.

**Result: 79 of 79 adversarial checks pass.** Every attack that succeeded before
now fails, and the site behaves the same for ordinary use.

| # | Blocker | Status |
| --- | --- | --- |
| 1 | Rate limiting trusted `X-Forwarded-For[0]` | Fixed — redesigned once after re-verification broke the first attempt |
| 2 | Upload trusted the multipart `Content-Type` | Fixed |
| 3 | `/blog` returned 500 for hostile query values | Fixed |
| 4 | No optimistic concurrency | Fixed |
| 5 | Unbounded indexable empty pages | Fixed |
| 6 | Protocol-relative URLs accepted | Fixed |
| 7 | Reorder reported the request, not the result | Fixed |
| 8 | Metadata fallback emitted `noindex` | Fixed |

---

## 1 · Client IP resolution

**Root cause.** `clientKey()` built its bucket from
`request.headers.get("x-forwarded-for")?.split(",")[0]`. A proxy *appends* to
that header, so the first entry is whatever the caller wrote. Rotating it gave
every request a private bucket: 25 password guesses accepted where an honest
client was cut off at 10, and 120 unauthenticated `/api/track` events accepted
against a 60/minute limit. The same value was also sent to Meta as
`client_ip_address`, so a caller could choose the address a conversion was
attributed to.

**Fix.** New `src/lib/client-ip.ts`. Trust is **declared**, never inferred:

```
TRUSTED_PROXY   unset → "vercel" if the VERCEL env var is present, else "none"
                none        ignore every forwarding header
                vercel      trust x-vercel-forwarded-for
                cloudflare  trust cf-connecting-ip
                hops:N      read X-Forwarded-For / Forwarded, N entries from the RIGHT
```

Counting from the right is the whole point: the rightmost entry was written by
the proxy nearest us, the leftmost by the client. When nothing identifies the
caller the resolver returns `null` and every such request shares one bucket —
failing closed, and visibly: a misconfigured deploy shows up as real users
seeing 429s rather than as a limiter that counts to one forever.

**The first attempt was wrong, and re-verification caught it.** It trusted
`cf-connecting-ip`, `x-vercel-forwarded-for` and `true-client-ip` on sight, and
defaulted to one proxy hop. Those headers are unforgeable *behind the platform
that sets them* and completely forgeable anywhere else, and nothing in a request
says which situation you are in. Tested against a plain `next start`, it
reproduced the original bypass through three new headers. That is why the final
design has no auto-detection except `process.env.VERCEL`, which is a runtime
variable a request cannot fake.

**Verification.** Seven rotating-header attacks × seven trust modes, 22 login
attempts each:

| Mode | Result |
| --- | --- |
| unset (no VERCEL) | all 7 attacks blocked |
| `none` | all 7 blocked |
| `vercel` | only `x-vercel-forwarded-for` honoured; other 6 blocked |
| `cloudflare` | only `cf-connecting-ip` honoured; other 6 blocked |
| `hops:1` | only the XFF chain honoured; other 5 blocked |
| `hops:2` | only a ≥2-entry XFF chain honoured |
| `garbage` | falls back to `none`, logs the error, all 7 blocked |

The modes that "honour" a header are correct by declaration: the operator has
asserted that infrastructure writes it. Under the default, nothing is believed.

---

## 2 · MIME detection from bytes

**Root cause.** `assertAcceptable()` returned `file.type` — the `Content-Type`
the client wrote into the multipart part — and every downstream decision hung
off it, sanitisation included:

```ts
const data = mime === "image/svg+xml" ? sanitizeSvg(raw) : raw;
```

The same SVG carrying `<script>alert(1)</script>` was cleaned when labelled
`image/svg+xml` and stored untouched when labelled `image/png`. Cloudinary then
sniffed the real type and served the untouched one as `image/svg+xml`.

**Fix.** New `src/lib/media/sniff.ts` identifies content from magic bytes — PNG
signature, JPEG SOI, `RIFF`+`WEBP` at offsets 0 and 8, `ftyp`+`avif`/`avis` for
ISO-BMFF, and for SVG a root-element check after stripping BOM, XML
declaration, DOCTYPE and comments. AVIF is now accepted, as specified.

The declared type is no longer consulted at all. Sanitisation keys on the
**detected** type, so a vector is cleaned however it was labelled. The filename
is checked *against* the content: a `.png` name over WEBP bytes is rejected,
because the extension ends up in the delivery URL.

**Verification.** 14 hostile uploads, all assets destroyed afterwards:

```
 ok  SVG+script labelled image/png, named .png    -> 415 "is a SVG but is named .png"
 ok  SVG+script labelled image/png, named .svg    -> 201 (sanitised)
 ok  SVG+script labelled octet-stream, .svg       -> 201 (sanitised)
 ok  SVG wrapped in BOM/XML/DOCTYPE/comment       -> 201 (sanitised)
 ok  HTML containing an inline <svg>              -> 415
 ok  real PNG named .jpg (extension lies)         -> 415
 ok  real WEBP named .png                         -> 415
 ok  GIF labelled image/png                       -> 415
 ok  plain text labelled image/png                -> 415
 ok  real PNG / JPEG / WEBP / AVIF, honest names  -> 201
 ok  real PNG with no extension                   -> 201
```

The stored bytes of every accepted SVG were refetched from Cloudinary and
checked for `<script`. None survived.

---

## 3 · Query parameter validation

**Root cause.** Two unvalidated values reached the database directly.
`params.q` went into a `$queryRaw` bind, so a NUL byte produced
`22021 invalid byte sequence for encoding "UTF8"`. `Number(params.page)` went
into Prisma's `skip`, so `?page=1e999` became `skip: Infinity` and
`?page=999999999999999999999` became `skip: 9e+21`. Three unauthenticated 500s,
one GET each, on the site's main content route — and sustained 5xx there is what
suppresses crawl rate for a whole domain.

**Fix.** New `src/lib/blog/params.ts` normalises every parameter before any
query runs. `page` must be a plain run of digits parsing to a safe integer ≥ 1;
anything else collapses to page 1 and redirects. `q` has control characters
stripped by code point (not by a regex containing literal control bytes) and is
capped at 80 characters. `kategori` must match the slug shape. `searchPosts()`
strips control characters again, because a function handing strings to
`$queryRaw` should not depend on every caller having remembered.

**Verification.** 25 hostile URLs, **zero 500s**, zero database errors in the
server log:

```
/blog?q=%00                          308 -> /blog
/blog?q=abc%00def                    308 -> /blog?q=abc+def
/blog?page=1e999                     308 -> /blog
/blog?page=999999999999999999999     308 -> /blog
/blog?page=99999999999               404
/blog?page=abc | NaN | 0 | -1 | 2.5  308 -> /blog
/blog?page=1                         308 -> /blog
/blog?page=1&page=abc                308 -> /blog
```

Redirect chains terminate in exactly one hop. Ordinary use is unchanged:
`/blog` 200 with 5 articles, `?q=qris` 200 with 3, `?kategori=…` 200 with 1.

---

## 4 · Optimistic concurrency

**Root cause.** No version check anywhere. A form opened before someone else's
save overwrote it silently, with a 200. That is ordinarily a lost update; here
it also destroyed files. Admin A replaces image X with Y → `releaseIfReplaced`
deletes X from Cloudinary. Admin B, whose form still holds X, saves → the row
points at a file that no longer exists. Broken image on the public site,
unrecoverable, no error anywhere. Two tabs is enough.

**Fix.** Every edit carries the row's `updatedAt`, and the server spreads it
into the `where` clause:

```ts
update: (id, data, guard) => prisma.heroBanner.update({ where: { id, ...guard }, data })
```

Atomic by construction — a read-then-compare-then-write would leave a window
between the compare and the write, which is the same race in a smaller box. No
match raises P2025; one more read separates "deleted" (404) from "changed
underneath you" (409). A missing version stamp is a 400, not a free pass:
opting out would be opting out of exactly the protection that stops the image
deletion.

Applied to all 12 `itemRoute` resources, the settings singleton (via
`updateMany`, where a mismatch is a count of zero rather than an exception) and
the article editor. On the client, `ResourceScreen` sends `editing.updatedAt`
so no per-resource Draft type had to change; `SettingsForm` and `PostEditor`
hold the stamp in state and advance it from each response, because both stay
mounted after saving and would otherwise refuse their own second save.

**Verification.**

```
 ok  current version accepted                       200
 ok  stale version refused                          409
 ok  missing version refused                        400
 ok  stale write did not land                       value still "harden-A"
 ok  image reference unchanged by refused writes
 ok  ten simultaneous writers, same version         200×1, 409×9, other×0
 ok  settings: current / stale / missing            200 / 409 / 400
```

Then through the real UI, on a clean build:

```
 ok  all 10 ResourceScreen managers: edit + save -> 200
 ok  settings: two consecutive saves both 200      (version advances)
 ok  article editor: two consecutive saves both 200
 ok  second tab, now stale, refused with 409
 ok  stale tab shows an explanation
```

The ten-writer result is the proof that matters: exactly one winner, no
partial application, no 500s.

---

## 5 · Pagination

**Root cause.** `/blog?page=99999` returned 200 with an empty archive,
`robots: index, follow` and a **self-referencing canonical** — an unbounded set
of indexable, self-canonicalising soft 404s. With five articles, `?page=2` was
already one.

**Fix.** Out-of-range pages `notFound()`. Page numbers above `MAX_PAGE` (500)
404 without touching the database, so a crawler walking page numbers costs
nothing. Page 1 always canonicalises to `/blog`. An archive with no published
articles at all — a real state on a fresh deploy — stays 200 but is marked
`noindex, follow`, using a count `getCategories()` already carries.

**Verification.** `?page=2`, `?page=99`, `?page=500`, `?page=501` → 404.
`?page=1` → 308 to `/blog`. `/blog?q=zzznothing` → 200 `noindex, follow`.
`/blog` and `?kategori=…` → 200 `index, follow`.

---

## 6 · Protocol-relative URLs

**Root cause.** `/^(https?:\/\/|\/|#)/` accepted `//evil.com`, which starts
with `/` and which a browser reads as "same scheme, different host". In a
banner's `destinationUrl` it became a same-tab off-site navigation that also
skipped `rel="noopener noreferrer"`, because that decision asks
`startsWith("http")`. In a post's `canonicalUrl` it resolved against
`metadataBase` into `https://evil.com` — a one-field button for deindexing an
article.

**Fix.** `isStorableLink()` rejects anything matching `^/[/\\]`, and sends
absolute URLs through the URL parser so the scheme is whatever the browser will
actually see. Applied to `linkSchema` and `imageSchema`.

**Verification.** Probes built from character codes, so no source-level escaping
could silently alter them. Every scheme-relative spelling rejected —
`//evil.com`, `///evil.com`, `/\evil.com`, `\\evil.com`, `/\\evil.com`, and the
TAB/LF/CR-separated variants. `javascript:`, `data:` and `vbscript:` rejected in
any casing. `/legit`, `#anchor`, `https://ok.test` still accepted.

`http:\\evil.com` is accepted — it is an ordinary absolute URL that the URL
parser normalises to `http://evil.com/`, which is allowed by design (an admin
must be able to link off-site) and does receive `rel="noopener noreferrer"`.

---

## 7 · Reorder row count

**Root cause.** The handler returned `ids.length` regardless of what the
statement did. Unknown ids and ids from other tables both answered
`200 {"count": 2}` having changed nothing.

**Fix.** `applyOrder` already returned the affected count; it is now used. A
shortfall means the client is working from a stale list, so it is a 409 naming
the real number. The rows that did match keep their new positions — this is a
report, not a rollback — and the client refetches. `blogCategory` moved from
`update` to `updateMany` inside its transaction so a deleted row reports as
"not updated" rather than throwing P2025 and surfacing as a 404.

**Verification.**

```
valid list       200  {"count":2,"requested":2}
unknown ids      409  "0 of 2 items still exist."
partial match    409  "1 of 2 items still exist."
```

---

## 8 · Metadata `noindex` fallback

**Root cause.** `FALLBACK_METADATA` carried `robots: { index: false }`. Metadata
is emitted into HTML that Next caches, so one transient database error during an
ISR regeneration would bake `noindex` into the page for a full revalidate
window — and during a build, into every page until the next deploy. Nothing
surfaces that; the site just stops ranking.

**Fix.** The fallback declares no `robots` directive at all. A page with no
robots tag is indexable by default, and serving a briefly generic title is a far
smaller harm than silently deindexing the site.

**Verification.** Server started against an unreachable database:

```
/                    500   robots=<none>   noindex occurrences: 0
/blog                500   robots=<none>   noindex occurrences: 0
/definitely-missing  500   robots=<none>   noindex occurrences: 0
```

**Honest caveat:** with the database fully down, both the metadata and the page
render fail, so the route returns 500 and nothing is cached either way — 500 is
also the right status, since crawlers retry it rather than deindexing. I could
not construct an end-to-end reproduction of the original bug, which needed the
narrow window where metadata's `getSettings` fails while the page's succeeds.
What is proven is that the fallback can no longer emit `noindex` at all.

---

## Regression

Nothing above changed how the site behaves for ordinary use.

```
tsc --noEmit          clean
next lint             clean
next build            exit 0
21/21 public-site checks   h1, hero image, JSON-LD, link names, no console errors
9 viewports (320–1920)     no horizontal overflow, no hydration errors
auth boundary              401 / 307 / cross-origin rejected / 404
SEO surfaces               robots.txt, sitemap.xml (10 URLs), feed.xml all 200
```

All test state was reverted: banner alt text and ordering restored, settings
untouched with analytics IDs still blank, and zero leftover Cloudinary assets
under either test prefix.

---

## Remaining risks

Not blockers, but the honest list.

**The rate limiter is still in process memory.** `TRUSTED_PROXY` fixes *who* a
request is attributed to; it does not fix *where the counter lives*. On Vercel
each instance has its own, so "10 attempts per 15 minutes" becomes 10 per
concurrently-warm instance. Move the counter to Redis or a Postgres table before
traffic justifies more than one instance. The call sites do not change — only
`lib/rate-limit.ts`.

**`TRUSTED_PROXY` must match reality.** Declaring a proxy that is not in front of
the app reopens the original bypass. The default is safe and the failure mode of
being too strict is visible (real 429s); the failure mode of being too lax is
silent. Set it deliberately at deploy time and confirm it after.

**`sanitizeSvg` is still regex-based.** Detection is now correct, so every SVG
reaches the sanitiser — but the sanitiser itself strips a known list
(`<script>`, `<foreignObject>`, `on*=`, `javascript:`, `<!ENTITY>`) and a regex
sanitiser is never complete; `<animate attributeName="href">` is not covered. The
blast radius is bounded: uploads need admin auth, and Cloudinary serves from a
different origin. Replace with DOMPurify in a Node context if untrusted uploads
ever become possible.

**Optimistic concurrency covers writes, not deletes.** `DELETE` still succeeds
against a row someone else has edited. That is defensible — the intent to remove
is rarely invalidated by an edit — but it is asymmetric, and worth revisiting if
deletes ever become recoverable.

**A 409 asks the editor to redo their change.** The dialog stays open so nothing
typed is lost, and the list behind refreshes, but there is no field-level merge.
For the article editor in particular, a longer-lived draft would be better served
by autosave than by a conflict message.

**Article body images are still never reclaimed** (carried over from the release
audit). `BlogImage` and its table remain unreferenced, so images inserted through
the rich-text editor accumulate in Cloudinary. There are 0 orphans today. Doing
this correctly needs a content diff plus extending the reference check to search
article bodies, and it adds an irreversible deletion path — the first thing to
build after launch, not during a hardening pass.

**`MAX_PAGE = 500` is a policy, not a limit of the data.** At nine posts per page
it allows 4,500 articles. If the blog ever approaches that, raise it, or page 501
will 404 on real content.
