"use client";

import { TriangleAlert } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/** Destructive confirmation. Nothing is deleted without passing through here. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <span className="mb-4 grid size-11 place-items-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-300">
          <TriangleAlert className="size-5" aria-hidden />
        </span>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="glass" size="sm" disabled={busy}>
              Cancel
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              size="sm"
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                onConfirm();
              }}
              // Overrides the variant's gradient, which would otherwise paint
              // over a plain background-color utility.
              className="bg-[linear-gradient(100deg,#F87171,#EF4444_55%,#B91C1C)] text-white shadow-[0_10px_30px_-10px_rgba(239,68,68,.8)] hover:brightness-110"
            >
              {busy ? "Deleting…" : confirmLabel}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
