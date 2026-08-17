import Image from "next/image";

import { TrackedLink } from "@/components/analytics/TrackedLink";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { resolveHref } from "@/lib/site-nav";
import type { Brand } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Reveal, RevealItem } from "@/components/common/Reveal";

const statusLabels = {
  ONLINE: "Online",
  MAINTENANCE: "Maintenance",
  COMING_SOON: "Segera",
} as const;

/**
 * How many cards share a desktop row, for however many brands are active.
 *
 * The layout is a wrapping flex row, not a CSS grid, and that is the whole
 * point: `grid-cols-3` fills from the left and leaves whatever is left over
 * hanging there, which is how six active brands (a tidy 3 × 3) became four
 * active brands rendered 3 + 1. Grid has no way to centre an incomplete final
 * row; `flex-wrap` + `justify-center` does it for free, and does nothing at all
 * to rows that are already full.
 *
 * Centring alone is not enough, though — 3 + 1 centred is still 3 + 1. The
 * column count has to react to the total as well:
 *
 *   1 → 1     2 → 2     3 → 3     4 → 2 (2 × 2)     5 → 3 (3 + 2)     6 → 3
 *
 * The rule generalises rather than special-casing today's numbers: three across
 * is the design's natural width, so prefer it, and drop to two only when three
 * would strand a single card on the last row *and* two divides evenly. Seven
 * brands keep three across (3 + 3 + 1) because two would strand one card too,
 * and the lone card is centred, which reads as deliberate.
 *
 * Nothing here is hardcoded to a brand count: the caller passes whatever
 * `getBrands()` returned, so an admin toggling `showOnHomepage` is enough.
 */
function desktopColumns(count: number): 1 | 2 | 3 {
  if (count <= 3) return count as 1 | 2 | 3;
  if (count % 3 === 1 && count % 2 === 0) return 2;
  return 3;
}

/**
 * The flex basis for each desktop column count.
 *
 * Written out as literal strings because Tailwind scans source text for class
 * names — building one with a template literal produces a class that is never
 * generated, and the cards silently fall back to their mobile width.
 *
 * The arithmetic is the part that has to be right: `w-1/3` does not account for
 * the gap, so three of them plus two gaps exceed 100% and the third card wraps.
 * For `n` columns sharing a 1rem gap, each card is
 * `calc(100%/n - gap × (n-1)/n)`.
 *
 * A single active brand is capped at half width rather than stretched to the
 * full container: the card was designed at roughly a third of a 7xl container,
 * and a 1280px-wide card with a one-line description is a different component,
 * not a wider one.
 */
const COLUMN_BASIS = {
  1: "lg:w-1/2",
  2: "lg:w-[calc(50%_-_0.5rem)]",
  3: "lg:w-[calc(33.333%_-_0.667rem)]",
} as const;

export function BrandsSection({ brands }: { brands: Brand[] }) {
  if (brands.length === 0) return null;

  // Derived from the rows the CMS actually returned — never a fixed number.
  const basis = COLUMN_BASIS[desktopColumns(brands.length)];

  return (
    <section
      id="brands"
      aria-labelledby="brands-title"
      className="relative scroll-mt-28 py-12 sm:py-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Satu manajemen"
          title={
            <span id="brands-title">
              Brand <span className="text-volt">Kami</span>
            </span>
          }
          note="Satu sistem harga, satu tim admin."
        />

        {/*
          `justify-center` is what centres a short final row. On a row that is
          already full the card widths add up to 100%, so there is no free space
          to distribute and it has no visible effect — which is why it can be
          applied unconditionally.
        */}
        <Reveal
          stagger={0.09}
          className="flex flex-wrap justify-center gap-3 sm:gap-4"
        >
          {brands.map((brand) => {
            const isLive = brand.status === "ONLINE";
            // Rooted, because this section also renders on /about, where a
            // bare `#royal-dream` would resolve against that page instead.
            const href = resolveHref(brand.link);
            /**
             * Brands point at their own storefronts, on other domains. The
             * footer has always opened those in a new tab with `noopener`; the
             * cards did not, so the same destination behaved differently
             * depending on which half of the page you clicked. "Kunjungi" is
             * also identical on all six cards, which is unusable from a screen
             * reader's link list — hence the brand name in the label.
             */
            const external = href.startsWith("http");
            return (
              /*
                One card per flex line on phones, two from `sm`, and
                `basis` from `lg` — so the tablet layout is unchanged and only
                the desktop row reacts to how many brands are active.
              */
              <RevealItem
                key={brand.id}
                className={cn("w-full sm:w-[calc(50%_-_0.5rem)]", basis)}
              >
                <article className="glass seam lift group relative flex h-full flex-col overflow-hidden rounded-[1.5rem] p-5 sm:p-6">
                  {/* Per-brand hue wash — the only place brand color appears */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -top-16 -right-10 size-40 rounded-full opacity-25 blur-[60px] transition-opacity duration-500 group-hover:opacity-50"
                    style={{ background: brand.hue }}
                  />

                  <div className="relative z-10 flex items-start justify-between gap-4">
                    <Image
                      src={brand.logoUrl}
                      alt={`Logo ${brand.name}`}
                      width={120}
                      height={120}
                      unoptimized={brand.logoUrl.endsWith(".svg")}
                      className="size-14 rounded-2xl object-contain transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-105 sm:size-16"
                    />
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[.6rem] font-bold tracking-[.14em] uppercase",
                        isLive
                          ? "border-online/35 bg-online/10 text-online"
                          : "border-white/12 bg-white/[.04] text-fog"
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          isLive
                            ? "animate-[pulse-glow_2.4s_ease-in-out_infinite] bg-online shadow-[0_0_8px_#35E0A1]"
                            : "bg-fog"
                        )}
                      />
                      {statusLabels[brand.status]}
                    </span>
                  </div>

                  <div className="relative z-10 mt-5">
                    <h3 className="text-lg font-extrabold tracking-tight text-foam sm:text-xl">
                      {brand.name}
                    </h3>
                    <p className="mt-1 text-sm text-mist">{brand.description}</p>
                  </div>

                  <div className="relative z-10 mt-6 border-t border-white/8 pt-4">
                    <Button
                      variant={isLive ? "glass" : "outline"}
                      size="sm"
                      asChild={isLive}
                      disabled={!isLive}
                      className="w-full"
                    >
                      {isLive ? (
                        <TrackedLink
                          href={href}
                          {...(external
                            ? {
                                target: "_blank",
                                rel: "noopener noreferrer",
                                "aria-label": `Kunjungi ${brand.name} — dibuka di tab baru`,
                              }
                            : { "aria-label": `Kunjungi ${brand.name}` })}
                          event="brand_click"
                          params={{
                            item_id: brand.id,
                            item_name: brand.name,
                            destination: href,
                          }}
                        >
                          Kunjungi
                          <ArrowUpRight aria-hidden />
                        </TrackedLink>
                      ) : (
                        <>
                          {brand.status === "MAINTENANCE"
                            ? "Sedang perbaikan"
                            : "Segera dibuka"}
                        </>
                      )}
                    </Button>
                  </div>
                </article>
              </RevealItem>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
