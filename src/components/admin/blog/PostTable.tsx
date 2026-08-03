"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarClock, ExternalLink, Inbox, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ApiError, apiRequest } from "@/lib/client-api";
import type { PostStatus } from "@/generated/prisma/enums";
import { Badge, Card } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableWrapper,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Thumb } from "@/components/admin/cells";
import { SITE_TIME_ZONE } from "@/lib/utils";

export type AdminPost = {
  id: string;
  title: string;
  slug: string;
  status: PostStatus;
  publishedAt: Date | null;
  updatedAt: Date;
  readingMinutes: number;
  featuredImage: string;
  category: { name: string } | null;
  author: { name: string } | null;
};

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  timeZone: SITE_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * A published post dated in the future is scheduled, not live. The state is
 * derived rather than stored so it can never disagree with the date.
 */
function statusOf(post: AdminPost) {
  if (post.status === "DRAFT") return "draft" as const;
  if (post.publishedAt && post.publishedAt.getTime() > Date.now()) {
    return "scheduled" as const;
  }
  return "published" as const;
}

export function PostTable({
  posts,
  page,
  pageCount,
  total,
}: {
  posts: AdminPost[];
  page: number;
  pageCount: number;
  total: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pendingDelete, setPendingDelete] = useState<AdminPost | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!pendingDelete) return;

    setDeleting(true);
    try {
      await apiRequest(`/api/blog/posts/${pendingDelete.id}`, { method: "DELETE" });
      toast.success("Article deleted");
      setPendingDelete(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not delete.");
    } finally {
      setDeleting(false);
    }
  }

  function pageHref(next: number) {
    const search = new URLSearchParams(params.toString());
    search.set("page", String(next));
    return `/admin/blog?${search.toString()}`;
  }

  if (posts.length === 0) {
    return (
      <Card>
        <div className="grid place-items-center gap-3 px-6 py-16 text-center">
          <span className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/[.03] text-fog">
            <Inbox className="size-5" aria-hidden />
          </span>
          <p className="text-sm font-semibold text-foam">No articles found</p>
          <p className="max-w-sm text-sm text-mist">
            {total === 0
              ? "Write the first one — it will appear on /blog as soon as you publish."
              : "No article matches these filters. Try clearing them."}
          </p>
          <Button variant="gold" size="sm" asChild className="mt-1">
            <Link href="/admin/blog/new">New article</Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <TableWrapper>
          <Table>
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableHeaderCell>Article</TableHeaderCell>
                <TableHeaderCell>Category</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell className="w-28 text-right">Actions</TableHeaderCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {posts.map((post) => {
                const state = statusOf(post);

                return (
                  <TableRow key={post.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Thumb src={post.featuredImage} alt="" rounded="rounded-lg" />
                        <span className="block min-w-0">
                          <span className="block max-w-sm truncate font-semibold text-foam">
                            {post.title}
                          </span>
                          <span className="block max-w-sm truncate font-mono text-[.66rem] text-fog">
                            /blog/{post.slug} · {post.readingMinutes} min
                            {post.author ? ` · ${post.author.name}` : ""}
                          </span>
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs text-mist">
                        {post.category?.name ?? "—"}
                      </span>
                    </TableCell>

                    <TableCell>
                      {state === "published" ? (
                        <Badge tone="online">Published</Badge>
                      ) : state === "scheduled" ? (
                        <Badge tone="gold">
                          <CalendarClock className="size-3" aria-hidden />
                          Scheduled
                        </Badge>
                      ) : (
                        <Badge tone="muted">Draft</Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <span className="font-mono text-[.68rem] text-fog">
                        {post.publishedAt
                          ? dateFormat.format(post.publishedAt)
                          : `edited ${dateFormat.format(post.updatedAt)}`}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {state === "published" ? (
                          <Link
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`View ${post.title} on the site`}
                            className="grid size-8 place-items-center rounded-lg border border-white/10 text-mist transition-colors hover:border-volt/50 hover:text-foam"
                          >
                            <ExternalLink className="size-3.5" aria-hidden />
                          </Link>
                        ) : null}
                        <Link
                          href={`/admin/blog/${post.id}`}
                          aria-label={`Edit ${post.title}`}
                          className="grid size-8 place-items-center rounded-lg border border-white/10 text-mist transition-colors hover:border-gold/45 hover:text-gold"
                        >
                          <Pencil className="size-3.5" aria-hidden />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(post)}
                          aria-label={`Delete ${post.title}`}
                          className="grid size-8 place-items-center rounded-lg border border-white/10 text-mist transition-colors hover:border-red-500/50 hover:text-red-300"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableWrapper>
      </Card>

      {pageCount > 1 ? (
        <nav
          aria-label="Pagination"
          className="mt-4 flex items-center justify-between gap-3"
        >
          <Button variant="glass" size="sm" asChild disabled={page <= 1}>
            {page <= 1 ? <span>Previous</span> : <Link href={pageHref(page - 1)}>Previous</Link>}
          </Button>

          <span className="font-mono text-[.68rem] tracking-wide text-fog">
            Page {page} of {pageCount}
          </span>

          <Button variant="glass" size="sm" asChild disabled={page >= pageCount}>
            {page >= pageCount ? <span>Next</span> : <Link href={pageHref(page + 1)}>Next</Link>}
          </Button>
        </nav>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this article?"
        description={
          pendingDelete
            ? `"${pendingDelete.title}" will be removed from the site and from search results. This cannot be undone.`
            : ""
        }
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}
