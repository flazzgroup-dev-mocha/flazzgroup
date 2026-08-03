"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Inbox,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { ApiError, apiRequest } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import type { FieldErrors } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/surface";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export type Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
};

/** Below this many rows a search box is more clutter than help. */
const SEARCH_THRESHOLD = 8;

/**
 * Rows carry the version stamp the server checks writes against. Optional
 * because BlogTag has no `updatedAt` column and therefore nothing to version.
 */
type Row = { id: string; updatedAt?: string | Date };

type Props<T extends Row, D> = {
  /** REST base, e.g. "/api/brands". */
  endpoint: string;
  items: T[];
  columns: Column<T>[];
  /** Builds form state from a row, or from null when adding. */
  toDraft: (row: T | null) => D;
  /** Renders the form body. Errors are keyed by field name. */
  renderForm: (
    draft: D,
    patch: (values: Partial<D>) => void,
    errors: FieldErrors
  ) => ReactNode;
  itemLabel: (row: T) => string;
  singular: string;
  addLabel?: string;
  emptyTitle?: string;
  emptyHint?: string;
  sortable?: boolean;
  dialogSize?: "sm" | "md" | "lg";
};

export function ResourceScreen<T extends Row, D extends object>({
  endpoint,
  items,
  columns,
  toDraft,
  renderForm,
  itemLabel,
  singular,
  addLabel,
  emptyTitle,
  emptyHint,
  sortable = true,
  dialogSize = "md",
}: Props<T, D>) {
  const router = useRouter();

  const [rows, setRows] = useState(items);
  const [editing, setEditing] = useState<T | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<D | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<T | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [query, setQuery] = useState("");
  const searchId = useId();

  // Match against whatever the row's label exposes, which is the column an
  // operator actually recognises the row by.
  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => itemLabel(row).toLowerCase().includes(needle));
  }, [rows, query, itemLabel]);

  // Reordering a filtered subset would write a misleading order.
  const canReorder = sortable && query.trim().length === 0;

  // Server data wins whenever the route re-renders after a refresh.
  useEffect(() => setRows(items), [items]);

  const patch = useCallback(
    (values: Partial<D>) => setDraft((current) => ({ ...(current as D), ...values })),
    []
  );

  function openCreate() {
    setEditing(null);
    setDraft(toDraft(null));
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(row: T) {
    setEditing(row);
    setDraft(toDraft(row));
    setErrors({});
    setDialogOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft || saving) return;

    setSaving(true);
    setErrors({});

    try {
      await apiRequest(editing ? `${endpoint}/${editing.id}` : endpoint, {
        method: editing ? "PUT" : "POST",
        /**
         * The row's `updatedAt` rides along on every edit.
         *
         * Taken from `editing` rather than from the draft so no per-resource
         * Draft type has to carry it. The server rejects the write if the row
         * has moved since this dialog opened, which is what stops one tab
         * silently overwriting another — and, where the form holds an image,
         * what stops it restoring a reference to a file the other save has
         * already deleted from Cloudinary.
         */
        body: editing
          ? { ...(draft as Record<string, unknown>), updatedAt: editing.updatedAt }
          : (draft as Record<string, unknown>),
      });

      toast.success(editing ? `${singular} updated` : `${singular} created`);
      setDialogOpen(false);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fields);
        toast.error(error.message);

        // Someone else got there first. The dialog stays open so nothing typed
        // is lost, and the list behind it refreshes to the current truth.
        if (error.status === 409) router.refresh();
      } else {
        toast.error("Could not save. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;

    setDeleting(true);
    try {
      await apiRequest(`${endpoint}/${pendingDelete.id}`, { method: "DELETE" });
      toast.success(`${singular} deleted`);
      setPendingDelete(null);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not delete."
      );
    } finally {
      setDeleting(false);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = rows.findIndex((row) => row.id === active.id);
    const to = rows.findIndex((row) => row.id === over.id);
    if (from < 0 || to < 0) return;

    const previous = rows;
    const next = arrayMove(rows, from, to);
    setRows(next); // optimistic

    try {
      await apiRequest(`${endpoint}/reorder`, {
        method: "POST",
        body: { ids: next.map((row) => row.id) },
      });
      toast.success("Order saved");
      router.refresh();
    } catch (error) {
      setRows(previous); // roll back
      toast.error(
        error instanceof ApiError ? error.message : "Could not save the new order."
      );
      // A 409 means a row in this list no longer exists; only a refetch fixes it.
      if (error instanceof ApiError && error.status === 409) router.refresh();
    }
  }

  const body = (
    <TableBody>
      {visibleRows.map((row) => (
        <SortableRow
          key={row.id}
          id={row.id}
          sortable={canReorder}
          columns={columns}
          row={row}
          onEdit={() => openEdit(row)}
          onDelete={() => setPendingDelete(row)}
          label={itemLabel(row)}
        />
      ))}
    </TableBody>
  );

  /**
   * The table itself, with no drag machinery around it.
   *
   * `SortableContext` may stay inside `<table>` because it renders no DOM at
   * all — it is a plain context provider. `DndContext` may not, which is what
   * `table` below is separated out for.
   */
  const table = (
    <TableWrapper>
      <Table>
        <TableHead>
          <TableRow className="hover:bg-transparent">
            {canReorder ? (
              <TableHeaderCell className="w-10">
                <span className="sr-only">Reorder</span>
              </TableHeaderCell>
            ) : null}
            {columns.map((column) => (
              <TableHeaderCell key={column.header} className={column.className}>
                {column.header}
              </TableHeaderCell>
            ))}
            <TableHeaderCell className="w-24 text-right">Actions</TableHeaderCell>
          </TableRow>
        </TableHead>

        {canReorder ? (
          <SortableContext
            items={rows.map((row) => row.id)}
            strategy={verticalListSortingStrategy}
          >
            {body}
          </SortableContext>
        ) : (
          body
        )}
      </Table>
    </TableWrapper>
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* Search appears once the list is long enough to need it. Filtering
            is client-side because every list here is small and already loaded;
            add a server query only if a table ever outgrows one page. */}
        {rows.length > SEARCH_THRESHOLD ? (
          <div className="relative w-full sm:max-w-xs">
            <label htmlFor={searchId} className="sr-only">
              Search {singular.toLowerCase()}
            </label>
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-fog"
            />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${singular.toLowerCase()}…`}
              className="h-9 w-full rounded-full border border-white/10 bg-ink-800/60 pr-3 pl-10 text-sm text-foam placeholder:text-fog focus:border-volt/60 focus:outline-none"
            />
          </div>
        ) : (
          <span />
        )}

        <Button variant="gold" size="sm" onClick={openCreate}>
          <Plus aria-hidden />
          {addLabel ?? `Add ${singular.toLowerCase()}`}
        </Button>
      </div>

      <Card>
        {rows.length === 0 ? (
          <div className="grid place-items-center gap-3 px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/[.03] text-fog">
              <Inbox className="size-5" aria-hidden />
            </span>
            <p className="text-sm font-semibold text-foam">
              {emptyTitle ?? `No ${singular.toLowerCase()} yet`}
            </p>
            <p className="max-w-sm text-sm text-mist">
              {emptyHint ?? "Add the first one — it appears on the homepage straight away."}
            </p>
            <Button variant="glass" size="sm" onClick={openCreate} className="mt-1">
              <Plus aria-hidden />
              {addLabel ?? `Add ${singular.toLowerCase()}`}
            </Button>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="grid place-items-center gap-3 px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/[.03] text-fog">
              <Inbox className="size-5" aria-hidden />
            </span>
            <p className="text-sm font-semibold text-foam">No matches</p>
            <p className="max-w-sm text-sm text-mist">
              Nothing here matches “{query}”.
            </p>
            <Button
              variant="glass"
              size="sm"
              onClick={() => setQuery("")}
              className="mt-1"
            >
              Clear search
            </Button>
          </div>
        ) : canReorder ? (
          /**
           * DndContext wraps the table, never sits inside it.
           *
           * It renders its screen-reader announcements — a `display:none`
           * instructions node and an `aria-live` region — as two <div>s that
           * are siblings of its children. Inside <table> those are illegal
           * content: the HTML parser foster-parents them out of the table
           * before React ever hydrates, so the DOM the browser built no
           * longer matches the tree React rendered, and hydration fails.
           *
           * Out here the announcements are ordinary children of the Card, the
           * markup validates, and every drag behaviour is unchanged —
           * `restrictToParentElement` measures the dragged row's own parent
           * (<tbody>), not wherever DndContext happens to live.
           */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={onDragEnd}
          >
            {table}
          </DndContext>
        ) : (
          table
        )}
      </Card>

      {/* Create / edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size={dialogSize}>
          <form onSubmit={submit} noValidate className="contents">
            <DialogHeader>
              <DialogTitle>
                {editing ? `Edit ${singular.toLowerCase()}` : `New ${singular.toLowerCase()}`}
              </DialogTitle>
              <DialogDescription>
                Changes go live on the homepage as soon as you save.
              </DialogDescription>
            </DialogHeader>

            <DialogBody>
              {draft ? (
                <div className="grid gap-4">
                  {errors.form ? (
                    <p
                      role="alert"
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300"
                    >
                      {errors.form}
                    </p>
                  ) : null}
                  {renderForm(draft, patch, errors)}
                </div>
              ) : null}
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="glass"
                size="sm"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" variant="gold" size="sm" disabled={saving}>
                {saving ? (
                  <LoaderCircle className="animate-spin" aria-hidden />
                ) : null}
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Delete this ${singular.toLowerCase()}?`}
        description={
          pendingDelete
            ? `"${itemLabel(pendingDelete)}" will be removed from the homepage immediately. This cannot be undone.`
            : ""
        }
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}

function SortableRow<T extends Row>({
  id,
  row,
  columns,
  sortable,
  onEdit,
  onDelete,
  label,
}: {
  id: string;
  row: T;
  columns: Column<T>[];
  sortable: boolean;
  onEdit: () => void;
  onDelete: () => void;
  label: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled: !sortable });

  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "relative z-10 bg-white/[.06]")}
    >
      {sortable ? (
        <TableCell className="w-10">
          <button
            type="button"
            aria-label={`Reorder ${label}`}
            className="grid size-8 cursor-grab place-items-center rounded-lg text-fog transition-colors hover:bg-white/[.06] hover:text-foam active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" aria-hidden />
          </button>
        </TableCell>
      ) : null}

      {columns.map((column) => (
        <TableCell key={column.header} className={column.className}>
          {column.cell(row)}
        </TableCell>
      ))}

      <TableCell className="w-24">
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${label}`}
            className="grid size-8 place-items-center rounded-lg border border-white/10 text-mist transition-colors hover:border-gold/45 hover:text-gold"
          >
            <Pencil className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${label}`}
            className="grid size-8 place-items-center rounded-lg border border-white/10 text-mist transition-colors hover:border-red-500/50 hover:text-red-300"
          >
            <Trash2 className="size-3.5" aria-hidden />
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
}
