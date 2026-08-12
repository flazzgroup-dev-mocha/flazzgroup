import Image from "next/image";
import Link from "next/link";

import { TrackedLink } from "@/components/analytics/TrackedLink";
import { ArrowUpRight } from "lucide-react";

import type { Settings } from "@/lib/queries";
import { LEGAL_LINKS, PAGE_LINKS, resolveHref, type NavLink } from "@/lib/site-nav";
import type { Brand, CommunityLink } from "@/lib/models";
import { Wordmark } from "@/components/common/Wordmark";
import {
  InstagramIcon,
  TelegramIcon,
  TiktokIcon,
  WhatsappIcon,
  YoutubeIcon,
} from "@/components/common/Icons";

type Column = { title: string; links: { label: string; href: string }[] };

export function Footer({
  settings,
  navLinks,
  brands,
  community,
}: {
  settings: Settings;
  navLinks: NavLink[];
  brands: Brand[];
  community: CommunityLink[];
}) {
  // Footer columns are derived from live data, so they can never drift from
  // what the page actually shows. The "Informasi" column is the exception and
  // is meant to be: those four routes exist unconditionally.
  const columns: Column[] = [
    { title: "Layanan", links: [...navLinks] },
    {
      title: "Brand",
      links: brands.slice(0, 5).map((brand) => ({
        label: brand.name,
        href: resolveHref(brand.link),
      })),
    },
    {
      title: "Community",
      links: community.map((channel) => ({
        label: channel.title,
        href: resolveHref(channel.url),
      })),
    },
    { title: "Informasi", links: [...PAGE_LINKS, ...LEGAL_LINKS] },
  ].filter((column) => column.links.length > 0);

  const socials = [
    { label: "Telegram", href: settings.telegramUrl, Icon: TelegramIcon },
    { label: "WhatsApp", href: settings.whatsappUrl, Icon: WhatsappIcon },
    { label: "Instagram", href: settings.instagramUrl, Icon: InstagramIcon },
    { label: "TikTok", href: settings.tiktokUrl, Icon: TiktokIcon },
    { label: "YouTube", href: settings.youtubeUrl, Icon: YoutubeIcon },
  ].filter((social) => social.href.trim().length > 0);

  return (
    <footer className="relative mt-8 border-t border-white/8 bg-ink-800/60 backdrop-blur-xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-px h-px bg-linear-to-r from-transparent via-gold/50 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/2 -z-10 h-72 w-[42rem] max-w-[92vw] -translate-x-1/2 rounded-full bg-volt/10 blur-[120px]"
      />

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_2.7fr]">
          {/* Identity */}
          <div>
            <Link
              href="/"
              className="group flex items-center gap-3"
            >
              <Image
                src={settings.logoUrl}
                alt=""
                aria-hidden
                width={48}
                height={48}
                unoptimized={settings.logoUrl.endsWith(".svg")}
                className="size-11 rounded-xl transition-transform duration-500 group-hover:rotate-6"
              />
              <span className="flex flex-col leading-none">
                <Wordmark
                  name={settings.siteName}
                  className="text-lg font-extrabold"
                />
                <span
                  aria-hidden
                  className="mt-1 font-mono text-[.58rem] tracking-[.24em] text-fog"
                >
                  TOP UP STORE
                </span>
              </span>
            </Link>

            {settings.footerTagline ? (
              <p className="mt-5 max-w-xs text-sm text-mist">
                {settings.footerTagline}
              </p>
            ) : null}

            {socials.length > 0 ? (
              <ul className="mt-6 flex flex-wrap gap-2">
                {socials.map(({ label, href, Icon }) => (
                  <li key={label}>
                    <TrackedLink
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${label} — dibuka di tab baru`}
                      event="channel_click"
                      params={{ channel: label, destination: href, location: "footer" }}
                      className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/[.03] text-mist transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/45 hover:bg-gold/10 hover:text-gold"
                    >
                      <Icon className="size-4.5" />
                    </TrackedLink>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* Link columns */}
          {columns.length > 0 ? (
            <nav
              aria-label="Tautan footer"
              className="grid grid-cols-2 gap-8 lg:grid-cols-4"
            >
              {columns.map((column) => (
                <div key={column.title}>
                  <h2 className="font-mono text-[.65rem] font-bold tracking-[.2em] text-gold uppercase">
                    {column.title}
                  </h2>
                  <ul className="mt-4 grid gap-2.5">
                    {column.links.map((link) => {
                      const external = link.href.startsWith("http");
                      return (
                        <li key={`${column.title}-${link.label}`}>
                          <Link
                            href={link.href}
                            {...(external
                              ? { target: "_blank", rel: "noopener noreferrer" }
                              : {})}
                            className="group inline-flex min-h-9 items-center gap-1 py-1 text-sm text-mist transition-colors duration-300 hover:text-foam"
                          >
                            {link.label}
                            {external ? (
                              <ArrowUpRight
                                aria-hidden
                                className="size-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                              />
                            ) : null}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          ) : null}
        </div>

        <div className="rule-gold my-10 opacity-70" />

        <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-fog">
            © {new Date().getFullYear()} {settings.footerCopyright}
          </p>
          {settings.footerDisclaimer ? (
            <p className="font-mono text-[.62rem] tracking-[.18em] text-fog uppercase">
              {settings.footerDisclaimer}
            </p>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
