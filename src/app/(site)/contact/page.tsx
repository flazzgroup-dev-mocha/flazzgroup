import type { ComponentType, SVGProps } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Info,
  Megaphone,
  ShieldAlert,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { getCommunityLinks, getSettings } from "@/lib/queries";
import { staticPageMetadata } from "@/lib/seo";
import { primaryTargetId, resolveHref } from "@/lib/site-nav";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/PageShell";
import { PageHero } from "@/components/common/PageHero";
import { PageSchema } from "@/components/common/PageSchema";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Reveal, RevealItem } from "@/components/common/Reveal";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import {
  InstagramIcon,
  TelegramIcon,
  TiktokIcon,
  WhatsappIcon,
  YoutubeIcon,
} from "@/components/common/Icons";

/**
 * Every contact detail on this page comes from the same two places the rest of
 * the site reads:
 *
 *   - `WebsiteSettings.whatsappUrl` / `telegramUrl` / the social columns — the
 *     row the navbar, the footer, the FAQ button and the floating chat widget
 *     already use;
 *   - the `CommunityLink` table — the rows behind the homepage's Community
 *     section.
 *
 * No new column, no new table, no copy of a phone number living in this file.
 * Change the number once in /admin and it changes here too.
 */
export const revalidate = 3600;

const DESCRIPTION =
  "Hubungi customer service FLAZZ GROUP lewat WhatsApp atau Telegram, atau ikuti channel resmi dan grup komunitas kami. Kanal aktif setiap hari.";

export async function generateMetadata(): Promise<Metadata> {
  return staticPageMetadata({
    title: "Kontak FLAZZ GROUP | Customer Service",
    description: DESCRIPTION,
    path: "/contact",
  });
}

/** Trailing slashes and casing must not make two identical links look different. */
const normalize = (url: string) => url.trim().toLowerCase().replace(/\/+$/, "");

/**
 * What a community row is for, read from the icon the admin already picked —
 * the same four keys the homepage's Community section understands, so nothing
 * new has to be configured for this page to label a channel correctly.
 */
const ROLES: Record<
  string,
  { label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }
> = {
  megaphone: { label: "Informasi", Icon: Megaphone },
  users: { label: "Komunitas", Icon: Users },
  telegram: { label: "Kanal", Icon: TelegramIcon },
  whatsapp: { label: "Kanal", Icon: WhatsappIcon },
};

export default async function ContactPage() {
  const [settings, community] = await Promise.all([
    getSettings(),
    getCommunityLinks(),
  ]);

  const whatsappUrl = settings.whatsappUrl.trim();
  const telegramUrl = settings.telegramUrl.trim();

  /**
   * The customer-service channels, in the order a visitor is most likely to
   * want them. An empty column is dropped rather than rendered as a dead
   * button — the same rule `toChatConfig` applies to the floating widget.
   */
  const supportChannels = [
    {
      key: "whatsapp" as const,
      name: "WhatsApp",
      href: whatsappUrl,
      Icon: WhatsappIcon,
      hue: "#35E0A1",
      body: "Paling cepat untuk pertanyaan seputar pesanan, pembayaran, dan status top up.",
      cta: "Chat WhatsApp",
      event: "contact_whatsapp" as const,
    },
    {
      key: "telegram" as const,
      name: "Telegram",
      href: telegramUrl,
      Icon: TelegramIcon,
      hue: "#2E7CF6",
      body: "Alternatif kalau kamu lebih nyaman di Telegram. Admin yang sama, antrean yang sama.",
      cta: "Buka Telegram",
      event: "contact_telegram" as const,
    },
  ].filter((channel) => channel.href.length > 0);

  /**
   * Community rows that merely repeat a support number are dropped: the seeded
   * "Telegram" and "WhatsApp" rows point at exactly the settings URLs above, and
   * listing them twice would blur the one distinction this page has to make —
   * which channel answers questions, and which one is a broadcast or a group.
   */
  const supportUrls = new Set(
    supportChannels.map((channel) => normalize(channel.href))
  );

  const otherChannels = community.filter(
    (channel) => !supportUrls.has(normalize(channel.url))
  );

  const socials = [
    { label: "Instagram", href: settings.instagramUrl, Icon: InstagramIcon },
    { label: "TikTok", href: settings.tiktokUrl, Icon: TiktokIcon },
    { label: "YouTube", href: settings.youtubeUrl, Icon: YoutubeIcon },
  ].filter((social) => social.href.trim().length > 0);

  const catalogHref = `/#${primaryTargetId(settings)}`;

  return (
    <PageShell>
      <PageSchema
        settings={settings}
        type="ContactPage"
        path="/contact"
        name="Kontak FLAZZ GROUP"
        description={DESCRIPTION}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-96 w-[46rem] max-w-full rounded-full bg-volt/12 blur-[130px]"
        />

        <PageHero
          eyebrow="Hubungi Kami"
          title={
            <>
              Kontak <span className="text-royal">FLAZZ GROUP</span>
            </>
          }
          lead="Ada pertanyaan soal harga, pembayaran, atau pesanan yang sedang berjalan? Hubungi customer service lewat kanal resmi di bawah ini. Kami tidak memproses pesanan lewat kolom komentar atau pesan langsung di media sosial."
        />

        {/* -------------------------------------------- customer service */}
        <section
          aria-labelledby="support-title"
          className="relative scroll-mt-28 py-12 sm:py-16"
        >
          <SectionHeading
            eyebrow="Customer service"
            title={
              <span id="support-title">
                Bantuan <span className="text-volt">langsung</span>
              </span>
            }
            note="Kanal ini yang menangani pesanan dan kendala. Balasan dikirim oleh admin, bukan bot."
          />

          {supportChannels.length > 0 ? (
            <Reveal stagger={0.1} className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              {supportChannels.map((channel) => (
                <RevealItem key={channel.key}>
                  <article className="glass seam lift group relative flex h-full flex-col overflow-hidden rounded-[1.5rem] p-6 sm:p-7">
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -top-20 left-1/2 size-44 -translate-x-1/2 rounded-full opacity-20 blur-[70px] transition-opacity duration-500 group-hover:opacity-45"
                      style={{ background: channel.hue }}
                    />

                    <span
                      className="relative z-10 grid size-14 place-items-center rounded-2xl border transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-105"
                      style={{
                        color: channel.hue,
                        borderColor: `${channel.hue}55`,
                        background: `${channel.hue}18`,
                      }}
                    >
                      <channel.Icon className="size-6" aria-hidden />
                    </span>

                    <h3 className="relative z-10 mt-5 text-lg font-bold text-foam">
                      {channel.name} Customer Service
                    </h3>
                    <p className="relative z-10 mt-1.5 text-sm leading-relaxed text-mist">
                      {channel.body}
                    </p>

                    <div className="relative z-10 mt-auto pt-6">
                      <Button variant="gold" size="md" asChild className="w-full">
                        <TrackedLink
                          href={channel.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${channel.cta} — dibuka di tab baru`}
                          event={channel.event}
                          params={{
                            location: "contact_page",
                            destination: channel.href,
                          }}
                        >
                          {channel.cta}
                          <ArrowUpRight aria-hidden />
                        </TrackedLink>
                      </Button>
                    </div>
                  </article>
                </RevealItem>
              ))}
            </Reveal>
          ) : (
            /* No configured channel is a real state on a fresh deploy. Say so
               plainly instead of rendering buttons that go nowhere. */
            <div className="glass grid place-items-center gap-3 rounded-[1.5rem] px-6 py-16 text-center">
              <p className="text-lg font-bold text-foam">
                Kanal customer service sedang diperbarui
              </p>
              <p className="max-w-md text-sm text-mist">
                Silakan cek kembali sebentar lagi, atau ikuti channel resmi kami
                untuk pengumuman terbaru.
              </p>
            </div>
          )}

          <Reveal delay={0.15}>
            <p className="mt-4 flex items-start gap-2.5 text-sm text-fog">
              <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-gold" />
              <span>
                Admin FLAZZ GROUP tidak pernah meminta kata sandi akun, kode OTP,
                atau PIN pembayaran. Pastikan kamu menghubungi kanal yang
                tercantum di halaman ini.
              </span>
            </p>
          </Reveal>
        </section>

        {/* ------------------------------------- channels and community */}
        {otherChannels.length > 0 ? (
          <section
            aria-labelledby="channels-title"
            className="relative scroll-mt-28 py-12 sm:py-16"
          >
            <SectionHeading
              eyebrow="Channel & komunitas"
              title={
                <span id="channels-title">
                  Info resmi dan <span className="text-royal">tempat ngobrol</span>
                </span>
              }
              note="Untuk pengumuman dan obrolan antarpemain. Pesanan tetap diproses lewat customer service di atas."
            />

            {/* The column count follows the row count. Community rows are
                admin-managed and there are two of them today; a hard
                `lg:grid-cols-3` left a visibly empty third column. */}
            <Reveal
              stagger={0.09}
              className={cn(
                "grid gap-3 sm:grid-cols-2 sm:gap-4",
                otherChannels.length >= 3 && "lg:grid-cols-3"
              )}
            >
              {otherChannels.map((channel) => {
                const role =
                  ROLES[channel.icon as keyof typeof ROLES] ?? ROLES.megaphone;
                const href = resolveHref(channel.url);

                return (
                  <RevealItem key={channel.id}>
                    <article className="glass seam lift group relative flex h-full flex-col overflow-hidden rounded-[1.5rem] p-5 sm:p-6">
                      <div
                        aria-hidden
                        className="pointer-events-none absolute -top-20 left-1/2 size-44 -translate-x-1/2 rounded-full opacity-20 blur-[70px] transition-opacity duration-500 group-hover:opacity-45"
                        style={{ background: channel.hue }}
                      />

                      <div className="relative z-10 flex items-start justify-between gap-3">
                        <span
                          className="grid size-13 place-items-center rounded-2xl border transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-105"
                          style={{
                            color: channel.hue,
                            borderColor: `${channel.hue}55`,
                            background: `${channel.hue}18`,
                          }}
                        >
                          <role.Icon className="size-6" aria-hidden />
                        </span>
                        <span className="inline-flex items-center rounded-full border border-white/12 bg-white/[.04] px-2.5 py-1 font-mono text-[.6rem] font-bold tracking-[.14em] text-fog uppercase">
                          {role.label}
                        </span>
                      </div>

                      <h3 className="relative z-10 mt-5 text-lg font-bold text-foam">
                        {channel.title}
                      </h3>
                      {channel.description ? (
                        <p className="relative z-10 mt-1.5 text-sm text-mist">
                          {channel.description}
                        </p>
                      ) : null}

                      {channel.meta ? (
                        <span className="relative z-10 mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-white/[.04] px-2.5 py-1 font-mono text-[.6rem] tracking-[.14em] text-fog uppercase">
                          {channel.meta}
                        </span>
                      ) : null}

                      <div className="relative z-10 mt-auto pt-5">
                        <Button variant="glass" size="sm" asChild className="w-full">
                          <TrackedLink
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${channel.ctaLabel} — dibuka di tab baru`}
                            event="community_click"
                            params={{
                              item_id: channel.id,
                              item_name: channel.title,
                              channel: channel.icon,
                              destination: href,
                            }}
                          >
                            {channel.ctaLabel}
                            <ArrowUpRight aria-hidden />
                          </TrackedLink>
                        </Button>
                      </div>
                    </article>
                  </RevealItem>
                );
              })}
            </Reveal>
          </section>
        ) : null}

        {/* --------------------------------------------------- socials */}
        {socials.length > 0 ? (
          <section
            aria-labelledby="social-title"
            className="relative scroll-mt-28 pb-12 sm:pb-16"
          >
            <Reveal>
              <div className="glass seam flex flex-col gap-5 rounded-[1.5rem] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
                <div>
                  <h2 id="social-title" className="text-lg font-bold text-foam">
                    Media sosial resmi
                  </h2>
                  <p className="mt-1.5 flex items-start gap-2 text-sm text-mist">
                    <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-fog" />
                    <span>
                      Untuk konten dan pengumuman. Pesanan tidak diproses lewat
                      direct message di media sosial.
                    </span>
                  </p>
                </div>

                <ul className="flex flex-wrap gap-2">
                  {socials.map(({ label, href, Icon }) => (
                    <li key={label}>
                      <TrackedLink
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${label} — dibuka di tab baru`}
                        event="channel_click"
                        params={{
                          channel: label,
                          destination: href,
                          location: "contact_page",
                        }}
                        className="grid size-11 place-items-center rounded-xl border border-white/10 bg-white/[.03] text-mist transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/45 hover:bg-gold/10 hover:text-gold"
                      >
                        <Icon className="size-4.5" />
                      </TrackedLink>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </section>
        ) : null}

        {/* ------------------------------------------------------- CTA */}
        <section aria-labelledby="cta-title" className="relative pb-12 sm:pb-16">
          <Reveal>
            <div className="glass seam rounded-[1.5rem] p-6 sm:p-8 lg:p-10">
              <h2 id="cta-title" className="text-xl font-bold text-foam sm:text-2xl">
                Sudah tahu mau top up berapa?
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-mist sm:text-base">
                Lihat daftar harga lebih dulu, lalu kirim nominalnya ke admin
                supaya pesanan bisa langsung diproses. Ketentuan layanan ada di{" "}
                <Link
                  href="/terms"
                  className="font-semibold text-gold underline decoration-gold/35 underline-offset-[3px] transition-colors hover:decoration-gold"
                >
                  Terms &amp; Conditions
                </Link>
                .
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                {/* Volt, not gold: on this page the gold buttons belong to the
                    customer-service cards. Two competing "most important"
                    actions is how a page stops having one. */}
                <Button variant="volt" size="lg" asChild>
                  <Link href={catalogHref}>
                    Lihat daftar harga
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
                <Button variant="glass" size="lg" asChild>
                  <Link href="/about">Tentang FLAZZ GROUP</Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </section>
      </div>
    </PageShell>
  );
}
