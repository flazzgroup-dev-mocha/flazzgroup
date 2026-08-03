"use client";

import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";

import { useConsent } from "@/lib/analytics/consent";
import { Button } from "@/components/ui/button";

/**
 * Cookie consent.
 *
 * Deliberately small: one sentence, two buttons of equal weight. A banner that
 * makes "Accept" gold and "Decline" a grey link is a dark pattern, and under
 * the GDPR a consent that was nudged is not consent.
 *
 * Renders nothing until it knows the answer — `useConsent` starts at "unknown"
 * on both server and client so hydration matches, then reads localStorage in an
 * effect. The extra `mounted` gate stops the banner flashing for the returning
 * visitor who already decided.
 */
export function ConsentBanner() {
  const { consent, decide } = useConsent();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || consent !== "unknown") return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Persetujuan cookie"
      className="fixed inset-x-3 bottom-3 z-80 mx-auto max-w-2xl sm:inset-x-6 sm:bottom-6"
    >
      <div className="glass-solid seam flex flex-col gap-3 rounded-2xl p-4 shadow-[0_24px_60px_-20px_rgba(3,10,25,.95)] sm:flex-row sm:items-center sm:gap-4 sm:p-5">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold"
        >
          <Cookie className="size-5" />
        </span>

        <p className="min-w-0 flex-1 text-sm leading-relaxed text-mist">
          Kami memakai cookie untuk melihat halaman mana yang paling membantu.
          Tidak ada data pribadi yang dijual.{" "}
          <span className="text-fog">Kamu bisa menolak tanpa kehilangan fitur apa pun.</span>
        </p>

        {/* Equal visual weight — the choice must not be steered. */}
        <div className="flex shrink-0 gap-2">
          <Button variant="glass" size="sm" onClick={() => decide("denied")}>
            Tolak
          </Button>
          <Button variant="gold" size="sm" onClick={() => decide("granted")}>
            Terima
          </Button>
        </div>
      </div>
    </div>
  );
}
