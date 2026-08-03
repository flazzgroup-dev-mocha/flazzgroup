"use client";

import Link from "next/link";
import { Home, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Shared failure screen for every error boundary. Says what happened and what
 * to do about it — never a bare stack trace, and never an apology.
 */
export function ErrorState({
  title,
  description,
  digest,
  onRetry,
  homeHref = "/",
  homeLabel = "Kembali ke beranda",
}: {
  title: string;
  description: string;
  digest?: string;
  onRetry?: () => void;
  homeHref?: string;
  homeLabel?: string;
}) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-80 w-[36rem] max-w-full rounded-full bg-volt/15 blur-[120px]"
        />

        <span className="eyebrow justify-center">Terjadi kesalahan</span>

        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-mist sm:text-base">{description}</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {onRetry ? (
            <Button variant="gold" size="lg" onClick={onRetry}>
              <RefreshCw aria-hidden />
              Coba lagi
            </Button>
          ) : null}
          <Button variant="glass" size="lg" asChild>
            <Link href={homeHref}>
              <Home aria-hidden />
              {homeLabel}
            </Link>
          </Button>
        </div>

        {digest ? (
          <p className="mt-8 font-mono text-[.62rem] tracking-[.14em] text-fog uppercase">
            Ref: {digest}
          </p>
        ) : null}
      </div>
    </main>
  );
}
