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

export function BrandsSection({ brands }: { brands: Brand[] }) {
  if (brands.length === 0) return null;

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

        <Reveal
          stagger={0.09}
          className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
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
              <RevealItem key={brand.id}>
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
