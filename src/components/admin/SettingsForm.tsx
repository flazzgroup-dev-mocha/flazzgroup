"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";

import { ApiError, apiRequest } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import type { FieldErrors, HomepageModeValue } from "@/lib/validators";
import type { WebsiteSettings } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { SwitchRow } from "@/components/ui/switch";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/surface";
import { ImageUploader } from "@/components/admin/ImageUploader";

type Draft = {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  logoUrl: string;
  faviconUrl: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  ogImageUrl: string;
  tickerEnabled: boolean;
  tickerText: string;
  footerTagline: string;
  footerCopyright: string;
  footerDisclaimer: string;
  telegramUrl: string;
  whatsappUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  homepageMode: HomepageModeValue;
  showHero: boolean;
  showPopular: boolean;
  showProducts: boolean;
  showBrands: boolean;
  showFeatures: boolean;
  showPayment: boolean;
  showCommunity: boolean;
  showFaq: boolean;
  gtmId: string;
  gtmEnabled: boolean;
  ga4Id: string;
  ga4Enabled: boolean;
  metaPixelId: string;
  metaPixelEnabled: boolean;
  clarityId: string;
  clarityEnabled: boolean;
  googleAdsId: string;
  googleAdsConversionLabel: string;
  googleAdsEnabled: boolean;
  googleSiteVerification: string;
};

/**
 * The two things the homepage's main slot can be.
 *
 * Rendered as a radio group rather than two switches, and that is the whole
 * point of this control: the underlying column holds one value, so "both on"
 * and "both off" are states the panel cannot produce and the database cannot
 * hold. The pair of booleans this replaces could reach both, and production
 * had reached "both off" — a homepage with an empty middle.
 */
const homepageModes: {
  value: HomepageModeValue;
  label: string;
  hint: string;
}[] = [
  {
    value: "GAME",
    label: "Game",
    hint: "The homepage opens on the game picker. A visitor chooses a game, then goes to that game’s page.",
  },
  {
    value: "TOP_UP",
    label: "Top Up",
    hint: "The homepage opens on the top-up catalogue for whichever game has Top up enabled in Games.",
  },
];

const sectionToggles: {
  key: keyof Draft;
  label: string;
  hint: string;
}[] = [
  { key: "showHero", label: "Hero slider", hint: "Banners and the stats strip." },
  { key: "showPopular", label: "Popular services", hint: "“Populer Hari Ini” cards." },
  {
    key: "showProducts",
    label: "Advertise the top up",
    hint: "Links the active game’s top-up page from the menu, footer and sitemap. The page itself always answers.",
  },
  { key: "showBrands", label: "Brands", hint: "“Brand Kami” grid." },
  { key: "showFeatures", label: "Features", hint: "“Why FLAZZ” grid." },
  { key: "showPayment", label: "Payment methods", hint: "Marquee of accepted methods." },
  { key: "showCommunity", label: "Community", hint: "Telegram, WhatsApp and groups." },
  { key: "showFaq", label: "FAQ", hint: "Accordion and FAQ structured data." },
];

/**
 * One row per integration.
 *
 * Driven by data rather than eight hand-written blocks: they differ only by
 * label and placeholder, and a table makes it obvious that every one of them
 * has its own switch.
 */
const analyticsFields: {
  idKey: keyof Draft;
  enabledKey: keyof Draft;
  label: string;
  hint: string;
  idLabel: string;
  idHint: string;
  placeholder: string;
}[] = [
  {
    idKey: "gtmId",
    enabledKey: "gtmEnabled",
    label: "Google Tag Manager",
    hint: "The container. Everything else Google-shaped is best added inside it.",
    idLabel: "Container ID",
    idHint: "Found top-right in the GTM workspace.",
    placeholder: "GTM-XXXXXXX",
  },
  {
    idKey: "ga4Id",
    enabledKey: "ga4Enabled",
    label: "Google Analytics 4",
    hint: "Only used when there is no GTM container — otherwise GA4 belongs inside GTM, and loading both counts every page view twice.",
    idLabel: "Measurement ID",
    idHint: "Admin → Data streams → your web stream.",
    placeholder: "G-XXXXXXXXXX",
  },
  {
    idKey: "metaPixelId",
    enabledKey: "metaPixelEnabled",
    label: "Meta Pixel",
    hint: "Browser-side half of the Meta setup. The server half needs META_ACCESS_TOKEN in the environment.",
    idLabel: "Pixel ID",
    idHint: "Events Manager → Data sources.",
    placeholder: "1234567890123456",
  },
  {
    idKey: "clarityId",
    enabledKey: "clarityEnabled",
    label: "Microsoft Clarity",
    hint: "Heatmaps and session recordings. Loaded last, after everything else has settled.",
    idLabel: "Project ID",
    idHint: "Settings → Overview in Clarity.",
    placeholder: "abcdefghij",
  },
  {
    idKey: "googleAdsId",
    enabledKey: "googleAdsEnabled",
    label: "Google Ads",
    hint: "Fires a conversion on WhatsApp and Telegram contacts.",
    idLabel: "Conversion ID",
    idHint: "Google Ads → Goals → Conversions.",
    placeholder: "AW-123456789",
  },
];

export function SettingsForm({ settings }: { settings: WebsiteSettings }) {
  const router = useRouter();

  const [draft, setDraft] = useState<Draft>({
    siteName: settings.siteName,
    siteDescription: settings.siteDescription,
    siteUrl: settings.siteUrl,
    logoUrl: settings.logoUrl,
    faviconUrl: settings.faviconUrl,
    seoTitle: settings.seoTitle,
    seoDescription: settings.seoDescription,
    seoKeywords: settings.seoKeywords,
    ogImageUrl: settings.ogImageUrl ?? "",
    tickerEnabled: settings.tickerEnabled,
    tickerText: settings.tickerText,
    footerTagline: settings.footerTagline,
    footerCopyright: settings.footerCopyright,
    footerDisclaimer: settings.footerDisclaimer,
    telegramUrl: settings.telegramUrl,
    whatsappUrl: settings.whatsappUrl,
    instagramUrl: settings.instagramUrl,
    tiktokUrl: settings.tiktokUrl,
    youtubeUrl: settings.youtubeUrl,
    homepageMode: settings.homepageMode,
    showHero: settings.showHero,
    showPopular: settings.showPopular,
    showProducts: settings.showProducts,
    showBrands: settings.showBrands,
    showFeatures: settings.showFeatures,
    showPayment: settings.showPayment,
    showCommunity: settings.showCommunity,
    showFaq: settings.showFaq,
    gtmId: settings.gtmId,
    gtmEnabled: settings.gtmEnabled,
    ga4Id: settings.ga4Id,
    ga4Enabled: settings.ga4Enabled,
    metaPixelId: settings.metaPixelId,
    metaPixelEnabled: settings.metaPixelEnabled,
    clarityId: settings.clarityId,
    clarityEnabled: settings.clarityEnabled,
    googleAdsId: settings.googleAdsId,
    googleAdsConversionLabel: settings.googleAdsConversionLabel,
    googleAdsEnabled: settings.googleAdsEnabled,
    googleSiteVerification: settings.googleSiteVerification,
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  /**
   * The version this form is editing against.
   *
   * Held in state rather than read from the `settings` prop on each save,
   * because this screen stays mounted after saving: the prop only refreshes
   * asynchronously, so a second save would still be quoting the version from
   * before the first and would be refused as stale. The response carries the
   * new stamp, so it is adopted straight from there.
   */
  const [version, setVersion] = useState<string | Date>(settings.updatedAt);

  const patch = (values: Partial<Draft>) =>
    setDraft((current) => ({ ...current, ...values }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setErrors({});

    try {
      const saved = await apiRequest<{ updatedAt: string }>("/api/settings", {
        method: "PUT",
        body: { ...draft, updatedAt: version },
      });

      setVersion(saved.updatedAt);
      toast.success("Settings saved");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fields);
        toast.error(error.message);
        if (error.status === 409) router.refresh();
      } else {
        toast.error("Could not save settings.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 pb-24">
      {/* Identity */}
      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <ImageUploader
              value={draft.logoUrl}
              onChange={(url) => patch({ logoUrl: url })}
              folder="logo"
              label="Logo"
              hint="Shown in the navbar and footer."
              error={errors.logoUrl}
              required
            />
            <ImageUploader
              value={draft.faviconUrl}
              onChange={(url) => patch({ faviconUrl: url })}
              folder="favicon"
              label="Favicon"
              hint="Browser tab icon. A square SVG or PNG works best."
              error={errors.faviconUrl}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Website name" htmlFor="siteName" error={errors.siteName} required>
              <Input
                id="siteName"
                value={draft.siteName}
                onChange={(e) => patch({ siteName: e.target.value })}
                aria-invalid={Boolean(errors.siteName)}
              />
            </Field>

            <Field label="Website URL" htmlFor="siteUrl" error={errors.siteUrl} required hint="Used for canonical links and structured data.">
              <Input
                id="siteUrl"
                value={draft.siteUrl}
                onChange={(e) => patch({ siteUrl: e.target.value })}
                aria-invalid={Boolean(errors.siteUrl)}
              />
            </Field>
          </div>

          <Field label="Website description" htmlFor="siteDescription" error={errors.siteDescription}>
            <Textarea
              id="siteDescription"
              value={draft.siteDescription}
              onChange={(e) => patch({ siteDescription: e.target.value })}
            />
          </Field>
        </CardContent>
      </Card>

      {/* SEO */}
      <Card>
        <CardHeader>
          <CardTitle>SEO & sharing</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="SEO title" htmlFor="seoTitle" error={errors.seoTitle} required hint="Shown in search results and the browser tab.">
            <Input
              id="seoTitle"
              value={draft.seoTitle}
              onChange={(e) => patch({ seoTitle: e.target.value })}
              aria-invalid={Boolean(errors.seoTitle)}
            />
          </Field>

          <Field label="SEO description" htmlFor="seoDescription" error={errors.seoDescription} hint="Around 155 characters reads best in search results.">
            <Textarea
              id="seoDescription"
              value={draft.seoDescription}
              onChange={(e) => patch({ seoDescription: e.target.value })}
            />
          </Field>

          <Field label="Keywords" htmlFor="seoKeywords" error={errors.seoKeywords} hint="Comma separated.">
            <Input
              id="seoKeywords"
              value={draft.seoKeywords}
              onChange={(e) => patch({ seoKeywords: e.target.value })}
            />
          </Field>

          <ImageUploader
            value={draft.ogImageUrl}
            onChange={(url) => patch({ ogImageUrl: url })}
            folder="logo"
            label="Social share image"
            aspect="wide"
            hint="1200×630 works best. Leave empty to use the generated card."
            error={errors.ogImageUrl}
          />
        </CardContent>
      </Card>

      {/* Navbar + footer */}
      <Card>
        <CardHeader>
          <CardTitle>Navbar & footer</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <SwitchRow
            id="tickerEnabled"
            label="Show the promo ticker"
            hint="The thin strip above the navbar."
            checked={draft.tickerEnabled}
            onCheckedChange={(value) => patch({ tickerEnabled: value })}
          />

          <Field label="Ticker text" htmlFor="tickerText" error={errors.tickerText}>
            <Input
              id="tickerText"
              value={draft.tickerText}
              onChange={(e) => patch({ tickerText: e.target.value })}
            />
          </Field>

          <Field label="Footer tagline" htmlFor="footerTagline" error={errors.footerTagline}>
            <Input
              id="footerTagline"
              value={draft.footerTagline}
              onChange={(e) => patch({ footerTagline: e.target.value })}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Copyright" htmlFor="footerCopyright" error={errors.footerCopyright} hint="The year is added automatically.">
              <Input
                id="footerCopyright"
                value={draft.footerCopyright}
                onChange={(e) => patch({ footerCopyright: e.target.value })}
              />
            </Field>

            <Field label="Disclaimer" htmlFor="footerDisclaimer" error={errors.footerDisclaimer}>
              <Input
                id="footerDisclaimer"
                value={draft.footerDisclaimer}
                onChange={(e) => patch({ footerDisclaimer: e.target.value })}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Contact & social</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Telegram" htmlFor="telegramUrl" error={errors.telegramUrl} hint="Also used by the “Tanya admin” button.">
            <Input
              id="telegramUrl"
              value={draft.telegramUrl}
              onChange={(e) => patch({ telegramUrl: e.target.value })}
            />
          </Field>
          <Field label="WhatsApp" htmlFor="whatsappUrl" error={errors.whatsappUrl}>
            <Input
              id="whatsappUrl"
              value={draft.whatsappUrl}
              onChange={(e) => patch({ whatsappUrl: e.target.value })}
            />
          </Field>
          <Field label="Instagram" htmlFor="instagramUrl" error={errors.instagramUrl}>
            <Input
              id="instagramUrl"
              value={draft.instagramUrl}
              onChange={(e) => patch({ instagramUrl: e.target.value })}
            />
          </Field>
          <Field label="TikTok" htmlFor="tiktokUrl" error={errors.tiktokUrl}>
            <Input
              id="tiktokUrl"
              value={draft.tiktokUrl}
              onChange={(e) => patch({ tiktokUrl: e.target.value })}
            />
          </Field>
          <Field label="YouTube" htmlFor="youtubeUrl" error={errors.youtubeUrl}>
            <Input
              id="youtubeUrl"
              value={draft.youtubeUrl}
              onChange={(e) => patch({ youtubeUrl: e.target.value })}
            />
          </Field>
        </CardContent>
      </Card>

      {/*
        Floating chat used to live here. It moved to its own page and endpoint
        when roles arrived: an ADMIN maintains the chat and must not see the
        site URL, SEO copy or analytics IDs it shared this form with, and the
        only way to guarantee that is for the two to stop sharing a request.
      */}

      {/* Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
          <p className="text-xs text-fog">
            Nothing loads until a visitor accepts the cookie banner.
          </p>
        </CardHeader>
        <CardContent className="grid gap-5">
          {analyticsFields.map((group) => (
            <div key={group.idKey} className="grid gap-3 rounded-2xl border border-white/8 bg-white/[.02] p-4">
              <SwitchRow
                id={group.enabledKey}
                label={group.label}
                hint={group.hint}
                checked={draft[group.enabledKey] as boolean}
                onCheckedChange={(value) =>
                  patch({ [group.enabledKey]: value } as Partial<Draft>)
                }
              />

              <Field
                label={group.idLabel}
                htmlFor={group.idKey}
                error={errors[group.idKey]}
                hint={group.idHint}
              >
                <Input
                  id={group.idKey}
                  value={draft[group.idKey] as string}
                  onChange={(e) =>
                    patch({ [group.idKey]: e.target.value } as Partial<Draft>)
                  }
                  placeholder={group.placeholder}
                  className="font-mono text-sm"
                  aria-invalid={Boolean(errors[group.idKey])}
                  // These are public identifiers, but they are also the kind of
                  // string a password manager loves to autofill over.
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>

              {group.idKey === "googleAdsId" ? (
                <Field
                  label="Conversion label"
                  htmlFor="googleAdsConversionLabel"
                  error={errors.googleAdsConversionLabel}
                  hint="From the conversion action in Google Ads — the part after the slash."
                >
                  <Input
                    id="googleAdsConversionLabel"
                    value={draft.googleAdsConversionLabel}
                    onChange={(e) =>
                      patch({ googleAdsConversionLabel: e.target.value })
                    }
                    placeholder="AbC-D_efGhIjKlMnOp"
                    className="font-mono text-sm"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </Field>
              ) : null}
            </div>
          ))}

          <Field
            label="Google Search Console verification"
            htmlFor="googleSiteVerification"
            error={errors.googleSiteVerification}
            hint="The content value from the google-site-verification meta tag. Not a tracker — it is rendered for crawlers regardless of consent."
          >
            <Input
              id="googleSiteVerification"
              value={draft.googleSiteVerification}
              onChange={(e) => patch({ googleSiteVerification: e.target.value })}
              className="font-mono text-sm"
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
        </CardContent>
      </Card>

      {/* Homepage mode */}
      <Card>
        <CardHeader>
          <CardTitle>Homepage mode</CardTitle>
          <p className="text-xs text-fog">
            What the homepage opens on. One of the two, never both — the game
            picker and the top-up catalogue are alternatives, not a combination.
          </p>
        </CardHeader>
        <CardContent>
          {/*
            A real radio group, not two switches that happen to be styled like
            one. `name` is what makes the browser enforce the exclusivity, and
            the fieldset is what makes a screen reader read the two options as
            one question rather than two unrelated checkboxes.
          */}
          <fieldset className="grid gap-2 sm:grid-cols-2">
            <legend className="sr-only">Homepage mode</legend>

            {homepageModes.map((mode) => {
              const selected = draft.homepageMode === mode.value;

              return (
                <label
                  key={mode.value}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-colors duration-200",
                    selected
                      ? "border-gold/40 bg-gold/[.06]"
                      : "border-white/10 bg-white/[.02] hover:border-white/20"
                  )}
                >
                  <input
                    type="radio"
                    name="homepageMode"
                    value={mode.value}
                    checked={selected}
                    onChange={() => patch({ homepageMode: mode.value })}
                    className="mt-0.5 size-4 shrink-0 accent-[#FFD54A]"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foam">
                      {mode.label}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-fog">
                      {mode.hint}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          {draft.homepageMode === "TOP_UP" ? (
            <p className="mt-3 rounded-xl border border-white/10 bg-white/[.03] px-3.5 py-2.5 text-xs text-mist">
              The catalogue shown is the one belonging to the game with{" "}
              <span className="font-semibold text-foam">Top up enabled</span> in
              Games. If no game has it, or there are no active products, the
              homepage falls back to the game picker rather than rendering an
              empty section.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Sections */}
      <Card>
        <CardHeader>
          <CardTitle>Homepage sections</CardTitle>
          <p className="text-xs text-fog">
            The supporting sections, each on its own. What the page opens on is
            decided above.
          </p>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {sectionToggles.map((toggle) => (
            <SwitchRow
              key={toggle.key}
              id={toggle.key}
              label={toggle.label}
              hint={toggle.hint}
              checked={draft[toggle.key] as boolean}
              onCheckedChange={(value) => patch({ [toggle.key]: value } as Partial<Draft>)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink/85 px-4 py-3 backdrop-blur-xl lg:left-68">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <p className="text-xs text-fog">
            Saved changes appear on the homepage immediately.
          </p>
          <Button type="submit" variant="gold" size="md" disabled={saving}>
            {saving ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <Save aria-hidden />
            )}
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </div>
    </form>
  );
}
