import Link from "next/link";
import {
  Clock3,
  Flame,
  HelpCircle,
  Images,
  LayoutGrid,
  Sparkles,
  Store,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { RESOURCE_LABELS, RESOURCE_ROUTES, type ResourceKey } from "@/lib/cache";
import { cn } from "@/lib/utils";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/surface";
import { PageHeader } from "@/components/admin/PageHeader";

export const dynamic = "force-dynamic";

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function timeAgo(date: Date) {
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["second", 60],
    ["minute", 60],
    ["hour", 24],
    ["day", 7],
    ["week", 4.35],
    ["month", 12],
  ];

  let value = seconds;
  for (const [unit, step] of units) {
    if (Math.abs(value) < step) return relative.format(Math.round(value), unit);
    value /= step;
  }

  return relative.format(Math.round(value), "year");
}

/**
 * Eight `SELECT count(*)` round trips collapsed into one statement.
 * The dashboard is uncached, so this runs on every load.
 */
async function countAll() {
  const [row] = await prisma.$queryRaw<
    Record<string, bigint>[]
  >`
    SELECT
      (SELECT count(*) FROM "hero_banners")     AS banners,
      (SELECT count(*) FROM "popular_services") AS popular,
      (SELECT count(*) FROM "products")         AS products,
      (SELECT count(*) FROM "brands")           AS brands,
      (SELECT count(*) FROM "features")         AS features,
      (SELECT count(*) FROM "payment_methods")  AS payments,
      (SELECT count(*) FROM "community_links")  AS community,
      (SELECT count(*) FROM "faqs")             AS faqs
  `;

  // Postgres count() returns bigint, which does not survive JSON.
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, Number(value)])
  ) as Record<
    "banners" | "popular" | "products" | "brands" | "features" | "payments" | "community" | "faqs",
    number
  >;
}

const actionTone = {
  CREATE: "online",
  UPDATE: "volt",
  DELETE: "danger",
  REORDER: "muted",
  LOGIN: "gold",
} as const;

export default async function DashboardPage() {
  const [
    banners,
    popular,
    products,
    brands,
    features,
    payments,
    community,
    faqs,
    settings,
    activity,
  ] = await Promise.all([
    countAll(),
    prisma.websiteSettings.findUnique({ where: { id: "settings" } }),
    // No `include: { admin }` — the feed renders the label, not who did it,
    // and the join was costing a scan of an unindexed foreign key for nothing.
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, action: true, entity: true, label: true, createdAt: true },
    }),
  ]).then(([counts, settingsRow, activityRows]) => [
    counts.banners,
    counts.popular,
    counts.products,
    counts.brands,
    counts.features,
    counts.payments,
    counts.community,
    counts.faqs,
    settingsRow,
    activityRows,
  ] as const);

  const stats: {
    key: ResourceKey;
    label: string;
    value: number;
    icon: LucideIcon;
  }[] = [
    { key: "banners", label: "Hero banners", value: banners, icon: Images },
    { key: "brands", label: "Brands", value: brands, icon: Store },
    { key: "community", label: "Community links", value: community, icon: Users },
    { key: "payments", label: "Payment methods", value: payments, icon: Wallet },
    { key: "faq", label: "FAQ entries", value: faqs, icon: HelpCircle },
    { key: "products", label: "Products", value: products, icon: LayoutGrid },
    { key: "popular", label: "Popular services", value: popular, icon: Flame },
    { key: "features", label: "Features", value: features, icon: Sparkles },
  ];

  const lastUpdated = activity[0]?.createdAt ?? settings?.updatedAt ?? null;

  const sections: { label: string; on: boolean }[] = [
    { label: "Hero", on: settings?.showHero ?? true },
    { label: "Popular", on: settings?.showPopular ?? true },
    { label: "Products", on: settings?.showProducts ?? true },
    { label: "Brands", on: settings?.showBrands ?? true },
    { label: "Features", on: settings?.showFeatures ?? true },
    { label: "Payment", on: settings?.showPayment ?? true },
    { label: "Community", on: settings?.showCommunity ?? true },
    { label: "FAQ", on: settings?.showFaq ?? true },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Everything the homepage renders, and what changed recently."
        action={
          lastUpdated ? (
            <span className="glass-soft inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs text-mist">
              <Clock3 className="size-4 text-gold" aria-hidden />
              Last updated {timeAgo(lastUpdated)}
            </span>
          ) : null
        }
      />

      <section aria-label="Content totals" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.key}
            href={`/admin/${RESOURCE_ROUTES[stat.key]}`}
            className="glass seam lift group rounded-2xl p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-10 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold transition-colors group-hover:border-gold/60">
                <stat.icon className="size-4.5" aria-hidden />
              </span>
              <span className="font-mono text-2xl font-bold text-foam">
                {stat.value}
              </span>
            </div>
            <p className="mt-4 text-sm font-semibold text-foam">{stat.label}</p>
            <p className="mt-0.5 text-xs text-fog">Manage →</p>
          </Link>
        ))}
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <Link
              href="/admin/settings"
              className="text-xs font-semibold text-mist hover:text-gold"
            >
              Settings
            </Link>
          </CardHeader>

          {activity.length === 0 ? (
            <CardContent>
              <p className="py-6 text-center text-sm text-mist">
                No changes recorded yet. Edits you make will show up here.
              </p>
            </CardContent>
          ) : (
            <ul className="divide-y divide-white/6">
              {activity.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                >
                  <Badge tone={actionTone[entry.action]}>{entry.action}</Badge>
                  <span className="min-w-0 flex-1 truncate text-sm text-foam">
                    {entry.label}
                  </span>
                  <span className="font-mono text-[.65rem] tracking-wide text-fog">
                    {RESOURCE_LABELS[entry.entity as ResourceKey] ?? entry.entity} ·{" "}
                    {timeAgo(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Section switches */}
        <Card>
          <CardHeader>
            <CardTitle>Homepage sections</CardTitle>
            <Link
              href="/admin/settings"
              className="text-xs font-semibold text-mist hover:text-gold"
            >
              Change
            </Link>
          </CardHeader>
          <CardContent className="grid gap-2">
            {sections.map((section) => (
              <div
                key={section.label}
                className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[.02] px-3.5 py-2.5"
              >
                <span className="text-sm text-foam">{section.label}</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 font-mono text-[.6rem] font-bold tracking-[.14em] uppercase",
                    section.on ? "text-online" : "text-fog"
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      section.on
                        ? "bg-online shadow-[0_0_8px_#35E0A1]"
                        : "bg-fog"
                    )}
                  />
                  {section.on ? "Visible" : "Hidden"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
