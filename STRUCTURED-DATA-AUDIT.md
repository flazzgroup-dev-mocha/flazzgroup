# Structured Data Audit — FLAZZ GROUP

**Date:** 12 August 2026
**Method:** every JSON-LD block extracted from the rendered HTML of a local production build and machine-validated for JSON validity, duplicate `@id` within a page, required properties per type, banned/fabricated properties, and off-domain URLs.

**Result: PASS — 0 problems across 8 routes.**

```
=== /                     Organization, WebSite, ItemList, FAQPage
=== /blog                 CollectionPage, ItemList, BreadcrumbList
=== /blog?kategori=…      CollectionPage, ItemList, BreadcrumbList
=== /about                AboutPage, BreadcrumbList
=== /contact              ContactPage, BreadcrumbList
=== /privacy-policy       WebPage, BreadcrumbList
=== /terms                WebPage, BreadcrumbList
=== /blog/<article>       Organization, BreadcrumbList, BlogPosting, WebPage, Person

PASS — no structured-data problems
```

---

## 1. Schema map by route

### `/` — Homepage
`src/components/common/StructuredData.tsx`

| Type | `@id` | Why it is here |
|---|---|---|
| `Organization` | `/#organization` | **The canonical entity definition for the whole site.** Declared once, here, and referenced by `@id` from every other page. Carries `name`, `url`, `logo`, `description`, `sameAs` (social profiles), `contactPoint` (customer support, 24/7, `availableLanguage: [id, en]`), and `subOrganization` for each brand |
| `WebSite` | `/#website` | Names the site as an entity and points `publisher` at the Organization |
| `ItemList` | `/#catalog` | The product catalogue. Each item is a `Product` with `name`, `image`, `description`, `brand`, and an `Offer` carrying real `price`, `priceCurrency: IDR`, `availability` and `url` |
| `FAQPage` | `/#faq` | The FAQ accordion, one `Question`/`acceptedAnswer` per row |

**Every value comes from the database**, so the structured data cannot drift from what a visitor sees. That is the correct architecture and it is the reason this section passes.

`contactPoint` uses `settings.telegramUrl` and is conditional on it being set — no invented phone number.

### `/blog` and `/blog?kategori=<slug>` — Archive
`src/components/blog/ArchiveSchema.tsx` — **added during this audit; the archive previously emitted no JSON-LD at all.**

| Type | `@id` | Why it is here |
|---|---|---|
| `CollectionPage` | `<url>#page` | What the page literally is: a list of links to other pages |
| `ItemList` | `<url>#list` | The articles currently listed, in display order |
| `BreadcrumbList` | `<url>#breadcrumb` | Mirrors the visible breadcrumb (Beranda → Blog → *Category*) |

### `/blog/<slug>` — Article
`src/components/blog/ArticleSchema.tsx`

| Type | `@id` | Why it is here |
|---|---|---|
| `BlogPosting` | `<url>#article` | The article |
| `WebPage` | `<url>#webpage` | The page containing it; `isPartOf` → `WebSite`, `breadcrumb` → the list below |
| `BreadcrumbList` | `<url>#breadcrumb` | Beranda → Blog → Category → Article |
| `Organization` | `/#organization` | Referenced as `publisher` |
| `Person` | `/blog/penulis/<slug>#person` | The author; `worksFor` → Organization |

`BlogPosting` carries `headline`, `name`, `description`, `inLanguage`, `mainEntityOfPage`, `url`, `wordCount` (computed from the stored plain-text mirror), `timeRequired`, `datePublished`, `dateModified`, `publisher`, `author`, `articleSection`, `keywords`, and `image` as a full `ImageObject` with `caption`.

### `/about`, `/contact`, `/privacy-policy`, `/terms`
`src/components/common/PageSchema.tsx`

| Route | Type | Why |
|---|---|---|
| `/about` | `AboutPage` | Schema.org's specific type for a page about the organisation |
| `/contact` | `ContactPage` | Specific type for contact information |
| `/privacy-policy` | `WebPage` | Correct and deliberate — see §5 |
| `/terms` | `WebPage` | Correct and deliberate — see §5 |

All four also emit `BreadcrumbList`, and all reference `WebSite`/`Organization` by `@id` without redefining them.

---

## 2. The entity graph

```
                      ┌────────────────────────────────┐
                      │  Organization                  │
                      │  @id = /#organization          │   declared once, on /
                      │  name, url, logo, description, │
                      │  sameAs[], contactPoint,       │
                      │  subOrganization[]             │
                      └───────────▲────────────────────┘
                                  │ publisher
                      ┌───────────┴────────────────────┐
                      │  WebSite                       │
                      │  @id = /#website               │   declared once, on /
                      └───────────▲────────────────────┘
                                  │ isPartOf
     ┌────────────────┬───────────┴───────────┬─────────────────┐
     │                │                       │                 │
 CollectionPage   AboutPage / ContactPage  WebPage          WebPage
   (/blog)          (/about, /contact)   (article)      (legal pages)
     │                                       │
  ItemList                              BlogPosting ──author──► Person
     │                                       │                    │
     └────── BreadcrumbList ◄────────────────┴────── worksFor ────┘
                                                        │
                                                        ▼
                                                  Organization
```

**One organisation. One website. Everything else references them by `@id` and never redefines them.** This is the coherent entity graph the brief asked for, and it holds across every route.

---

## 3. Validation results

| Check | Result |
|---|---|
| Valid JSON | **PASS** — 8/8 routes parse |
| `@context` present | **PASS** |
| One `<script type="application/ld+json">` per page | **PASS** — a single `@graph`, never scattered blocks |
| Duplicate `@id` within a page | **PASS** — none |
| Required properties per type | **PASS** — `BlogPosting` has headline/datePublished/image/author/publisher; `BreadcrumbList` has `itemListElement`; `Organization` has name+url; etc. |
| URLs on the canonical domain | **PASS** — every URL is `https://www.flazzgroup.com` or `https://res.cloudinary.com`. No apex, no localhost, no off-domain leakage |
| `inLanguage` | **PASS** — `id-ID` on every page-level node |
| JSON-LD injection safety | **PASS** — see §6 |

### Fabrication audit — the important one

Scanned every node for `aggregateRating`, `review`, `ratingValue`, `reviewCount`, `priceValidUntil`:

**Zero occurrences. No fake reviews, no fake ratings, no invented aggregate scores, no fabricated organisations or addresses.**

Also verified absent: postal address, legal registration number, founding date, employee count, price ranges — none of which exist in the project, and none of which were invented. `Organization` carries only what the settings row actually holds.

---

## 4. Deliberate omissions — schema that was considered and rejected

The brief asked to evaluate whether several types are needed. Adding schema because it exists is how a graph stops describing reality.

| Type | Verdict | Reasoning |
|---|---|---|
| **`WebSite` `SearchAction`** | **Do not add** | This would target the sitelinks searchbox, which **Google removed as a rich result in late 2024**. The site does have a working `/blog?q=` search, so the markup would be *truthful* — but it would produce no rich result, and claiming otherwise would be exactly the unsupported eligibility claim the brief prohibits. No benefit, so no markup |
| **`Article` on legal pages** | **Do not add** | Terms and a privacy policy are not editorial content. Typing them as `Article` would claim authorship and editorial standing they do not have — and the brief explicitly says legal pages must not be misrepresented as Article content. They are `WebPage`, which is accurate |
| **`Product` on `/about`** | **Do not add** | `/about` describes the organisation. Products are declared once, on the homepage, where they are actually listed |
| **`FAQPage` on `/contact`** | **Do not add** | The contact page has no FAQ. Google also restricted FAQ rich results to authoritative government and health sites in 2023, so this would be markup with no user and no benefit |
| **`LocalBusiness`** | **Do not add** | Requires a verifiable physical address. The project has none, and inventing one is precisely the fabricated legal information the brief prohibits |
| **`BreadcrumbList` on `/`** | **Do not add** | The homepage is the root of the trail. A one-item breadcrumb describes nothing |
| **`ImageObject` as a standalone node** | **Not needed** | Already used inline where it belongs — as `BlogPosting.image`, with `url` and `caption` |
| **`Offer` on brand sub-organisations** | **Do not add** | Brands link to external storefronts whose prices this site does not control. Declaring offers for prices held on someone else's domain would be an unsupported claim |
| **`speakable`** | **Do not add** | Limited to news publishers in Google's documentation |
| **`HowTo`** | **Do not add** | Google **deprecated HowTo rich results in 2023**. Two articles are genuinely step-by-step and would once have qualified; today the markup produces nothing |

---

## 5. Why the legal pages are `WebPage`

Called out separately because the brief raised it directly.

`/privacy-policy` and `/terms` are typed `WebPage`, not `Article` and not `BlogPosting`. This is deliberate:

- They are **not editorial content**. They have no author in any meaningful sense, no publication as an act of journalism, and no `dateModified` that means "we revised our reporting".
- Typing them as `Article` would make them eligible to be surfaced as content, which is not what they are.
- `WebPage` with a `BreadcrumbList`, `isPartOf` → `WebSite` and `publisher` → `Organization` says exactly the true thing: *this is a page on this site, published by this organisation.*

They still carry an accurate visible "Terakhir diperbarui" date, sourced from the same table the sitemap's `lastmod` reads (`src/lib/static-pages.ts`), so the human-readable date and the machine-readable one cannot drift.

---

## 6. JSON-LD injection safety

`src/components/common/JsonLd.tsx` — **PASS**, and worth documenting because the failure mode is subtle.

`JSON.stringify` is not an HTML escaper. It escapes quotes and backslashes for *JavaScript* and leaves `<` exactly as it found it. A settings field, an FAQ answer or an article title containing the literal text `</script>` would therefore close the block early, and everything after it would be parsed as markup. The site's CSP allows inline script, so an injected `<script>` would execute.

The serialiser escapes `<`, `>`, `&`, U+2028 and U+2029 to `\u00xx` form. Only an authenticated admin can write those fields, which makes this a privilege-escalation path rather than an open door — but it removes the class of bug entirely for the cost of one replace.

U+2028/U+2029 are escaped for an unrelated reason: both are valid inside a JSON string and were illegal inside a JavaScript string literal before ES2019, so older parsers — some crawlers among them — reject the whole block.

---

## 7. Findings

### SD-1 · Articles declare a thinner `Organization` than the homepage — **P3, RECOMMENDATION**

`ArticleSchema` emits `Organization` with `name`, `url`, `logo`. `StructuredData` emits the **same `@id`** with `description`, `sameAs`, `contactPoint` and `subOrganization` as well.

**This is not a conflict.** Same identifier, and the article version is a strict subset — no property contradicts another. Google merges by `@id` within a page, and a subset is valid.

It is still worth improving: the article page is where `publisher` carries the most weight, and it currently presents the weakest version of the publisher entity.

**Recommendation.** Extract one `organizationNode(settings)` helper consumed by both components.
**Files:** `src/components/common/StructuredData.tsx`, `src/components/blog/ArticleSchema.tsx`
**Not done in this pass** — it modifies working homepage schema for a modest gain, and the current state is valid.

### SD-2 · Author `@id` resolves to a 404 — **P3, RECOMMENDATION**

```
$ curl -o /dev/null -w '%{http_code}' http://localhost:3100/blog/penulis/tim-flazz
404
```

`ArticleSchema` sets `Person["@id"] = ${base}/blog/penulis/${slug}#person`, but no `/blog/penulis/[slug]` route exists.

Schema.org `@id` values are identifiers and are **not required to resolve**, so this does not invalidate the graph and no validator will flag it. But a URL-shaped identifier that 404s is a smell, and an author archive is the natural place to build the E-E-A-T signal the `Person` node is reaching for.

**Two coherent options:** build the author archive (which would also give those articles another internal hub — see `INTERNAL-LINKING-AUDIT.md`), or change the `@id` to a non-URL identifier. Do not leave it pointing at a 404 *and* build no page.

### SD-3 · Cross-page `@id` references — **informational, no action**

`WebPage.isPartOf` → `/#website` and `publisher` → `/#organization` on pages where those nodes are not themselves defined.

This is **standard, documented practice** and how site-wide entities are meant to be expressed. Google resolves `@id` references within a page and builds a site-level understanding across pages. Repeating the full `Organization` definition on every page would be worse — more bytes, and more places for it to drift.

**No action required.** Noted so nobody "fixes" it later.

---

## 8. Rich-result eligibility — stated conservatively

Only claims supported by Google's current documentation:

| Type | Eligible for a rich result? |
|---|---|
| `BlogPosting` | **Yes** — Article rich results, subject to Google's content-quality assessment |
| `BreadcrumbList` | **Yes** — breadcrumb trail in the SERP |
| `Organization` | **Partially** — feeds the knowledge panel and entity understanding; not a rich result on its own |
| `Product` + `Offer` | **Yes in principle.** Merchant listing eligibility requires a full offer; `image` was added to satisfy a Search Console validity error. **Whether Google grants it is Google's call, and no eligibility is claimed here** |
| `FAQPage` | **No** — restricted to authoritative government and health sites since August 2023. Markup remains accurate and harmless |
| `CollectionPage`, `WebPage`, `AboutPage`, `ContactPage`, `ItemList`, `Person` | **No** — these aid understanding, not appearance. Correct to include anyway |

**No rich-result eligibility is claimed beyond what Google documents. No schema was added in the hope of a ranking benefit it does not confer.**

---

## 9. Summary

| Metric | Result |
|---|---|
| Routes audited | 8 |
| JSON-LD blocks with invalid JSON | **0** |
| Duplicate `@id` within a page | **0** |
| Conflicting `Organization` / `WebSite` definitions | **0** |
| Fake reviews / ratings / aggregateRating | **0** |
| Fabricated addresses, registrations, legal entities | **0** |
| `Article` schema on non-article pages | **0** |
| Off-domain or non-canonical URLs in the graph | **0** |
| Pages with no structured data | **0** (was 2 — `/blog` and category archives, fixed) |
| Schema types added this pass | 3 (`CollectionPage`, `ItemList`, `BreadcrumbList` on the archive) |
| Schema types deliberately rejected | 10 |

**Structured data score: 90/100.** Deductions: SD-1 thin publisher node on articles (−5), SD-2 author `@id` resolving to 404 (−5).
