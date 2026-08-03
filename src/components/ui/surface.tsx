import * as React from "react";

import { cn } from "@/lib/utils";

/* --------------------------------------------------------------- card */

function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("glass overflow-hidden rounded-2xl", className)}
      {...props}
    />
  );
}

function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-4",
        className
      )}
      {...props}
    />
  );
}

function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("text-base font-bold text-foam", className)} {...props} />
  );
}

function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

/* -------------------------------------------------------------- badge */

const badgeTones = {
  neutral: "border-white/12 bg-white/[.04] text-mist",
  online: "border-online/35 bg-online/10 text-online",
  gold: "border-gold/35 bg-gold/10 text-gold",
  volt: "border-volt/40 bg-volt/12 text-volt-300",
  muted: "border-white/10 bg-white/[.03] text-fog",
  danger: "border-red-500/35 bg-red-500/10 text-red-300",
} as const;

function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: keyof typeof badgeTones;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[.6rem] font-bold tracking-[.14em] uppercase",
        badgeTones[tone],
        className
      )}
      {...props}
    />
  );
}

/* ----------------------------------------------------------- skeleton */

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-lg bg-white/[.06] motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  );
}

export {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
};
