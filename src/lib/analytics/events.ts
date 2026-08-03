/**
 * The event catalogue.
 *
 * One file, one naming rule, one place to look. Analytics rots when event
 * names are invented at the call site: `banner_click` here, `bannerClicked`
 * there, `click_banner` in a component someone copied. Names live here, typed,
 * and `track()` will not accept anything else.
 *
 * Naming follows GA4's convention — lowercase snake_case, `object_action` —
 * because that is what GA4's own automatic events use and mixing conventions
 * makes reports unreadable. This is not an ecommerce site, but the shape is
 * deliberately ecommerce-like (`item_id`, `item_name`) so the standard GA4
 * reports and Meta's catalogue matching have something familiar to bind to.
 */

export type AnalyticsEventName = keyof AnalyticsEvents;

export type AnalyticsEvents = {
  // ------------------------------------------------------------ acquisition
  /** A hero banner was clicked through to its destination. */
  banner_click: {
    banner_id: string;
    /** 1-based, as a human would describe the slide. */
    position: number;
    destination: string;
    creative_name?: string;
  };

  /** Any primary call to action outside the hero slider. */
  cta_click: {
    cta_location: string;
    cta_text: string;
    destination: string;
  };

  brand_click: {
    item_id: string;
    item_name: string;
    destination: string;
  };

  // --------------------------------------------------------------- contact
  //
  // These are the conversions. `contact_*` maps to Meta's `Contact` and is what
  // Google Ads should import, so the naming is kept boring and stable.
  contact_whatsapp: ContactParams;
  contact_telegram: ContactParams;

  /** A community group or channel — Telegram groups, WhatsApp groups. */
  community_click: {
    item_id: string;
    item_name: string;
    channel: string;
    destination: string;
  };

  /** Footer / navbar social icons. Weaker intent than contact_*. */
  channel_click: {
    channel: string;
    destination: string;
    location: string;
  };

  // ------------------------------------------------------------------ blog
  blog_view: {
    item_id: string;
    item_name: string;
    category?: string;
    author?: string;
    reading_minutes: number;
  };

  blog_share: {
    item_id: string;
    item_name: string;
    method: "whatsapp" | "telegram" | "native" | "copy_link";
  };

  blog_search: {
    search_term: string;
    results_count: number;
  };

  search_result_click: {
    search_term: string;
    item_id: string;
    item_name: string;
    /** 1-based rank within the result list. */
    position: number;
  };

  related_article_click: {
    /** The article being read when the click happened. */
    from_item_id: string;
    item_id: string;
    item_name: string;
    position: number;
  };

  blog_category_click: {
    item_id: string;
    item_name: string;
    location: string;
  };

  blog_tag_click: {
    item_id: string;
    item_name: string;
  };

  /** Fired once per threshold, per article. See ArticleEngagement. */
  blog_scroll_depth: {
    item_id: string;
    item_name: string;
    percent_scrolled: 25 | 50 | 75 | 100;
  };

  /**
   * Time actually spent on an article, sent once when the page is hidden or
   * unloaded. Excludes time in a background tab — see ArticleEngagement.
   */
  blog_read_time: {
    item_id: string;
    item_name: string;
    engaged_seconds: number;
    reading_minutes: number;
    /** engaged_seconds ÷ the estimated read time, capped at 3. */
    completion_ratio: number;
  };

  // --------------------------------------------------------------- support
  support_chat_open: Record<string, never>;
  support_chat_action: {
    item_name: string;
    channel: string;
    destination: string;
  };
};

type ContactParams = {
  /** Where on the site the click happened — "support_chat", "footer", … */
  location: string;
  destination: string;
  /** Present when the contact came from a pre-written opener. */
  item_name?: string;
};

/**
 * Which events are conversions.
 *
 * Meta needs its own vocabulary, so the mapping lives here rather than being
 * decided at each call site. Anything absent is sent to GA4 only.
 *
 * `Lead` is deliberately reserved for a contact that carried intent — a
 * pre-written opener from the support panel — while a bare tap on a social
 * icon is `Contact`. Treating every outbound click as a Lead is how an ad
 * account learns to optimise for people who never message.
 */
export const META_EVENT_MAP = {
  contact_whatsapp: "Contact",
  contact_telegram: "Contact",
  support_chat_action: "Lead",
  blog_view: "ViewContent",
  community_click: "Contact",
} as const satisfies Partial<Record<AnalyticsEventName, MetaStandardEvent>>;

export type MetaStandardEvent =
  | "PageView"
  | "ViewContent"
  | "Lead"
  | "Contact"
  | "Search";

/** Events worth the round trip to the Conversions API. */
export const SERVER_SIDE_EVENTS = new Set<AnalyticsEventName>([
  "contact_whatsapp",
  "contact_telegram",
  "support_chat_action",
  "community_click",
  "blog_view",
]);

/** Events that should also fire a Google Ads conversion. */
export const GOOGLE_ADS_CONVERSIONS = new Set<AnalyticsEventName>([
  "contact_whatsapp",
  "contact_telegram",
  "support_chat_action",
]);
