import Image from "next/image";
import { ShieldCheck } from "lucide-react";

import type { PaymentMethod } from "@/lib/models";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Reveal } from "@/components/common/Reveal";

/**
 * One marquee tile. Uses the uploaded logo when there is one, and falls back
 * to a typeset initials tile in the method's accent colour.
 */
function PaymentTile({
  method,
  decorative,
}: {
  method: PaymentMethod;
  decorative?: boolean;
}) {
  return (
    <li
      aria-hidden={decorative || undefined}
      className="glass-soft group flex shrink-0 items-center gap-3 rounded-2xl px-5 py-3.5 transition-colors duration-300 hover:border-gold/35"
      style={{ minWidth: "10.5rem" }}
    >
      {method.logoUrl ? (
        <span className="relative size-9 shrink-0 overflow-hidden rounded-xl bg-white/[.06]">
          <Image
            src={method.logoUrl}
            alt=""
            aria-hidden
            fill
            sizes="36px"
            unoptimized={method.logoUrl.endsWith(".svg")}
            className="object-contain p-1"
          />
        </span>
      ) : (
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-xl text-[.7rem] font-extrabold text-ink"
          style={{
            background: method.hue,
            boxShadow: `0 6px 20px -8px ${method.hue}`,
          }}
        >
          {method.name.slice(0, 2).toUpperCase()}
        </span>
      )}

      <span className="flex flex-col leading-tight">
        <span className="text-sm font-bold tracking-tight text-foam">
          {method.name}
        </span>
        {method.kind ? (
          <span className="font-mono text-[.6rem] tracking-[.16em] text-fog uppercase">
            {method.kind}
          </span>
        ) : null}
      </span>
    </li>
  );
}

export function PaymentSection({ methods }: { methods: PaymentMethod[] }) {
  if (methods.length === 0) return null;

  const reversed = [...methods].reverse();

  return (
    <section
      id="payment"
      aria-labelledby="payment-title"
      className="relative scroll-mt-28 py-12 sm:py-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Pembayaran"
          title={
            <span id="payment-title">
              Bayar pakai <span className="text-volt">apa saja</span>
            </span>
          }
          note={`${methods.length} metode aktif, konfirmasi otomatis.`}
          action={
            <span className="glass-soft inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold text-mist">
              <ShieldCheck className="size-4 text-online" aria-hidden />
              Kanal pembayaran terverifikasi
            </span>
          }
        />
      </div>

      <Reveal direction="scale" className="relative">
        <div className="fade-x overflow-hidden py-2">
          <ul
            className="flex w-max gap-3 pr-3 [animation:marquee_38s_linear_infinite] hover:[animation-play-state:paused] motion-reduce:[animation:none]"
            aria-label="Metode pembayaran yang diterima"
          >
            {methods.map((method) => (
              <PaymentTile key={method.id} method={method} />
            ))}
            {/* Duplicate track keeps the loop seamless; hidden from screen readers */}
            {methods.map((method) => (
              <PaymentTile key={`dup-${method.id}`} method={method} decorative />
            ))}
          </ul>
        </div>

        {/* Second row drifts the other way — reads as a system, not a loop */}
        <div className="fade-x mt-3 overflow-hidden py-2">
          <ul
            aria-hidden
            className="flex w-max gap-3 pr-3 [animation:marquee_46s_linear_infinite_reverse] hover:[animation-play-state:paused] motion-reduce:[animation:none]"
          >
            {reversed.map((method) => (
              <PaymentTile key={`r-${method.id}`} method={method} decorative />
            ))}
            {reversed.map((method) => (
              <PaymentTile key={`r2-${method.id}`} method={method} decorative />
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
