"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import type { TocEntry } from "@/lib/blog/content";

/**
 * Sticky table of contents that highlights the section being read.
 *
 * Uses IntersectionObserver with a top-weighted root margin so a heading
 * becomes "current" as it reaches the top of the viewport, not when it first
 * peeks in from the bottom.
 */
export function TableOfContents({ entries }: { entries: TocEntry[] }) {
  const [activeId, setActiveId] = useState<string>(entries[0]?.id ?? "");

  useEffect(() => {
    if (entries.length === 0) return;

    const observer = new IntersectionObserver(
      (records) => {
        const visible = records
          .filter((record) => record.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]?.target.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -65% 0px", threshold: 0 }
    );

    for (const entry of entries) {
      const element = document.getElementById(entry.id);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [entries]);

  if (entries.length < 2) return null;

  return (
    <nav aria-labelledby="toc-heading" className="glass rounded-2xl p-5">
      <h2
        id="toc-heading"
        className="font-mono text-[.62rem] font-bold tracking-[.2em] text-gold uppercase"
      >
        Daftar isi
      </h2>

      <ul className="mt-4 grid gap-1">
        {entries.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              aria-current={activeId === entry.id ? "location" : undefined}
              className={cn(
                "block rounded-lg py-1.5 pr-2 text-sm transition-colors duration-200",
                entry.level === 3 ? "pl-5" : "pl-3",
                activeId === entry.id
                  ? "border-l-2 border-gold bg-gold/8 font-medium text-gold"
                  : "border-l-2 border-transparent text-mist hover:text-foam"
              )}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
