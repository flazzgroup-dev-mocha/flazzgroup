import Image from "next/image";
import Link from "next/link";
import { Zap } from "lucide-react";

import { cn, rupiah } from "@/lib/utils";
import type { Product } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Reveal, RevealItem } from "@/components/common/Reveal";

export function ProductsSection({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  return (
    <section
      id="royal-dream"
      aria-labelledby="products-title"
      className="relative scroll-mt-28 py-12 sm:py-16"
    >
      {/* Section lighting */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/4 left-1/2 -z-10 h-96 w-[46rem] max-w-[92vw] -translate-x-1/2 rounded-full bg-volt/10 blur-[130px]"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Royal Dream"
          title={
            <span id="products-title">
              Pilih <span className="text-royal">nominal koin</span>
            </span>
          }
          note="Isi User ID, bayar, koin masuk otomatis."
          action={
            <span className="glass-soft inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold text-mist">
              <span className="size-2 rounded-full bg-online shadow-[0_0_10px_#35E0A1]" />
              Server aktif — antrean kosong
            </span>
          }
        />

        <Reveal
          stagger={0.06}
          className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4"
        >
          {products.map((product) => {
            /**
             * The badge's colour is stored, not inferred from its text.
             *
             * This used to read `product.badge === "Terlaris"`, which meant the
             * label and the styling were the same decision: an editor could not
             * write "Best Value" in gold, or "Terlaris" in blue, without a code
             * change. Now the wording is theirs and the colour is theirs, and
             * neither one implies the other.
             */
            const isGold = product.badgeColor === "GOLD";

            return (
            <RevealItem key={product.id}>
              <article
                className={cn(
                  "glass seam lift group relative flex h-full flex-col overflow-hidden rounded-[1.35rem] p-4 sm:p-5",
                  isGold && "border-gold/30"
                )}
              >
                {product.badge ? (
                  <span
                    className={cn(
                      "absolute top-0 right-0 z-10 rounded-bl-2xl px-3 py-1.5 font-mono text-[.58rem] font-bold tracking-[.16em] uppercase",
                      isGold ? "bg-gold text-ink" : "bg-volt/85 text-white"
                    )}
                  >
                    {product.badge}
                  </span>
                ) : null}

                {/* Thumbnail */}
                <div className="relative mx-auto mb-4 grid aspect-square w-full max-w-28 place-items-center">
                  <div
                    aria-hidden
                    className="absolute inset-2 rounded-full bg-gold/12 blur-2xl transition-colors duration-500 group-hover:bg-gold/25"
                  />
                  <Image
                    src={product.imageUrl}
                    alt=""
                    aria-hidden
                    width={128}
                    height={128}
                    unoptimized={product.imageUrl.endsWith(".svg")}
                    className="relative w-full transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:-translate-y-1.5 group-hover:scale-105"
                  />
                </div>

                <div className="relative z-10 flex flex-1 flex-col">
                  <h3 className="text-base leading-tight font-bold text-foam sm:text-lg">
                    {product.title}
                    {product.unit ? (
                      <span className="ml-1 text-xs font-medium text-fog">
                        {product.unit}
                      </span>
                    ) : null}
                  </h3>
                  <p className="mt-1 text-xs text-mist">{product.description}</p>

                  <div className="mt-auto pt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-sm font-bold text-gold sm:text-base">
                        {rupiah(product.price)}
                      </span>
                      {product.strikePrice ? (
                        <span className="font-mono text-[.68rem] text-fog line-through">
                          {rupiah(product.strikePrice)}
                        </span>
                      ) : null}
                    </div>

                    <Button
                      variant="glass"
                      size="sm"
                      asChild
                      className="mt-3 w-full group-hover:border-gold/50 group-hover:text-gold"
                    >
                      <Link
                        href={product.buttonLink}
                        prefetch={false}
                        aria-label={`Beli ${product.title} ${product.unit}`}
                      >
                        <Zap aria-hidden />
                        Beli
                      </Link>
                    </Button>
                  </div>
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
