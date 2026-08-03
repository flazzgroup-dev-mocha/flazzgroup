import type { FieldErrors } from "@/lib/validators";
import type { MediaFolder, UploadedImage } from "@/lib/media/folders";

export class ApiError extends Error {
  readonly status: number;
  readonly fields: FieldErrors;

  constructor(message: string, status: number, fields: FieldErrors = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

type Json = Record<string, unknown> | unknown[];

/**
 * Thin fetch wrapper for the admin panel: always JSON, always throws an
 * ApiError carrying per-field messages the forms can display inline.
 */
export async function apiRequest<T>(
  url: string,
  options: { method?: string; body?: Json; signal?: AbortSignal } = {}
): Promise<T> {
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
    credentials: "same-origin",
  });

  let payload: { data?: T; error?: string; fields?: FieldErrors } = {};

  try {
    payload = await response.json();
  } catch {
    // Empty or non-JSON body — fall through to the status-based message.
  }

  if (!response.ok) {
    throw new ApiError(
      payload.error ?? `Request failed (${response.status}).`,
      response.status,
      payload.fields ?? {}
    );
  }

  return payload.data as T;
}

/** Multipart upload — separate because it must not set a JSON content type. */
export async function uploadFile(file: File, folder: MediaFolder) {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: form,
    credentials: "same-origin",
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      payload.error ?? "Upload failed.",
      response.status,
      payload.fields ?? {}
    );
  }

  return payload.data as UploadedImage;
}
