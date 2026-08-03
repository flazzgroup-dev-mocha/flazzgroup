"use client";

import { useEffect } from "react";
import Script from "next/script";

import type { AnalyticsConfig } from "@/lib/analytics/config";
import { useConsent } from "@/lib/analytics/consent";
import { configureTracking } from "@/lib/analytics/track";
import { PageViewTracker } from "./PageViewTracker";

/**
 * Every third-party tag, in one place, behind consent.
 *
 * Nothing here renders until the visitor has said yes. That is the difference
 * between a consent banner and a consent *notice*: a script loaded with a flag
 * set to "denied" has already made the request, already set its cookies, and
 * already told a third party who is reading the page.
 *
 * Loading strategies are chosen per tag rather than uniformly:
 *
 *   `afterInteractive` for GTM and the Meta pixel, because they must observe
 *   the page view that is happening now. They are still off the critical path —
 *   Next injects them after hydration.
 *
 *   `lazyOnload` for Clarity, which records sessions. Nothing is lost by
 *   starting a second late, and session recording is heavy enough that it has
 *   no business competing with the hero image.
 */
export function Analytics({ config }: { config: AnalyticsConfig }) {
  const { consent } = useConsent();
  const granted = consent === "granted";

  // Give track() the IDs it needs to decide where events may go.
  useEffect(() => {
    configureTracking({
      metaPixelId: config.metaPixelId,
      googleAdsId: config.googleAdsId,
      googleAdsConversionLabel: config.googleAdsConversionLabel,
    });
  }, [config.metaPixelId, config.googleAdsId, config.googleAdsConversionLabel]);

  if (!granted || !config.active) return null;

  return (
    <>
      {/* ------------------------------------------------------------ GTM */}
      {config.gtmId ? (
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${config.gtmId}');`}
        </Script>
      ) : null}

      {/**
       * GA4 direct.
       *
       * Only when GTM is absent. Loading both is the most common way a site
       * ends up counting every page view twice: GTM's GA4 tag and this
       * snippet each fire their own, and nothing in either reports a conflict.
       */}
      {!config.gtmId && config.ga4Id ? (
        <>
          <Script
            id="ga4-src"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${config.ga4Id}`}
          />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}
window.gtag=gtag;gtag('js',new Date());gtag('config','${config.ga4Id}',{send_page_view:true});`}
          </Script>
        </>
      ) : null}

      {/**
       * Google Ads.
       *
       * gtag.js is loaded once. When GA4 already brought it in above, this only
       * adds the Ads config; when GTM is in charge, gtag is not otherwise
       * present and the library is needed for conversion calls.
       */}
      {config.googleAdsId ? (
        <>
          {!config.ga4Id || config.gtmId ? (
            <Script
              id="gads-src"
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${config.googleAdsId}`}
            />
          ) : null}
          <Script id="gads" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}
window.gtag=window.gtag||gtag;gtag('js',new Date());gtag('config','${config.googleAdsId}');`}
          </Script>
        </>
      ) : null}

      {/* ----------------------------------------------------- Meta pixel */}
      {config.metaPixelId ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${config.metaPixelId}');fbq('track','PageView');`}
        </Script>
      ) : null}

      {/* -------------------------------------------------------- Clarity */}
      {config.clarityId ? (
        <Script id="clarity" strategy="lazyOnload">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window,document,"clarity","script","${config.clarityId}");`}
        </Script>
      ) : null}

      <PageViewTracker />
    </>
  );
}
