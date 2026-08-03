"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, MessageCircle, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { isVector } from "@/lib/media/url";
import type { ChatConfig } from "@/lib/chat";
import { TelegramIcon, WhatsappIcon } from "@/components/common/Icons";
import { track } from "@/lib/analytics/track";

/**
 * Floating support chat.
 *
 * A launcher and a panel of pre-written openers. Every action is an ordinary
 * link to WhatsApp or Telegram with the message already typed — there is no
 * chat server here, and none is wanted: the conversation belongs in the app the
 * visitor already has notifications turned on for.
 */

/** Set once the visitor has opened the panel, so the pulse only ever nags once. */
const SEEN_KEY = "flazz-support-chat-seen";

/** Focusable descendants, in DOM order, for the tab trap. */
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function SupportChatWidget({ config }: { config: ChatConfig }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(true);

  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const titleId = useId();

  const reducedMotion = useReducedMotion();
  const left = config.position === "LEFT";

  // Read after mount: localStorage is not available while rendering, and
  // starting from `true` means the pulse can only ever appear, never flash off.
  useEffect(() => {
    try {
      setSeen(window.localStorage.getItem(SEEN_KEY) === "1");
    } catch {
      // Private mode or blocked storage — treat as seen and stay quiet.
    }
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  function toggle() {
    setOpen((wasOpen) => {
      if (!wasOpen) track("support_chat_open", {});
      if (!wasOpen && !seen) {
        setSeen(true);
        try {
          window.localStorage.setItem(SEEN_KEY, "1");
        } catch {
          // Nothing to do — the pulse simply returns next visit.
        }
      }
      return !wasOpen;
    });
  }

  // Escape, and a tab trap so focus cannot wander behind an open panel.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      // Wrap at both ends rather than letting focus escape to the page.
      if (event.shiftKey && (active === first || !panelRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, close]);

  // Click outside. `pointerdown` rather than `click` so the panel closes on
  // press, matching every other dismissible surface in the design.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (launcherRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Move focus into the panel on open. The heading is the landing point, so a
  // screen reader announces what just opened before reading the actions.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const transition = reducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 380, damping: 30, mass: 0.8 };

  return (
    <div
      className={cn(
        "fixed bottom-4 z-70 flex flex-col items-end gap-3 sm:bottom-6",
        left ? "left-4 items-start sm:left-6" : "right-4 items-end sm:right-6"
      )}
    >
      <AnimatePresence>
        {open ? (
          <motion.div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
            transition={transition}
            style={{ transformOrigin: left ? "bottom left" : "bottom right" }}
            className={cn(
              "glass-solid seam flex w-[min(21rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[1.5rem]",
              // Tall enough that the default four actions never scroll, and
              // capped against the viewport so a short screen still fits the
              // launcher underneath.
              "max-h-[min(37rem,calc(100dvh-7.5rem))]"
            )}
          >
            {/* ------------------------------------------------------ header */}
            <div className="relative shrink-0 overflow-hidden border-b border-white/8 px-5 py-4">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-16 -right-10 h-36 w-36 rounded-full bg-volt/25 blur-[50px]"
              />

              <div className="relative flex items-center gap-3">
                {config.logoUrl ? (
                  <Image
                    src={config.logoUrl}
                    alt=""
                    aria-hidden
                    width={44}
                    height={44}
                    unoptimized={isVector(config.logoUrl)}
                    className="size-11 shrink-0 rounded-xl border border-white/10 bg-ink-800/60 object-contain p-1"
                  />
                ) : null}

                <div className="min-w-0 flex-1">
                  <p
                    id={titleId}
                    tabIndex={-1}
                    data-autofocus
                    className="truncate text-[.95rem] font-bold text-foam outline-none"
                  >
                    {config.title}
                  </p>
                  {config.subtitle ? (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-mist">
                      <span
                        aria-hidden
                        className="size-1.5 shrink-0 rounded-full bg-online shadow-[0_0_8px_#35E0A1]"
                      />
                      <span className="truncate">{config.subtitle}</span>
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={close}
                  aria-label="Tutup obrolan"
                  className="grid size-8 shrink-0 place-items-center rounded-full border border-white/10 text-mist transition-colors hover:border-gold/45 hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            </div>

            {/* ------------------------------------------------------- body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {config.greeting ? (
                <p className="glass-soft rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed whitespace-pre-line text-foam">
                  {config.greeting}
                </p>
              ) : null}

              {config.actions.length > 0 ? (
                <ul className="mt-4 grid gap-2">
                  {config.actions.map((action) => (
                    <li key={`${action.label}-${action.channel}`}>
                      <a
                        href={action.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          // Two events on purpose: the specific opener that was
                          // chosen (a Lead — the visitor said what they want),
                          // and the channel it went out on, so contact volume
                          // per channel stays comparable across the whole site.
                          //
                          // Only the first counts as a Google Ads conversion.
                          // Both are in GOOGLE_ADS_CONVERSIONS and there is one
                          // conversion action behind them, so letting both fire
                          // reports one click as two — and an account bidding
                          // on doubled conversions overpays for every one of
                          // them. GA4 and Meta keep the pair.
                          track("support_chat_action", {
                            item_name: action.label,
                            channel: action.channel,
                            destination: action.href,
                          });
                          track(
                            action.channel === "TELEGRAM"
                              ? "contact_telegram"
                              : "contact_whatsapp",
                            {
                              location: "support_chat",
                              destination: action.href,
                              item_name: action.label,
                            },
                            { adsConversion: false }
                          );
                        }}
                        className="group flex min-h-11 w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] px-4 py-2.5 text-left text-sm font-medium text-foam transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/45 hover:bg-gold/8 hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                      >
                        <span className="min-w-0 flex-1 truncate">{action.label}</span>
                        <ArrowUpRight
                          aria-hidden
                          className="size-4 shrink-0 text-fog transition-colors group-hover:text-gold"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {/* ---------------------------------------------- direct contact */}
            <div className="shrink-0 border-t border-white/8 px-5 py-4">
              <p className="font-mono text-[.58rem] font-bold tracking-[.2em] text-fog uppercase">
                Hubungi langsung
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {config.whatsappUrl ? (
                  <a
                    href={config.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      track("contact_whatsapp", {
                        location: "support_chat_direct",
                        destination: config.whatsappUrl,
                      })
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-online/30 bg-online/10 px-3 text-sm font-semibold text-online transition-all duration-300 hover:-translate-y-0.5 hover:border-online/60 hover:bg-online/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-online"
                  >
                    <WhatsappIcon className="size-4 shrink-0" />
                    WhatsApp
                  </a>
                ) : null}

                {config.telegramUrl ? (
                  <a
                    href={config.telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      track("contact_telegram", {
                        location: "support_chat_direct",
                        destination: config.telegramUrl,
                      })
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-volt/40 bg-volt/12 px-3 text-sm font-semibold text-volt-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-volt/70 hover:bg-volt/18 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt"
                  >
                    <TelegramIcon className="size-4 shrink-0" />
                    Telegram
                  </a>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ------------------------------------------------------- launcher */}
      <button
        ref={launcherRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? "Tutup obrolan bantuan" : "Buka obrolan bantuan"}
        className={cn(
          "group relative grid size-16 shrink-0 place-items-center rounded-full sm:size-18",
          "bg-[linear-gradient(135deg,#FFF0B8,#FFD54A_45%,#D9A81F)] text-ink",
          "shadow-[0_14px_38px_-10px_rgba(255,213,74,.65)]",
          "transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)]",
          "hover:scale-105 hover:shadow-[0_20px_50px_-12px_rgba(255,213,74,.85)]",
          "active:scale-95",
          "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold",
          "motion-reduce:transition-none motion-reduce:hover:scale-100"
        )}
      >
        {/* One-time attention ring. Stops after the first open, and never runs
            for a visitor who has asked for reduced motion. */}
        {!seen && !open && !reducedMotion ? (
          <span
            aria-hidden
            className="absolute inset-0 animate-ping rounded-full bg-gold/40 [animation-duration:2.4s]"
          />
        ) : null}

        <span className="relative">
          {open ? (
            <X className="size-6 sm:size-7" aria-hidden />
          ) : (
            <MessageCircle className="size-6 sm:size-7" aria-hidden />
          )}
        </span>
      </button>
    </div>
  );
}
