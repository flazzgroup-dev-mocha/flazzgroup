"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Search, X, Zap } from "lucide-react";

import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/common/Wordmark";
import type { NavLink } from "@/lib/site-nav";

export function Navbar({
  siteName,
  logoUrl,
  tickerEnabled,
  tickerText,
  links,
  searchTargetId,
}: {
  siteName: string;
  logoUrl: string;
  tickerEnabled: boolean;
  tickerText: string;
  links: NavLink[];
  searchTargetId: string;
}) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  const showTicker = tickerEnabled && tickerText.trim().length > 0;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const onSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setMenuOpen(false);

      // The catalogue lives on the homepage. This navbar also renders on /blog
      // and on every article, where the target section is simply not in the
      // document — scrolling to it there would do nothing at all, so fall
      // through to a real navigation instead.
      const target = document.getElementById(searchTargetId);

      if (target) target.scrollIntoView({ behavior: "smooth" });
      else router.push(`/#${searchTargetId}`);

      void query;
    },
    [query, router, searchTargetId]
  );

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Promo ticker — collapses away the moment the page moves */}
      {showTicker ? (
        <div
          className={cn(
            "overflow-hidden border-b border-white/5 bg-abyss/70 backdrop-blur-md transition-[height,opacity] duration-500 ease-[cubic-bezier(.22,1,.36,1)]",
            scrolled ? "h-0 opacity-0" : "h-9 opacity-100"
          )}
        >
          <p className="flex h-9 items-center justify-center gap-2 px-4 text-[.7rem] font-medium tracking-wide text-mist sm:text-xs">
            <Zap className="size-3.5 shrink-0 text-gold" aria-hidden />
            <span className="truncate">{tickerText}</span>
          </p>
        </div>
      ) : null}

      <div
        className={cn(
          "transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)]",
          scrolled
            ? "border-b border-white/8 bg-ink/72 shadow-[0_18px_40px_-28px_rgba(0,0,0,.95)] backdrop-blur-2xl backdrop-saturate-150"
            : "border-b border-transparent bg-transparent"
        )}
      >
        <nav
          aria-label="Navigasi utama"
          className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:h-18 sm:px-6 lg:px-8"
        >
          {/* Logo */}
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2.5"
          >
            <Image
              src={logoUrl}
              alt=""
              aria-hidden
              width={48}
              height={48}
              priority
              unoptimized={logoUrl.endsWith(".svg")}
              className="size-9 rounded-xl transition-transform duration-500 group-hover:rotate-6 sm:size-10"
            />
            <span className="flex flex-col leading-none">
              <Wordmark
                name={siteName}
                className="text-[.95rem] font-extrabold sm:text-base"
              />
              <span
                aria-hidden
                className="mt-0.5 font-mono text-[.55rem] tracking-[.24em] text-fog"
              >
                TOP UP STORE
              </span>
            </span>
          </Link>

          {/* Search — desktop */}
          <form
            role="search"
            onSubmit={onSearch}
            className="relative hidden max-w-xs flex-1 lg:block xl:max-w-sm"
          >
            <label htmlFor="game-search" className="sr-only">
              Cari game
            </label>
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-fog"
            />
            <input
              id="game-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari game…"
              className="glass-soft h-11 w-full rounded-full pr-4 pl-11 text-sm text-foam transition-colors duration-300 placeholder:text-fog focus:border-volt/60 focus:bg-white/[.06] focus:outline-none"
            />
          </form>

          {/* Links — desktop */}
          <ul className="ml-auto hidden items-center gap-1 lg:flex">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="group relative inline-flex min-h-11 items-center rounded-full px-3.5 text-sm font-medium text-mist transition-colors duration-300 hover:text-foam xl:px-4"
                >
                  {link.label}
                  <span className="absolute inset-x-3.5 -bottom-0.5 h-px scale-x-0 bg-linear-to-r from-transparent via-gold to-transparent transition-transform duration-400 group-hover:scale-x-100" />
                </Link>
              </li>
            ))}
          </ul>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
            className="glass-soft ml-auto grid size-11 place-items-center rounded-full text-foam transition-colors hover:border-gold/45 hover:text-gold lg:hidden"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </nav>
      </div>

      {/* Mobile panel */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className="fixed inset-0 -z-10 bg-ink-800/75 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              aria-hidden
            />
            <motion.div
              id="mobile-menu"
              key="panel"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="glass mx-3 mt-2 rounded-3xl p-4 lg:hidden"
            >
              <form role="search" onSubmit={onSearch} className="relative mb-4">
                <label htmlFor="game-search-mobile" className="sr-only">
                  Cari game
                </label>
                <Search
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-fog"
                />
                <input
                  id="game-search-mobile"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari game…"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-ink-800/60 pr-4 pl-11 text-sm text-foam placeholder:text-fog focus:border-volt/60 focus:outline-none"
                />
              </form>

              <ul className="grid gap-1">
                {links.map((link, i) => (
                  <motion.li
                    key={link.href}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 + i * 0.05, duration: 0.35 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-between rounded-2xl px-4 py-3.5 text-[.95rem] font-semibold text-foam transition-colors hover:bg-white/[.06] hover:text-gold"
                    >
                      {link.label}
                      <Zap className="size-4 text-fog" aria-hidden />
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
