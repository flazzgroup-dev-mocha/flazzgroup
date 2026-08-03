"use client";

import Image from "next/image";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { A11y, Autoplay, EffectFade, Keyboard, Navigation, Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

import type { HeroStat } from "@/lib/models";
import type { HeroSlide } from "@/lib/queries";
import { cloudinaryUrl, isVector } from "@/lib/media/url";
import { track } from "@/lib/analytics/track";
import { ParticleField } from "@/components/common/ParticleField";

/**
 * Fallback shape for the hero frame — a wide banner — used until an upload
 * with known dimensions tells us the real one.
 */
const DEFAULT_ASPECT = 1920 / 800;

/** Phone widths worth serving, at 1× and 2×. */
const MOBILE_WIDTHS = [390, 640, 828];

/**
 * A `<source>` is plain HTML, so next/image's loader never sees it — without
 * this the phone crop would be served at full size with no format negotiation,
 * which is the opposite of the point.
 */
function mobileSrcSet(url: string) {
  if (isVector(url)) return url;

  return MOBILE_WIDTHS.map(
    (width) => `${cloudinaryUrl(url, { width })} ${width}w`
  ).join(", ");
}

/**
 * One slide is one piece of artwork.
 *
 * The headline, chips and buttons this used to compose out of database columns
 * are part of the image a designer exports, so a slide is now the picture and,
 * when the banner has a destination, a link around it.
 */
function Slide({
  banner,
  priority,
  position,
}: {
  banner: HeroSlide;
  priority: boolean;
  /** 1-based, so reports read the way a person describes a slide. */
  position: number;
}) {
  const picture = (
    // `display: contents` keeps <picture> out of the box tree entirely. The
    // <img> uses next/image's `fill`, which is `position: absolute` and needs
    // its containing block to be the positioned wrapper below — a <picture>
    // generating its own static box would sit between the two. Source
    // selection is a parser concern and is unaffected by display.
    <picture className="contents">
      {/* Art direction rather than resolution: a phone crop is a different
          composition, so the browser picks it. Loading both and hiding one
          with CSS would download both. */}
      {banner.mobileImageUrl ? (
        <source
          media="(max-width: 639px)"
          sizes="100vw"
          srcSet={mobileSrcSet(banner.mobileImageUrl)}
        />
      ) : null}
      <Image
        src={banner.imageUrl}
        alt={banner.imageAlt}
        fill
        // The first slide is the LCP element on nearly every visit; the rest
        // are behind a fade and can wait.
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        sizes="(max-width: 1280px) 100vw, 1280px"
        unoptimized={isVector(banner.imageUrl)}
        className="object-cover"
      />
    </picture>
  );

  if (!banner.destinationUrl) {
    return <div className="absolute inset-0">{picture}</div>;
  }

  const external = banner.destinationUrl.startsWith("http");

  return (
    <Link
      href={banner.destinationUrl}
      /**
       * Never `undefined`.
       *
       * `imageAlt` is optional in the CMS, and the only thing inside this link
       * is an <img> carrying that same alt. Leave both empty and the result is
       * a link with no accessible name at all: a screen reader announces
       * "link" and reads out the URL, and it is the largest click target on the
       * page. The fallback is generic on purpose — it says where the link goes
       * without pretending to describe artwork nobody has described.
       */
      aria-label={banner.imageAlt || `Slide promo ${position}`}
      onClick={() =>
        track("banner_click", {
          banner_id: banner.id,
          position,
          destination: banner.destinationUrl,
          creative_name: banner.imageAlt || undefined,
        })
      }
      className="absolute inset-0 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-gold"
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {picture}
    </Link>
  );
}

export function Hero({
  banners,
  stats,
  aspectRatio,
}: {
  banners: HeroSlide[];
  stats: HeroStat[];
  /** Width ÷ height of the first banner, when its upload record is known. */
  aspectRatio?: number | null;
}) {
  // Auto-advancing content is a vestibular trigger and a WCAG 2.2.2 concern,
  // so the slider only rotates on its own when motion is welcome.
  const reducedMotion = useReducedMotion();

  if (banners.length === 0) return null;

  return (
    <section
      id="home"
      aria-label="Sorotan utama"
      className="relative pt-28 pb-4 sm:pt-32 lg:pt-36"
    >
      {/* Ambient lighting */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[34rem] w-[52rem] -translate-x-1/2 rounded-full bg-volt/18 blur-[120px]" />
        <div className="absolute top-24 -right-24 h-80 w-80 rounded-full bg-gold/12 blur-[100px]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-volt/40 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="glass seam relative overflow-hidden rounded-[1.75rem] sm:rounded-[2.25rem]">
          <ParticleField className="pointer-events-none absolute inset-0 z-10" />

          <Swiper
            modules={[Autoplay, Navigation, Pagination, EffectFade, A11y, Keyboard]}
            effect="fade"
            fadeEffect={{ crossFade: true }}
            loop={banners.length > 1}
            speed={800}
            autoplay={
              reducedMotion
                ? false
                : { delay: 6000, disableOnInteraction: true, pauseOnMouseEnter: true }
            }
            navigation={banners.length > 1}
            pagination={banners.length > 1 ? { clickable: true } : false}
            keyboard={{ enabled: true }}
            a11y={{
              prevSlideMessage: "Slide sebelumnya",
              nextSlideMessage: "Slide berikutnya",
              paginationBulletMessage: "Ke slide {{index}}",
            }}
            className="flazz-hero"
          >
            {banners.map((slide, index) => (
              <SwiperSlide key={slide.id}>
                {/* Every slide shares one frame, so the fade has nothing to
                    resize between and the space is reserved before the first
                    byte of artwork arrives. */}
                <div
                  className="relative w-full"
                  style={{ aspectRatio: aspectRatio || DEFAULT_ASPECT }}
                >
                  <Slide banner={slide} priority={index === 0} position={index + 1} />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Trust strip — the proof line, kept as data not prose */}
        {stats.length > 0 ? (
          <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:gap-3 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.id}
                className="glass-soft seam lift rounded-2xl px-4 py-5 text-center sm:py-6"
              >
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="block font-mono text-xl font-bold text-gold sm:text-2xl">
                    {stat.value}
                  </span>
                  <span className="mt-1 block text-[.7rem] tracking-wide text-mist sm:text-xs">
                    {stat.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </section>
  );
}
