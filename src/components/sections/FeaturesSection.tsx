import {
  Clock,
  CreditCard,
  Crown,
  MessageCircleMore,
  Rocket,
  ShieldCheck,
  Star,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { Feature } from "@/lib/models";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Reveal, RevealItem } from "@/components/common/Reveal";

/** Icon keys come from the admin panel's fixed list. */
const iconMap: Record<string, LucideIcon> = {
  zap: Zap,
  shield: ShieldCheck,
  clock: Clock,
  card: CreditCard,
  star: Star,
  chat: MessageCircleMore,
  crown: Crown,
  rocket: Rocket,
};

export function FeaturesSection({ features }: { features: Feature[] }) {
  if (features.length === 0) return null;

  return (
    <section aria-labelledby="features-title" className="relative py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Kenapa FLAZZ"
          title={
            <span id="features-title">
              Alasan pembeli <span className="text-royal">balik lagi</span>
            </span>
          }
          align="center"
        />

        <Reveal
          stagger={0.08}
          className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3"
        >
          {features.map((feature) => {
            const Icon = iconMap[feature.icon] ?? Zap;
            return (
              <RevealItem key={feature.id}>
                <div className="glass seam lift group relative h-full overflow-hidden rounded-[1.35rem] p-5 sm:p-6">
                  <div className="relative z-10 flex items-start gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-gold/25 bg-gold/10 text-gold transition-all duration-400 group-hover:border-gold/60 group-hover:bg-gold/18 group-hover:shadow-[0_0_24px_-4px_rgba(255,213,74,.6)] sm:size-12">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm leading-snug font-bold text-foam sm:text-base">
                        {feature.title}
                      </h3>
                      {feature.description ? (
                        <p className="mt-1 font-mono text-[.68rem] tracking-wide text-fog sm:text-xs">
                          {feature.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </RevealItem>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
