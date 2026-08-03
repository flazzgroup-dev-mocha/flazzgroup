"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/common/ErrorState";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin]", error);
  }, [error]);

  return (
    <ErrorState
      title="Panel gagal dimuat"
      description="Database tidak merespons atau sesi kamu berakhir. Coba lagi, atau masuk ulang."
      digest={error.digest}
      onRetry={reset}
      homeHref="/admin/login"
      homeLabel="Masuk ulang"
    />
  );
}
