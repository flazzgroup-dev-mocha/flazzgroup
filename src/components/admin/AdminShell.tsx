"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ExternalLink,
  Newspaper,
  Flame,
  Gamepad2,
  Gauge,
  HelpCircle,
  Images,
  LayoutGrid,
  LogOut,
  Menu,
  MessageCircle,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  Tags,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { ROLE_LABELS, canAccess, type AdminRole } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { FlazzMark } from "@/components/common/Icons";

type NavItem = { href: string; label: string; icon: LucideIcon };

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: Gauge }],
  },
  {
    title: "Homepage",
    items: [
      { href: "/admin/banners", label: "Hero Banner", icon: Images },
      { href: "/admin/hero-stats", label: "Hero Stats", icon: Activity },
      { href: "/admin/games", label: "Games", icon: Gamepad2 },
      { href: "/admin/popular", label: "Popular", icon: Flame },
      { href: "/admin/products", label: "Products", icon: LayoutGrid },
      { href: "/admin/brands", label: "Brands", icon: Store },
      { href: "/admin/features", label: "Features", icon: Sparkles },
      { href: "/admin/payments", label: "Payments", icon: Wallet },
      { href: "/admin/community", label: "Community Links", icon: Users },
      { href: "/admin/faq", label: "FAQ", icon: HelpCircle },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/admin/blog", label: "Blog", icon: Newspaper },
      { href: "/admin/blog-taxonomy", label: "Blog Taxonomy", icon: Tags },
    ],
  },
  {
    title: "Support",
    items: [{ href: "/admin/chat", label: "Floating Chat", icon: MessageCircle }],
  },
  {
    title: "Configuration",
    items: [
      { href: "/admin/settings", label: "General Settings", icon: Settings },
      { href: "/admin/users", label: "Users", icon: ShieldCheck },
    ],
  },
];

export function AdminShell({
  adminName,
  adminEmail,
  role,
  children,
}: {
  adminName: string;
  adminEmail: string;
  role: AdminRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Close the drawer whenever navigation happens.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) =>
      event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Signed out");
      router.replace("/admin/login");
      router.refresh();
    } catch {
      toast.error("Could not sign out. Try again.");
      setSigningOut(false);
    }
  }

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccess(role, item.href)),
    }))
    .filter((group) => group.items.length > 0);

  const nav = (
    <nav aria-label="Admin sections" className="flex h-full flex-col gap-6 p-4">
      <Link
        href="/admin"
        className="flex items-center gap-3 rounded-2xl px-2 py-1"
      >
        <FlazzMark className="size-9" />
        <span className="flex flex-col leading-none">
          <span className="text-sm font-extrabold tracking-tight">
            FLAZZ<span className="text-gold">GROUP</span>
          </span>
          <span className="mt-1 font-mono text-[.55rem] tracking-[.22em] text-fog">
            ADMIN PANEL
          </span>
        </span>
      </Link>

      {/*
        Hiding a link is presentation, never protection. Anyone can type the
        URL, and the answer then comes from the middleware and the page itself,
        which both refuse it with a 403. This exists so the panel does not offer
        a colleague a door that will not open for them.
      */}
      <div className="flex-1 space-y-6 overflow-y-auto">
        {visibleGroups.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-2 font-mono text-[.58rem] font-bold tracking-[.2em] text-fog uppercase">
              {group.title}
            </p>
            <ul className="grid gap-1">
              {group.items.map((item) => {
                const active =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                        active
                          ? "bg-gold/12 text-gold"
                          : "text-mist hover:bg-white/[.05] hover:text-foam"
                      )}
                    >
                      {active ? (
                        <span
                          aria-hidden
                          className="absolute top-1/2 left-0 h-6 w-0.5 -translate-y-1/2 rounded-full bg-gold shadow-[0_0_10px_#FFD54A]"
                        />
                      ) : null}
                      <item.icon className="size-4 shrink-0" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="grid gap-2 border-t border-white/8 pt-4">
        <Button variant="outline" size="sm" asChild className="justify-start">
          <Link href="/" target="_blank" rel="noopener noreferrer">
            <ExternalLink aria-hidden />
            View website
          </Link>
        </Button>

        <div className="rounded-xl border border-white/8 bg-white/[.02] px-3 py-2.5">
          <p className="truncate text-xs font-semibold text-foam">{adminName}</p>
          <p className="truncate text-[.68rem] text-fog">{adminEmail}</p>

          {/* The role is stated, not implied by which links happen to appear —
              somebody debugging "why can't I see Settings" should be able to
              answer it from this panel. */}
          <span
            className={cn(
              "mt-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[.55rem] font-bold tracking-[.16em] uppercase",
              role === "SUPER_ADMIN"
                ? "bg-gold text-ink"
                : "bg-volt/85 text-white"
            )}
          >
            {role === "SUPER_ADMIN" ? (
              <ShieldCheck className="size-2.5" aria-hidden />
            ) : null}
            {ROLE_LABELS[role]}
          </span>
        </div>

        <Button
          variant="glass"
          size="sm"
          onClick={signOut}
          disabled={signingOut}
          className="justify-start"
        >
          <LogOut aria-hidden />
          {signingOut ? "Signing out…" : "Logout"}
        </Button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh border-r border-white/8 bg-ink-800/60 backdrop-blur-xl lg:block">
        {nav}
      </aside>

      {/* Mobile bar */}
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-white/8 bg-ink/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open admin menu"
          aria-expanded={open}
          className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-foam"
        >
          <Menu className="size-5" />
        </button>
        <Link href="/admin" className="flex items-center gap-2">
          <FlazzMark className="size-7" />
          <span className="text-sm font-extrabold tracking-tight">
            FLAZZ<span className="text-gold">GROUP</span>
          </span>
        </Link>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="Close admin menu"
              className="fixed inset-0 z-50 bg-ink-800/80 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-[17rem] border-r border-white/10 bg-ink-800/95 backdrop-blur-xl lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close admin menu"
                className="absolute top-4 right-3 grid size-9 place-items-center rounded-full border border-white/10 text-mist"
              >
                <X className="size-4" />
              </button>
              {nav}
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">{children}</main>
    </div>
  );
}
