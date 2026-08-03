import Image from "next/image";
import { ImageOff } from "lucide-react";

import { Badge } from "@/components/ui/surface";

/** Small image preview used in every resource table. */
export function Thumb({
  src,
  alt = "",
  rounded = "rounded-lg",
}: {
  src?: string | null;
  alt?: string;
  rounded?: string;
}) {
  if (!src) {
    return (
      <span
        className={`grid size-10 place-items-center border border-white/10 bg-ink-800/60 text-fog ${rounded}`}
      >
        <ImageOff className="size-4" aria-hidden />
      </span>
    );
  }

  return (
    <span
      className={`relative block size-10 overflow-hidden border border-white/10 bg-ink-800/60 ${rounded}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="40px"
        className="object-contain p-1"
        unoptimized={src.endsWith(".svg")}
      />
    </span>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge tone={active ? "online" : "muted"}>
      {active ? "Visible" : "Hidden"}
    </Badge>
  );
}

const brandStatusTone = {
  ONLINE: "online",
  MAINTENANCE: "gold",
  COMING_SOON: "muted",
} as const;

const brandStatusLabel = {
  ONLINE: "Online",
  MAINTENANCE: "Maintenance",
  COMING_SOON: "Coming soon",
} as const;

export function BrandStatusBadge({
  status,
}: {
  status: keyof typeof brandStatusTone;
}) {
  return (
    <Badge tone={brandStatusTone[status]}>{brandStatusLabel[status]}</Badge>
  );
}

/** Colour chip + hex, so hues are readable at a glance in tables. */
export function HueSwatch({ hue }: { hue: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className="size-4 rounded-full border border-white/20"
        style={{ background: hue }}
      />
      <span className="font-mono text-[.68rem] text-fog uppercase">{hue}</span>
    </span>
  );
}

export function TextCell({
  primary,
  secondary,
}: {
  primary: string;
  secondary?: string | null;
}) {
  return (
    <span className="block max-w-xs">
      <span className="block truncate font-semibold text-foam">{primary}</span>
      {secondary ? (
        <span className="block truncate text-xs text-fog">{secondary}</span>
      ) : null}
    </span>
  );
}
