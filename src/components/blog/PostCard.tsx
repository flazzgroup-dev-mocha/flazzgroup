import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";

import { SITE_TIME_ZONE, cn } from "@/lib/utils";
import type { PostCard as PostCardData } from "@/lib/blog/queries";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import type { AnalyticsEventName, AnalyticsEvents } from "@/lib/analytics/events";

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  timeZone: SITE_TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function PostCard<K extends AnalyticsEventName>({
  post,
  priority = false,
  featured = false,
  trackAs,
}: {
  post: PostCardData;
  priority?: boolean;
  featured?: boolean;
  /**
   * What this card means in context. A card in the related strip and the same
   * card in search results are different signals, and the caller is the only
   * thing that knows which one this is.
   */
  trackAs?: { event: K; params: AnalyticsEvents[K] };
}) {
  /**
   * The overlay anchor, tracked or not.
   *
   * Built here rather than branching in the markup so the card's structure
   * stays one shape — an `absolute inset-0` link over the whole card is what
   * makes the entire tile clickable without nesting interactive elements.
   */
  const href = `/blog/${post.slug}`;
  const label = <span className="sr-only">{post.title}</span>;
  const overlayClass = "absolute inset-0 z-20";

  const anchor = trackAs ? (
    <TrackedLink
      href={href}
      className={overlayClass}
      aria-label={post.title}
      event={trackAs.event}
      params={trackAs.params}
    >
      {label}
    </TrackedLink>
  ) : (
    <Link href={href} className={overlayClass} aria-label={post.title}>
      {label}
    </Link>
  );
  return (
    <article
      className={cn(
        "glass seam lift group relative flex h-full flex-col overflow-hidden rounded-[1.5rem]",
        featured && "lg:flex-row"
      )}
    >
      {anchor}

      {/* Media */}
      <div
        className={cn(
          "relative overflow-hidden",
          featured ? "aspect-16/10 lg:aspect-auto lg:w-1/2" : "aspect-16/10"
        )}
      >
        {post.featuredImage ? (
          <Image
            src={post.featuredImage}
            alt={post.featuredImageAlt || ""}
            fill
            priority={priority}
            sizes={
              featured
                ? "(max-width: 1024px) 100vw, 50vw"
                : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            }
            unoptimized={post.featuredImage.endsWith(".svg")}
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-105"
          />
        ) : (
          <div aria-hidden className="absolute inset-0 bg-linear-to-br from-abyss to-ink" />
        )}

        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-ink/90 via-ink/20 to-transparent"
        />

        {post.category ? (
          <span className="absolute top-4 left-4 z-10 rounded-full bg-gold/90 px-3 py-1 font-mono text-[.6rem] font-bold tracking-[.16em] text-ink uppercase backdrop-blur-md">
            {post.category.name}
          </span>
        ) : null}
      </div>

      {/* Body */}
      <div
        className={cn(
          "relative z-10 flex flex-1 flex-col p-5 sm:p-6",
          featured && "lg:justify-center lg:p-8"
        )}
      >
        <h3
          className={cn(
            "font-bold text-foam transition-colors duration-300 group-hover:text-gold",
            featured ? "text-xl sm:text-2xl lg:text-3xl" : "text-lg sm:text-xl"
          )}
        >
          {post.title}
        </h3>

        {post.excerpt ? (
          <p
            className={cn(
              "mt-2.5 text-sm text-mist",
              featured ? "line-clamp-3 sm:text-base" : "line-clamp-2"
            )}
          >
            {post.excerpt}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-5">
          <span className="font-mono text-[.65rem] tracking-wide text-fog uppercase">
            {post.publishedAt ? dateFormat.format(post.publishedAt) : ""}
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[.65rem] tracking-wide text-fog uppercase">
            <Clock3 className="size-3" aria-hidden />
            {post.readingMinutes} menit
          </span>

          <span className="ml-auto grid size-9 shrink-0 place-items-center rounded-full border border-white/12 text-mist transition-all duration-400 group-hover:border-gold/60 group-hover:bg-gold/12 group-hover:text-gold">
            <ArrowUpRight className="size-4" aria-hidden />
          </span>
        </div>

        {post.author ? (
          <p className="mt-3 flex items-center gap-2 border-t border-white/8 pt-3 text-xs text-mist">
            {post.author.avatarUrl ? (
              <Image
                src={post.author.avatarUrl}
                alt=""
                aria-hidden
                width={20}
                height={20}
                unoptimized={post.author.avatarUrl.endsWith(".svg")}
                className="size-5 rounded-full"
              />
            ) : null}
            {post.author.name}
          </p>
        ) : null}
      </div>
    </article>
  );
}
