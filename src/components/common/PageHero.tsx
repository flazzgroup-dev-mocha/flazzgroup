import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Reveal } from "@/components/common/Reveal";

/**
 * The opening block of a standalone page: eyebrow, the page's single H1, a
 * lead paragraph and optional actions.
 *
 * Deliberately the same rhythm as the blog index header — same eyebrow, same
 * type scale, same glow — so these pages read as part of the site rather than
 * as something bolted on.
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  meta,
  actions,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  /** Small mono line under the lead — a last-updated date, for instance. */
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <Reveal className={cn("max-w-3xl", className)} as="header">
      <span className="eyebrow">
        <span className="size-1.5 rounded-full bg-gold shadow-[0_0_10px_#FFD54A]" />
        {eyebrow}
      </span>

      <h1 className="mt-3 text-3xl leading-[1.08] font-bold sm:text-4xl lg:text-5xl">
        {title}
      </h1>

      {lead ? (
        <p className="mt-4 text-sm leading-relaxed text-mist sm:text-base">
          {lead}
        </p>
      ) : null}

      {meta ? (
        <p className="mt-4 font-mono text-[.68rem] tracking-[.16em] text-fog uppercase">
          {meta}
        </p>
      ) : null}

      {actions ? (
        <div className="mt-7 flex flex-wrap gap-3">{actions}</div>
      ) : null}
    </Reveal>
  );
}
