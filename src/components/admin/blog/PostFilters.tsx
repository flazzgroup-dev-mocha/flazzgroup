"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, Search } from "lucide-react";

import { NativeSelect } from "@/components/ui/field";

/**
 * Search, status, category and sort — all held in the URL.
 *
 * Keeping state in the query string means a filtered view is shareable, works
 * with the back button, and survives a refresh, which none of it would if the
 * filters lived in component state.
 */
export function PostFilters({
  categories,
  total,
}: {
  categories: { id: string; name: string }[];
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [query, setQuery] = useState(params.get("q") ?? "");

  function apply(next: Record<string, string>) {
    const search = new URLSearchParams(params.toString());

    for (const [key, value] of Object.entries(next)) {
      if (value) search.set(key, value);
      else search.delete(key);
    }
    // Any filter change invalidates the current page number.
    search.delete("page");

    startTransition(() => router.replace(`${pathname}?${search.toString()}`));
  }

  // Debounce typing so each keystroke does not become a database query.
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (query === current) return;

    const timer = setTimeout(() => apply({ q: query }), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="glass mb-4 flex flex-wrap items-center gap-3 rounded-2xl p-3">
      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <label htmlFor="post-search" className="sr-only">
          Search articles
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-fog"
        />
        <input
          id="post-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title, slug or excerpt…"
          className="h-10 w-full rounded-xl border border-white/10 bg-ink-800/60 pr-3 pl-10 text-sm text-foam placeholder:text-fog focus:border-volt/60 focus:outline-none"
        />
      </div>

      <div className="grid gap-1">
        <label htmlFor="filter-status" className="sr-only">
          Filter by status
        </label>
        <NativeSelect
          id="filter-status"
          value={params.get("status") ?? ""}
          onChange={(event) => apply({ status: event.target.value })}
          className="h-10 py-0"
        >
          <option value="">All statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
        </NativeSelect>
      </div>

      <div className="grid gap-1">
        <label htmlFor="filter-category" className="sr-only">
          Filter by category
        </label>
        <NativeSelect
          id="filter-category"
          value={params.get("category") ?? ""}
          onChange={(event) => apply({ category: event.target.value })}
          className="h-10 py-0"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="grid gap-1">
        <label htmlFor="filter-sort" className="sr-only">
          Sort
        </label>
        <NativeSelect
          id="filter-sort"
          value={params.get("sort") ?? "newest"}
          onChange={(event) => apply({ sort: event.target.value })}
          className="h-10 py-0"
        >
          <option value="newest">Recently edited</option>
          <option value="oldest">Least recently edited</option>
          <option value="published">Publish date</option>
          <option value="title">Title A–Z</option>
        </NativeSelect>
      </div>

      <span className="ml-auto inline-flex items-center gap-2 font-mono text-[.68rem] tracking-wide text-fog">
        {pending ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : null}
        {total} article{total === 1 ? "" : "s"}
      </span>
    </div>
  );
}
