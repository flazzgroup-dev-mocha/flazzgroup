
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { ArrowUpRight, Megaphone, Users } from "lucide-react";

import type { CommunityLink } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Reveal, RevealItem } from "@/components/common/Reveal";
import { TelegramIcon, WhatsappIcon } from "@/components/common/Icons";

const iconMap = {
  telegram: TelegramIcon,
  whatsapp: WhatsappIcon,
  megaphone: Megaphone,
  users: Users,
} as const;

export function CommunitySection({ links }: { links: CommunityLink[] }) {
  if (links.length === 0) return null;

  return (
    <section
      id="community"
      aria-labelledby="community-title"
      className="relative scroll-mt-28 py-12 sm:py-16"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 right-1/4 -z-10 size-96 rounded-full bg-volt/12 blur-[130px]"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Community"
          title={
            <span id="community-title">
              Admin ada di <span className="text-royal">semua kanal</span>
            </span>
          }
          note="Pilih tempat paling nyaman buat kamu."
        />

        <Reveal stagger={0.1} className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {links.map((channel) => {
            const Icon =
              iconMap[channel.icon as keyof typeof iconMap] ?? TelegramIcon;

            return (
              <RevealItem key={channel.id}>
                <article className="glass seam lift group relative flex h-full flex-col overflow-hidden rounded-[1.5rem] p-5 sm:p-6">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -top-20 left-1/2 size-44 -translate-x-1/2 rounded-full opacity-20 blur-[70px] transition-opacity duration-500 group-hover:opacity-45"
                    style={{ background: channel.hue }}
                  />

                  <span
                    className="relative z-10 grid size-14 place-items-center rounded-2xl border transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-105"
                    style={{
                      color: channel.hue,
                      borderColor: `${channel.hue}55`,
                      background: `${channel.hue}18`,
                    }}
                  >
                    <Icon className="size-6" aria-hidden />
                  </span>

                  <h3 className="relative z-10 mt-5 text-lg font-bold text-foam">
                    {channel.title}
                  </h3>
                  <p className="relative z-10 mt-1.5 text-sm text-mist">
                    {channel.description}
                  </p>

                  {channel.meta ? (
                    <span className="relative z-10 mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-white/[.04] px-2.5 py-1 font-mono text-[.6rem] tracking-[.14em] text-fog uppercase">
                      {channel.meta}
                    </span>
                  ) : null}

                  <div className="relative z-10 mt-auto pt-5">
                    <Button variant="glass" size="sm" asChild className="w-full">
                      <TrackedLink
                        href={channel.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${channel.ctaLabel} — dibuka di tab baru`}
                        event="community_click"
                        params={{
                          item_id: channel.id,
                          item_name: channel.title,
                          channel: channel.icon,
                          destination: channel.url,
                        }}
                      >
                        {channel.ctaLabel}
                        <ArrowUpRight aria-hidden />
                      </TrackedLink>
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
