"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Consent, stored locally and consulted before anything loads.
 *
 * The decision is deliberately binary. A four-checkbox preference centre reads
 * as compliance theatre on a site whose entire tracking surface is "did this
 * visitor click through to WhatsApp" — and every extra control is another thing
 * that can disagree with what the code actually does.
 *
 * What matters is that "decline" genuinely means nothing loads: no GTM, no
 * pixel, no Clarity, no server-side event. Not "loads anyway with a flag set".
 */

export const CONSENT_KEY = "flazz-consent";
export const CONSENT_VERSION = 1;

export type ConsentState = "granted" | "denied" | "unknown";

type StoredConsent = { v: number; state: "granted" | "denied"; at: string };

/** Broadcast within the tab; `storage` only fires in *other* tabs. */
const CONSENT_EVENT = "flazz-consent-change";

export function readConsent(): ConsentState {
  if (typeof window === "undefined") return "unknown";

  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return "unknown";

    const parsed = JSON.parse(raw) as StoredConsent;

    // A bumped version re-asks rather than assuming the old answer still
    // covers whatever was added since.
    if (parsed.v !== CONSENT_VERSION) return "unknown";

    return parsed.state === "granted" ? "granted" : "denied";
  } catch {
    // Private mode, blocked storage, or hand-edited junk. Never assume consent.
    return "unknown";
  }
}

export function writeConsent(state: "granted" | "denied") {
  try {
    window.localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({
        v: CONSENT_VERSION,
        state,
        at: new Date().toISOString(),
      } satisfies StoredConsent)
    );
  } catch {
    // Storage blocked: the choice holds for this page view and is asked again
    // next visit, which is the safe direction to fail in.
  }

  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: state }));
}

/**
 * Current consent, reactive across tabs.
 *
 * Starts at "unknown" on both server and client so hydration matches — reading
 * localStorage during render would produce different HTML on the two sides.
 * The real value arrives in an effect, one frame later.
 */
export function useConsent() {
  const [consent, setConsent] = useState<ConsentState>("unknown");

  useEffect(() => {
    setConsent(readConsent());

    const onChange = () => setConsent(readConsent());

    window.addEventListener(CONSENT_EVENT, onChange);
    // Another tab decided; honour it here too rather than tracking someone who
    // has just opted out next door.
    window.addEventListener("storage", onChange);

    return () => {
      window.removeEventListener(CONSENT_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const decide = useCallback((state: "granted" | "denied") => {
    writeConsent(state);
    setConsent(state);
  }, []);

  return { consent, decide };
}
