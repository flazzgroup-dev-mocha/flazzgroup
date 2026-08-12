# Internal Linking Audit — FLAZZ GROUP

**Date:** 12 August 2026
**Method:** breadth-first crawl of a local production build (`next build` + `next start`, real Neon data), following only `<a href>` in the rendered document — the RSC payload in `<script>` tags was excluded so the graph reflects what a crawler actually sees. Query parameters other than `?kategori=` were normalised away; `/api`, `/admin` and feed routes were excluded.

**Headline result: the link graph is healthy. Zero orphans, zero weak pages, maximum crawl depth 2, and every sitemap URL is reachable by following links from the homepage.**

The recommendations in this document are therefore about *preparing for growth*, not repairing damage. Nothing here is urgent, and — as instructed — no artificial links were added.

---

## 1. Current site architecture

```
/                                    depth 0   ← commercial hub
├── /#royal-dream   (products, prices)          the money section
├── /#brands        (6 brand storefronts → external)
├── /#promo /#community /#faq
├── /about                           depth 1
├── /contact                         depth 1
├── /privacy-policy                  depth 1
├── /terms                           depth 1
└── /blog                            depth 1   ← content hub
    ├── /blog?kategori=panduan-top-up      depth 2   (4 posts)
    ├── /blog?kategori=chip-and-koin       depth 2   (1 post)
    └── 4 published articles          depth 1–2
```

Four categories exist with zero published posts (`tips-strategi`, `pembayaran`, `flazz-group`, `top-up-royal-dream`). They are correctly **not linked and not in the sitemap** — both the archive's filter chips and the sitemap filter on `_count.posts > 0`. No empty archive is exposed. **PASS.**

---

## 2. Measured link graph

`in` = number of **unique** pages linking here. `out` = unique internal destinations.

| Depth | in | out | Page |
|---:|---:|---:|---|
| 0 | 11 | 8 | `/` |
| 1 | 11 | 5 | `/about` |
| 1 | 11 | 4 | `/contact` |
| 1 | 11 | 4 | `/privacy-policy` |
| 1 | 11 | 4 | `/terms` |
| 1 | 8 | 11 | `/blog` |
| 1 | 6 | 10 | `/blog/beli-chip-royal-dream-panduan-aman-cepat-and-murah` |
| 1 | 6 | 10 | `/blog/top-up-royal-dream-murah-7-cara-dapat-harga-termurah` |
| 1 | 6 | 10 | `/blog/top-up-royal-dream-via-pulsa-telkomsel-xl-indosat-tri-and-smartfren` |
| 2 | 5 | 10 | `/blog/cara-top-up-royal-dream-2026-panduan-lengkap-sampai-chip-masuk-hitungan-detik` |
| 2 | 5 | 10 | `/blog?kategori=panduan-top-up` |
| 2 | 3 | 8 | `/blog?kategori=chip-and-koin` |

**12 pages reachable. Minimum inbound = 3. Maximum depth = 2.**

---

## 3. Important pages, and whether they get the authority they deserve

| Page | Role | Verdict |
|---|---|---|
| `/` | Commercial hub — the catalogue and prices live here | **Strongest.** 11 inbound, linked from every page's logo, footer and nav |
| `/#royal-dream` | The actual money section | **Well fed.** Every article links to it **3×**; nav, footer and hero all point at it |
| `/blog` | Content hub | **Healthy.** 8 inbound; links out to 11 |
| Articles | Topical depth | **Healthy.** 5–6 unique inbound each |
| `/about` | Trust / E-E-A-T | **Strong.** 11 inbound (nav + footer sitewide) |
| `/contact` | Conversion support | **Strong.** 11 inbound |
| Legal pages | Trust signals | **Strong.** 11 inbound each — appropriate; they need to be *findable*, not prominent |

### Article → commercial page (verified)

```
cara-top-up-royal-dream-2026…          href="/#royal-dream" ×3
beli-chip-royal-dream-panduan-aman…    href="/#royal-dream" ×3
top-up-royal-dream-murah-7-cara…       href="/#royal-dream" ×3
top-up-royal-dream-via-pulsa…          href="/#royal-dream" ×3
```

**This is the single most important relationship in the site's architecture and it is working.** The blog is not an isolated content island — every article routes readers and crawl equity back to the page that sells. That is exactly what the brief asked to be checked, and it passes.

---

## 4. Orphan pages

**None.** No page has fewer than 3 unique inbound links.

## 5. Weakly linked pages

**None below the threshold.** The weakest is `/blog?kategori=chip-and-koin` at 3 inbound, which is proportionate — it holds one article.

## 6. Pages with the strongest internal authority

`/`, `/about`, `/contact`, `/privacy-policy`, `/terms` — all at 11 inbound, because navbar and footer render sitewide.

**Worth noting honestly:** the legal pages carry the *same* internal link weight as `/about` and `/contact`, purely because both live in the footer's "Informasi" column. That is normal and not worth engineering around — PageRank sculpting by removing footer links is a discredited practice and would hurt users.

## 7. Pages with the weakest internal authority

`/blog?kategori=chip-and-koin` (3). Adequate. No action.

---

## 8. Sitemap ↔ crawl reachability

```
=== SITEMAP URLS NOT REACHABLE BY CRAWLING FROM /
(none)
```

**Every URL in `sitemap.xml` is reachable by following links from the homepage.** This matters more than it sounds: a URL that exists only in the sitemap is a URL Google is being *told about* but shown no reason to value. Nothing here is in that position.

---

## 9. Anchor text quality

Sampled from the crawl:

| Target | Anchor text used |
|---|---|
| `/about` | "Tentang", "Tentang FLAZZ GROUP" |
| `/blog` | "Lihat semua artikel", "blog FLAZZ GROUP", "Blog", "Kembali ke blog" |
| Articles | Full article titles |
| `/#royal-dream` | "Lihat layanan top up", "Lihat daftar harga", "Mulai top up" |
| `/contact` | "Hubungi kami", "kanal customer service", "halaman kontak" |

**PASS.** Descriptive, varied, natural Indonesian. No "click here". No repeated exact-match commercial anchors — the `/#royal-dream` anchors are three *different* useful phrases rather than "top up royal dream murah" three times, which is the right instinct.

**One cosmetic artefact:** prev/next controls produce accessible names like `"SebelumnyaBeli Chip Royal Dream: Panduan Aman, Cepat & Murah"` because the label sits inside the link. The accessible name is still descriptive and unique — screen readers announce "Sebelumnya, Beli Chip Royal Dream…". **No change required.**

---

## 10. Cannibalisation and overlapping intent

Four articles, analysed for competing intent:

| Article | Primary intent | Risk |
|---|---|---|
| `cara-top-up-royal-dream-2026-…` | *How do I do it* | — |
| `top-up-royal-dream-murah-7-cara-…` | *How do I pay less* | — |
| `top-up-royal-dream-via-pulsa-…` | *Can I pay with phone credit* | — |
| `beli-chip-royal-dream-panduan-aman-…` | *Where do I buy safely* | Mild overlap with "cara" |

**Verdict: low risk today.** The four intents are genuinely distinct. Two things to watch:

1. **"beli chip" vs "cara top up"** — both partly answer "how do I get chips". They currently differentiate well (safety/trust vs mechanics). Keep them differentiated; do not let either drift into a general "how to top up" guide.
2. **The empty `top-up-royal-dream` category.** If populated, `/blog?kategori=top-up-royal-dream` would compete with the homepage's `/#royal-dream` commercial section for the same head term. **Recommendation: retire this category, or rename it to something informational** (e.g. "Panduan Royal Dream"). The commercial page should own that query, not a blog archive.

---

## 11. Recommended hub pages

The current two-hub model (`/` commercial, `/blog` content) is correct at this size. **Do not add hub pages yet** — a hub with three articles under it is a thin page, and this site has four articles in total.

**Trigger point:** once `panduan-top-up` holds **8–10 articles**, a dedicated pillar page becomes worth building. At that point, and not before:

- Create one pillar page targeting the head term (e.g. `/panduan-top-up-royal-dream`) as a real, substantial guide.
- Link it from the homepage and from every article in the cluster.
- Have it link out to each supporting article with descriptive anchors.

Building this now would create exactly the thin doorway page the brief prohibits.

---

## 12. Recommended article-to-article links

The prev/next control and the related-articles strip already connect every article to every other one — with four articles, the cluster is fully connected. **No additional article-to-article links are recommended; there is nowhere left to link to.**

For the future, the rule to follow when publishing: **each new article should carry 2–4 contextual in-body links to genuinely related articles**, placed where a reader would actually want them, not appended as a link block.

Worked example for the draft currently in the CMS (`royal-dream-apa-itu-cara-main-and-semua-mode-permainannya`, status `DRAFT`) — this is a beginner explainer, so it is a natural feeder into the transactional guides:

| From | To | Suggested anchor | Placement |
|---|---|---|---|
| "Apa itu Royal Dream" | `/blog/cara-top-up-royal-dream-2026-…` | "cara top up Royal Dream langkah demi langkah" | Where the article first mentions needing coins |
| "Apa itu Royal Dream" | `/blog/top-up-royal-dream-murah-7-cara-…` | "cara mendapatkan harga termurah" | In a section about cost |
| "Apa itu Royal Dream" | `/#royal-dream` | "daftar harga top up Royal Dream" | Closing CTA |

Reciprocally, `cara-top-up-…` gains from linking back to the explainer for readers who do not yet know the game — once it is published.

---

## 13. Recommended article-to-commercial-page links

**Already correct — no change required.** Each article links to `/#royal-dream` three times with varied, natural anchors. Adding more would cross into manipulation and would degrade the reading experience.

**Rule to preserve when publishing:** 2–3 contextual links to the commercial section per article, at the points where a reader has just learned something that makes them ready to buy — not stacked in the introduction.

---

## 14. Recommended navigation changes

**None required.** Current header: Royal Dream · Brands · Community · FAQ · Tentang · Kontak.

- Every homepage section link is root-absolute (`/#brands`, not `#brands`), so they work from `/blog` and every article. This was a real bug that is already fixed — bare fragments resolved against the article's own URL, making every header link silently dead across the entire blog.
- The header deliberately excludes the legal pages. **Correct** — they belong in the footer.

**RECOMMENDATION (defer):** once the blog has a pillar page, add it to the header. Not before.

---

## 15. Recommended footer changes

**None required.** Four columns: Layanan (section links) · Brand (live from the database) · Community (live) · Informasi (About, Kontak, Privacy Policy, Terms).

Three of four columns are derived from live data, so they cannot drift from what the site actually shows. Brand and community links are passed through `resolveHref()` so an admin-entered `#royal-dream` becomes `/#royal-dream` and works from every page.

**RECOMMENDATION (P3):** the Brand column is capped at `slice(0, 5)` while six brands are active — NEOPARTY never appears in the footer. It *is* linked from the homepage and `/about` brand cards, so it is not orphaned. Either raise the cap to 6 or leave it; cosmetic either way.

---

## 16. Recommended related-content strategy

**The existing implementation is good and should be kept.** `getRelatedPosts` selects same-category articles newest-first, then **tops up from the wider archive** so the strip is never half-empty — the failure mode that makes related-content blocks look broken on small sites.

**Should automatic related-content links be expanded? No — not at this size, and here is the reasoning the brief asked for:**

- With four articles, "related" is already "all of them". Any algorithm is a no-op.
- Automatic in-body link injection into CMS article HTML would mean rewriting stored content or post-processing it at render. The render path already does one careful transformation (`withHeadingAnchors`, which injects heading ids at render time rather than storing them, so renaming a heading never leaves a stale anchor). Adding automatic link injection to that path risks inserting links into headings, code blocks or existing anchors.
- Editorially placed in-body links outperform injected ones because they sit where the reader's question actually arises.

**Verdict: keep the current card-based related strip. Do not build automatic in-body linking.** Revisit only past ~30 articles, and even then prefer an editor-facing suggestion tool over automatic insertion.

---

## 17. Crawl depth assessment

| Depth | Pages |
|---:|---|
| 0 | 1 |
| 1 | 8 |
| 2 | 3 |

Maximum depth 2. Every indexable page is within two clicks of the homepage — comfortably inside any reasonable crawl-depth budget.

**Scaling note:** `/blog` paginates at 9 posts per page. At 4 articles this is irrelevant. Past ~19 articles, page-3 content sits at depth 3+, and category archives become the mechanism that keeps depth low. That is another reason to **populate the empty categories rather than delete them** — but only when there are real articles to put in them.

---

## 18. Summary

| Metric | Result |
|---|---|
| Pages crawled from `/` | 12 |
| Orphan pages | **0** |
| Pages with < 3 unique inbound links | **0** |
| Maximum crawl depth | **2** |
| Sitemap URLs not reachable by crawling | **0** |
| Broken internal links | **0** |
| Dead fragment links | **0** |
| Articles linking to the commercial page | **4 / 4** (3 links each) |
| Generic anchors ("click here" / bare "read more") | **0** |
| Links added by this audit | **0** |

**Internal linking score: 90/100.**

Deductions are for the *size and shape* of the graph, not for defects: only four published articles (−4), category archives on query parameters rather than paths (−3), and no topical pillar page yet (−3). All three resolve with content growth rather than with code.

**No artificial links were created. No anchor text was manipulated. Nothing in this document recommends adding a link that a reader would not benefit from.**
