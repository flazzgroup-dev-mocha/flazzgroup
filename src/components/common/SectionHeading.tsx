import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

type SectionHeadingProps = {
  eyebrow: string;
  title: React.ReactNode;
  /** Kept to one short line — this page never uses paragraphs. */
  note?: string;
  action?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
};

/** Bolt glyph — the same mark as the logo, used as the eyebrow bullet. */
function Bolt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-3.5", className)}>
      <path d="M14 2 5 14h5l-2 8 10-13h-5z" fill="currentColor" />
    </svg>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  note,
  action,
  align = "left",
  className,
}: SectionHeadingProps) {
  return (
    <Reveal
      className={cn(
        "mb-8 flex flex-col gap-5 sm:mb-11 sm:flex-row sm:items-end sm:justify-between",
        align === "center" && "sm:flex-col sm:items-center sm:text-center",
        className
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        <span className="eyebrow">
          <Bolt />
          {eyebrow}
        </span>
        <h2 className="mt-3 text-3xl leading-[1.08] font-bold sm:text-4xl lg:text-[2.75rem]">
          {title}
        </h2>
        {note ? (
          <p className="mt-3 text-sm text-mist sm:text-base">{note}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </Reveal>
  );
}
