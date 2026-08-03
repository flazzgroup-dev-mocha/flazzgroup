"use client";

import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { toast } from "sonner";

import { TelegramIcon, WhatsappIcon } from "@/components/common/Icons";
import { track } from "@/lib/analytics/track";

/** Share targets that matter for this audience, plus copy-link. */
export function ShareBar({
  url,
  title,
  postId,
}: {
  url: string;
  title: string;
  postId: string;
}) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      track("blog_share", { item_id: postId, item_name: title, method: "copy_link" });
      setCopied(true);
      toast.success("Tautan disalin");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin tautan");
    }
  }

  async function nativeShare() {
    if (!navigator.share) return copy();
    try {
      await navigator.share({ title, url });
      track("blog_share", { item_id: postId, item_name: title, method: "native" });
    } catch {
      // The visitor dismissed the sheet — nothing to report.
    }
  }

  const targets = [
    {
      method: "whatsapp" as const,
      label: "Bagikan ke WhatsApp",
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      Icon: WhatsappIcon,
    },
    {
      method: "telegram" as const,
      label: "Bagikan ke Telegram",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      Icon: TelegramIcon,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[.62rem] tracking-[.18em] text-fog uppercase">
        Bagikan
      </span>

      {targets.map(({ label, href, Icon, method }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          onClick={() =>
            track("blog_share", { item_id: postId, item_name: title, method })
          }
          className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/[.03] text-mist transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/45 hover:text-gold"
        >
          <Icon className="size-4" />
        </a>
      ))}

      <button
        type="button"
        onClick={copy}
        aria-label="Salin tautan artikel"
        className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/[.03] text-mist transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/45 hover:text-gold"
      >
        {copied ? <Check className="size-4 text-online" /> : <Link2 className="size-4" />}
      </button>

      <button
        type="button"
        onClick={nativeShare}
        aria-label="Bagikan artikel"
        className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/[.03] text-mist transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/45 hover:text-gold sm:hidden"
      >
        <Share2 className="size-4" />
      </button>
    </div>
  );
}
