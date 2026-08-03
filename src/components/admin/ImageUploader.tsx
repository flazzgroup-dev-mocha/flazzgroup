"use client";

import { useId, useRef, useState } from "react";
import Image from "next/image";
import { Expand, ImageOff, LoaderCircle, Repeat2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { ApiError, uploadFile } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import {
  ACCEPTED_MIME,
  ACCEPT_ATTRIBUTE,
  MAX_UPLOAD_BYTES,
  type MediaFolder,
  type UploadedImage,
} from "@/lib/media/folders";
import { isVector } from "@/lib/media/url";
import { ImagePreview, formatBytes } from "@/components/admin/ImagePreview";

/**
 * The upload control for every admin form.
 *
 * One component, one endpoint, one storage service — banner, blog, brand,
 * payment, logo and favicon all mount this and differ only by `folder`. The
 * server re-encodes and sanitises, so this handles picking a file, reporting
 * progress, previewing the result and capturing alt text.
 */
export function ImageUploader({
  value,
  onChange,
  folder,
  label = "Image",
  hint,
  error,
  required,
  aspect = "square",
  alt,
  onAltChange,
  altError,
}: {
  value: string;
  onChange: (url: string, meta?: UploadedImage) => void;
  /** Where this image belongs in Cloudinary. */
  folder: MediaFolder;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  aspect?: "square" | "wide";
  /** Supply both to show the alt-text field alongside the picture. */
  alt?: string;
  onAltChange?: (value: string) => void;
  altError?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [meta, setMeta] = useState<UploadedImage | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;

    // Checked again on the server, which is authoritative. Doing it here too
    // means a 6 MB file fails instantly instead of after a full upload.
    if (!(file.type in ACCEPTED_MIME)) {
      toast.error("Only PNG, JPG, WEBP and SVG files are accepted.");
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(
        `That file is ${formatBytes(file.size)}. The maximum is ${
          MAX_UPLOAD_BYTES / 1024 / 1024
        } MB.`
      );
      return;
    }

    setBusy(true);
    try {
      const stored = await uploadFile(file, folder);
      setMeta(stored);
      onChange(stored.url, stored);

      // An image with no description is an accessibility and image-search gap,
      // and the filename is a better first guess than nothing.
      if (onAltChange && !alt) {
        onAltChange(
          stored.originalFilename
            .replace(/\.[a-z0-9]+$/i, "")
            .replace(/[-_]+/g, " ")
            .trim()
        );
      }

      toast.success("Image uploaded");
    } catch (uploadError) {
      toast.error(
        uploadError instanceof ApiError
          ? uploadError.message
          : "Upload failed. Try again."
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function clear() {
    setMeta(null);
    onChange("");
    if (onAltChange) onAltChange("");
  }

  const dimensions = meta?.width ? `${meta.width}×${meta.height}` : null;

  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-semibold tracking-wide text-mist">
        {label}
        {required ? <span className="ml-1 text-gold">*</span> : null}
      </span>

      <div className="flex items-start gap-3">
        {/* Preview — click to enlarge */}
        <button
          type="button"
          onClick={() => value && setPreviewOpen(true)}
          disabled={!value}
          aria-label={value ? `Preview ${label.toLowerCase()}` : undefined}
          className={cn(
            "group relative shrink-0 overflow-hidden rounded-xl border border-white/10 bg-ink-800/60",
            aspect === "square" ? "size-20" : "h-20 w-32",
            value ? "cursor-zoom-in" : "cursor-default"
          )}
        >
          {value ? (
            <>
              <Image
                src={value}
                alt=""
                fill
                sizes="128px"
                className="object-contain p-1.5"
                unoptimized={isVector(value)}
              />
              <span
                aria-hidden
                className="absolute inset-0 grid place-items-center bg-ink/70 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Expand className="size-4 text-foam" />
              </span>
            </>
          ) : (
            <span className="grid h-full place-items-center text-fog">
              <ImageOff className="size-5" aria-hidden />
            </span>
          )}
        </button>

        {/* Drop zone */}
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void handleFile(event.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex min-h-20 flex-1 flex-col justify-center gap-2 rounded-xl border border-dashed px-3 py-2.5 transition-colors",
            dragging ? "border-gold/60 bg-gold/8" : "border-white/12 bg-white/[.02]"
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor={inputId}
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/12 bg-white/[.04] px-3.5 py-1.5 text-xs font-semibold text-foam transition-colors hover:border-gold/45 hover:text-gold",
                busy && "pointer-events-none opacity-60"
              )}
            >
              {busy ? (
                <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
              ) : value ? (
                <Repeat2 className="size-3.5" aria-hidden />
              ) : (
                <Upload className="size-3.5" aria-hidden />
              )}
              {busy ? "Uploading…" : value ? "Replace" : "Choose file"}
            </label>

            {value ? (
              <button
                type="button"
                onClick={clear}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-mist transition-colors hover:border-red-500/50 hover:text-red-300"
              >
                <Trash2 className="size-3.5" aria-hidden />
                Remove
              </button>
            ) : null}
          </div>

          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            className="sr-only"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />

          {/* Deliberately type="text": this field also accepts root-relative
              paths such as /logo.svg, which type="url" would reject and
              silently block the whole form from submitting. The value is
              validated server-side by the image schema. */}
          <input
            type="text"
            inputMode="url"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="…or paste an image URL"
            aria-label={`${label} URL`}
            className="w-full rounded-lg border border-white/8 bg-ink-800/60 px-2.5 py-1.5 font-mono text-[.7rem] text-mist placeholder:text-fog focus:border-volt/60 focus:outline-none"
          />

          {meta ? (
            <p className="truncate font-mono text-[.65rem] text-fog">
              {meta.originalFilename}
              {dimensions ? ` · ${dimensions}` : ""} · {formatBytes(meta.bytes)}
            </p>
          ) : null}
        </div>
      </div>

      {/* Alt text lives with the picture it describes, not three fields away. */}
      {onAltChange ? (
        <div className="mt-1 grid gap-1">
          <input
            type="text"
            value={alt ?? ""}
            onChange={(event) => onAltChange(event.target.value)}
            placeholder="Describe the image — used by screen readers and image search"
            aria-label={`${label} alt text`}
            aria-invalid={Boolean(altError)}
            className="w-full rounded-lg border border-white/8 bg-ink-800/60 px-2.5 py-1.5 text-xs text-foam placeholder:text-fog focus:border-volt/60 focus:outline-none"
          />
          {altError ? (
            <p role="alert" className="text-xs font-medium text-red-400">
              {altError}
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-xs font-medium text-red-400">
          {error}
        </p>
      ) : (
        <p className="text-xs text-fog">
          {hint ?? `PNG, JPG, WEBP or SVG — up to ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`}
        </p>
      )}

      <ImagePreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        src={value}
        alt={alt}
        caption={meta?.originalFilename}
      />
    </div>
  );
}
