"use client";

import Image from "next/image";

import { isVector } from "@/lib/media/url";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Bytes as something an operator reads at a glance. */
export function formatBytes(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Large preview of a stored image.
 *
 * Shared by the uploader and the banner table so "what does this actually look
 * like" is answered the same way everywhere.
 */
export function ImagePreview({
  open,
  onOpenChange,
  src,
  alt,
  caption,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  alt?: string;
  caption?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Image preview</DialogTitle>
          {caption ? <DialogDescription>{caption}</DialogDescription> : null}
        </DialogHeader>

        <DialogBody>
          {src ? (
            <div className="relative grid min-h-64 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-ink-800/60 p-3">
              {/* Intrinsic sizing: banner artwork is wide, a logo is square, and
                  the preview should not pretend otherwise. */}
              <Image
                src={src}
                alt={alt || ""}
                width={1600}
                height={900}
                unoptimized={isVector(src)}
                sizes="(max-width: 768px) 92vw, 720px"
                className="h-auto max-h-[65vh] w-auto max-w-full object-contain"
              />
            </div>
          ) : null}

          {alt ? (
            <p className="mt-3 text-xs text-mist">
              <span className="font-semibold text-fog">Alt text: </span>
              {alt}
            </p>
          ) : (
            <p className="mt-3 text-xs text-amber-300/90">
              No alt text — screen readers and image search cannot describe this
              image.
            </p>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
