import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Flame } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PopularService } from "@/lib/models";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Reveal, RevealItem } from "@/components/common/Reveal";

export function PopularSection({ services }: { services: PopularService[] }) {
  if (services.length === 0) return null;

  return (
    <section id="promo" aria-labelledby="popular-title" className="relative py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Trending"
          title={
            <span id="popular-title">
              Populer <span className="text-royal">Hari Ini</span>
            </span>
          }
          note="Layanan yang paling banyak diorder pembeli."
          action={
            <span className="glass-soft inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[.7rem] tracking-widest text-gold">
              <Flame className="size-3.5" aria-hidden />
              LIVE
            </span>
          }
        />

        <Reveal stagger={0.12} className="rail md:grid-cols-3 md:gap-5">
          {services.map((service) => (
            <RevealItem key={service.id}>
              <Link
                href={service.href || "#"}
                className="glass seam lift group relative flex h-full flex-col overflow-hidden rounded-[1.5rem]"
              >
                {/* Media */}
                <div className="relative aspect-16/10 overflow-hidden">
                  <Image
                    src={service.imageUrl}
                    alt=""
                    aria-hidden
                    fill
                    sizes="(max-width: 768px) 82vw, 33vw"
                    unoptimized={service.imageUrl.endsWith(".svg")}
                    className="object-cover transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-105"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-linear-to-t from-ink via-ink/35 to-transparent"
                  />
                  {service.badge ? (
                    <span
                      className={cn(
                        "absolute top-4 left-4 rounded-full px-3 py-1 font-mono text-[.62rem] font-bold tracking-[.18em] uppercase backdrop-blur-md",
                        service.accent === "GOLD"
                          ? "bg-gold/90 text-ink"
                          : "bg-volt/85 text-white"
                      )}
                    >
                      {service.badge}
                    </span>
                  ) : null}
                </div>

                {/* Body */}
                <div className="relative z-10 -mt-8 flex flex-1 flex-col p-5 sm:p-6">
                  <h3 className="text-lg font-bold text-foam transition-colors duration-300 group-hover:text-gold sm:text-xl">
                    {service.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-mist">{service.description}</p>

                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/8 pt-4">
                    <span className="font-mono text-sm font-bold text-gold">
                      {service.priceLabel}
                    </span>
                    <span className="grid size-9 place-items-center rounded-full border border-white/12 text-mist transition-all duration-400 group-hover:border-gold/60 group-hover:bg-gold/12 group-hover:text-gold">
                      <ArrowUpRight className="size-4" aria-hidden />
                    </span>
                  </div>
                </div>
              </Link>
            </RevealItem>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
