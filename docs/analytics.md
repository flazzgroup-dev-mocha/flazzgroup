# Analytics

Everything the site measures, where it goes, and how to check it is working.

- [How it fits together](#how-it-fits-together)
- [Environment variables](#environment-variables)
- [Consent](#consent)
- [Event catalogue](#event-catalogue)
- [Connecting each service](#connecting-each-service)
- [Verifying events](#verifying-events)
- [Debugging](#debugging)
- [Adding an event](#adding-an-event)

---

## How it fits together

```
component  ──►  track("contact_whatsapp", { … })     src/lib/analytics/track.ts
                       │
                       ├──►  dataLayer          ──►  GTM  ──►  GA4
                       ├──►  fbq('track', …)    ──►  Meta Pixel      ┐ same
                       ├──►  POST /api/track    ──►  Conversions API ┘ event_id
                       └──►  gtag('conversion') ──►  Google Ads
```

Components never touch `dataLayer`, `fbq` or `gtag`. They call `track()` with a
name from the catalogue, and that one function decides where it goes. This is
what makes it possible to answer *"what do we actually send?"* by reading one
file instead of grepping for `dataLayer.push`.

| File | Responsibility |
| --- | --- |
| [`lib/analytics/events.ts`](../src/lib/analytics/events.ts) | The catalogue — names, payload types, Meta mapping |
| [`lib/analytics/track.ts`](../src/lib/analytics/track.ts) | Fan-out, deduplication, debug console |
| [`lib/analytics/consent.ts`](../src/lib/analytics/consent.ts) | Consent storage, read before anything fires |
| [`lib/analytics/config.ts`](../src/lib/analytics/config.ts) | Resolves IDs — database first, environment second |
| [`components/analytics/Analytics.tsx`](../src/components/analytics/Analytics.tsx) | Loads the third-party tags |
| [`app/api/track/route.ts`](../src/app/api/track/route.ts) | Meta Conversions API relay |

---

## Environment variables

Every ID can also be set in **Admin → Website Settings → Analytics**, and the
database wins when it has a value. The environment is how a fresh deploy arrives
already configured; the admin panel is how a marketer swaps a pixel at 9pm
without a redeploy.

### Public — safe in the browser, inlined at build time

| Variable | Example | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_GTM_ID` | `GTM-XXXXXXX` | Container ID |
| `NEXT_PUBLIC_GA4_ID` | `G-XXXXXXXXXX` | **Only if you are not using GTM** — see the warning below |
| `NEXT_PUBLIC_META_PIXEL_ID` | `1234567890123456` | |
| `NEXT_PUBLIC_CLARITY_ID` | `abcdefghij` | |
| `NEXT_PUBLIC_GOOGLE_ADS_ID` | `AW-123456789` | |
| `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL` | `AbC-D_efGhIjKlMnOp` | |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | `abc123…` | Search Console ownership |

> **Do not set both `NEXT_PUBLIC_GTM_ID` and `NEXT_PUBLIC_GA4_ID`.** GA4 belongs
> *inside* the GTM container. Loading both means GTM's GA4 tag and the direct
> snippet each fire their own `page_view`, every session is counted twice, and
> nothing in either tool reports a conflict. The code guards against this — the
> direct GA4 snippet is skipped whenever a container ID is present — but the
> setting is still confusing to inherit, so pick one.

### Server-only — never expose these

| Variable | Notes |
| --- | --- |
| `META_ACCESS_TOKEN` | Conversions API token. **Grants write access to your ad account.** |
| `META_PIXEL_ID` | Falls back to the public one; set separately if they differ |
| `META_TEST_EVENT_CODE` | Optional. Routes events to Events Manager → Test events |

Without `META_ACCESS_TOKEN` the endpoint returns `{ skipped: "not_configured" }`
and the browser pixel carries on alone. That is a valid state, not an error.

---

## Consent

Nothing loads until the visitor accepts. Not "loads with a denied flag" —
nothing is requested, no cookie is set, no third party learns the page was
opened.

- Stored at `localStorage["flazz-consent"]` as `{ v, state, at }`
- `v` is `CONSENT_VERSION`; bumping it re-asks everyone
- Applies to `track()` too, including the call to our own `/api/track`
- Synced across tabs — declining in one stops tracking in the others

To re-test the banner: `localStorage.removeItem("flazz-consent")` and reload.

The two buttons are deliberately the same size and weight. A banner where
*Accept* is gold and *Decline* is a grey link is a dark pattern, and consent
that was nudged is not consent.

---

## Event catalogue

Defined and typed in [`events.ts`](../src/lib/analytics/events.ts). Names follow
GA4's convention — lowercase `object_action` — because mixing conventions makes
reports unreadable.

### Conversions

These are what ads should optimise for. All four reach Meta *and* the
Conversions API, sharing one `event_id`.

| Event | Meta | Fires when |
| --- | --- | --- |
| `contact_whatsapp` | `Contact` | A WhatsApp link is opened — chat panel, or a direct button |
| `contact_telegram` | `Contact` | A Telegram link is opened — chat panel, the FAQ "Tanya admin" button, or the article CTA |
| `support_chat_action` | `Lead` | A pre-written opener is chosen in the chat panel |
| `community_click` | `Contact` | A community group or channel is opened |

`location` says which surface it came from: `support_chat`, `support_chat_direct`,
`faq`, `article_cta`.

> **One interaction, one Google Ads conversion.** Choosing an opener in the chat
> panel emits *two* events — `support_chat_action` and the `contact_*` for the
> channel it went out on — because GA4 and Meta distinguish events by name and
> both numbers are useful there. Google Ads does not: there is one conversion
> action behind every event in `GOOGLE_ADS_CONVERSIONS`, so both firing would
> report one click as two conversions and teach the campaign to bid against a
> number twice the truth. The companion call passes
> `{ adsConversion: false }` as `track()`'s third argument. Pass it on any
> future event that accompanies an existing conversion rather than replacing it.

`Lead` is reserved for a contact that carried intent. A bare tap on a footer
icon is a `Contact`. Treating every outbound click as a Lead teaches an ad
account to find people who never message.

### Acquisition

| Event | Parameters |
| --- | --- |
| `banner_click` | `banner_id`, `position`, `destination`, `creative_name` |
| `cta_click` | `cta_location`, `cta_text`, `destination` |
| `brand_click` | `item_id`, `item_name`, `destination` |
| `channel_click` | `channel`, `destination`, `location` |
| `support_chat_open` | — |

### Blog

| Event | Parameters |
| --- | --- |
| `blog_view` | `item_id`, `item_name`, `category`, `author`, `reading_minutes` |
| `blog_scroll_depth` | `item_id`, `item_name`, `percent_scrolled` (25/50/75/100) |
| `blog_read_time` | `item_id`, `engaged_seconds`, `reading_minutes`, `completion_ratio` |
| `blog_share` | `item_id`, `item_name`, `method` |
| `blog_search` | `search_term`, `results_count` |
| `search_result_click` | `search_term`, `item_id`, `item_name`, `position` |
| `related_article_click` | `from_item_id`, `item_id`, `item_name`, `position` |
| `blog_category_click` | `item_id`, `item_name`, `location` |
| `blog_tag_click` | `item_id`, `item_name` — **defined, never fired** |

`blog_read_time` counts **engaged** seconds — the timer stops when the tab is
hidden, so a page left open overnight is not a twelve-hour read. It is sent on
`visibilitychange`, not `beforeunload`, because mobile browsers frequently never
fire unload and that is where most of this traffic is.

`blog_scroll_depth` fires once per threshold per article. Scrolling back up and
down again does not re-report.

Two names in the catalogue have no call site yet: `blog_tag_click`, because
article tags render as plain chips rather than links to a tag archive, and
`cta_click`, which is the generic slot the more specific events above ended up
covering. Both are kept — they are typed and ready — but do not build a GTM
trigger for either expecting traffic.

### Automatic

GA4's Enhanced Measurement covers `page_view`, `session_start`, `scroll`,
`click`, `outbound_click`, `file_download` and `form_submit` with no code.
Leave it on — the events above are the ones it *cannot* infer.

One exception: the App Router navigates without a document load, so GTM and the
pixel only ever see the first page.
[`PageViewTracker`](../src/components/analytics/PageViewTracker.tsx) emits
`page_view` for subsequent navigations, and deliberately skips the first render
so it does not double-count the one they already sent.

---

## Connecting each service

### Google Tag Manager

1. Create a container at [tagmanager.google.com](https://tagmanager.google.com) → **Web**
2. Put the `GTM-` ID in **Admin → Website Settings → Analytics**
3. Accept the cookie banner, then confirm in **Preview**

### GA4 (through GTM)

1. Create a GA4 property, copy the `G-` measurement ID
2. In GTM: **Tag → Google Analytics: GA4 Configuration**, trigger *All Pages*
3. For each custom event, add **GA4 Event** with a **Custom Event** trigger
   matching the event name — `track()` pushes the name as `event`, so the
   trigger is a literal string match
4. Register the parameters you want in reports as
   **Admin → Custom definitions**. GA4 collects unregistered parameters but will
   not show them, which is the most common reason a working event "does not
   appear".

### Meta Pixel + Conversions API

1. Events Manager → **Data sources** → copy the pixel ID
2. **Conversions API → Generate access token** → set `META_ACCESS_TOKEN`
3. Optional: copy the test event code into `META_TEST_EVENT_CODE`
4. Trigger a WhatsApp click and watch **Test events**

You should see each conversion **once**, marked as received from both Browser
and Server. Two separate rows means deduplication is broken — check that the
same `event_id` reached both.

### Microsoft Clarity

1. Create a project at [clarity.microsoft.com](https://clarity.microsoft.com)
2. Copy the project ID into the admin panel

Loaded with `lazyOnload`. Session recording is heavy and has no business
competing with the hero image.

### Google Ads

1. **Goals → Conversions → New** → *Website*
2. Choose **Google tag** setup; copy the conversion ID (`AW-…`) and label
3. Both go in the admin panel

Fires on `contact_whatsapp`, `contact_telegram` and `support_chat_action`.

### Google Search Console

1. Add the property → **HTML tag** method
2. Copy only the `content` value into the admin panel
3. The tag renders server-side on every page, regardless of consent — it
   identifies the site to a crawler, not the visitor to anyone

`/robots.txt` and `/sitemap.xml` are generated from the database and update as
articles are published.

---

## Verifying events

| Tool | Shows |
| --- | --- |
| Browser console (dev) | Every `track()` call and where it went |
| GTM **Preview** | dataLayer pushes and which tags fired |
| GA4 **DebugView** | Events arriving, with parameters |
| Meta **Test events** | Pixel and CAPI side by side, with dedup status |
| Clarity **Recordings** | Available a few minutes later |

Quick check that the whole chain is alive:

```js
// In the browser console, after accepting the banner
window.dataLayer            // pushes are appended here
typeof window.fbq           // "function" once the pixel has loaded
```

---

## Debugging

In development every call is logged, grouped and collapsed:

```
▸ Analytics  banner_click
    { banner_id: "cms…", position: 1, destination: "#royal-dream" }
    → dataLayer, capi
```

The `→` line is the useful part: it lists the destinations that actually
accepted the event. `→ nowhere (no destination configured)` means no IDs are
set. `→ blocked: no consent` means the banner has not been accepted.

The whole logger is behind `process.env.NODE_ENV === "development"`, which is
inlined at build time, so it is dead code the minifier removes from production.

**Common problems**

| Symptom | Cause |
| --- | --- |
| Nothing logs at all | Consent not accepted |
| Logs, but `→ dataLayer` only | Pixel/Ads IDs are blank or disabled |
| Every page view counted twice | GTM *and* direct GA4 both configured |
| Meta shows two of each conversion | `event_id` not reaching both sides |
| Event fires, GA4 shows no parameters | Parameter not registered as a custom definition |

---

## Adding an event

1. Add the name and its payload type to `AnalyticsEvents` in
   [`events.ts`](../src/lib/analytics/events.ts)
2. If Meta should see it, add it to `META_EVENT_MAP`; for server-side delivery
   add it to `SERVER_SIDE_EVENTS`
3. Call `track("your_event", { … })`, or use `<TrackedLink>` for a plain anchor
4. Add a GA4 Event tag in GTM with a matching Custom Event trigger

The payload is type-checked against the catalogue, so a typo or a missing field
is a build error rather than a gap someone notices in GA4 three weeks later.
