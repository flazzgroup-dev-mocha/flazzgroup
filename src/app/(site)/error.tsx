"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/common/ErrorState";

/**
 * Catches render and data failures on the public site — most importantly a
 * database outage, which would otherwise show Next's default error page.
 */
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[site]", error);
  }, [error]);

  return (
    <ErrorState
      title="Halaman gagal dimuat"
      description="Sambungan ke server sedang bermasalah. Coba muat ulang — kalau masih gagal, hubungi admin lewat Telegram."
      digest={error.digest}
      onRetry={reset}
    />
  );
}
