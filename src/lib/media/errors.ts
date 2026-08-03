/**
 * Reading a Cloudinary rejection.
 *
 * Kept free of `server-only` and of the SDK itself so the upload service and
 * the smoke test share one implementation — this is precisely the logic that
 * was wrong in two places at once, and duplicating it is how that happened.
 *
 * The SDK is not consistent about where the status lives. In
 * `lib/api_client/execute_request.js` the Admin API rejects with the whole
 * response body:
 *
 *   { request_options, query_params, error: { message, http_code } }
 *
 * while its network-error and unexpected-status paths reject with the inner
 * object, putting `http_code` at the top level. Checking only one shape is how
 * an ordinary "this filename is free" 404 turns into an unhandled failure.
 */

type CloudinaryRejection = {
  http_code?: unknown;
  message?: unknown;
  error?: { http_code?: unknown; message?: unknown } | null;
};

export function cloudinaryHttpCode(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;

  const shape = error as CloudinaryRejection;
  const code = shape.http_code ?? shape.error?.http_code;

  return typeof code === "number" ? code : null;
}

export function cloudinaryMessage(error: unknown): string {
  if (typeof error !== "object" || error === null) return String(error);

  const shape = error as CloudinaryRejection;
  const message = shape.error?.message ?? shape.message;

  if (typeof message === "string") return message;
  if (message instanceof Error) return message.message;

  return JSON.stringify(message ?? error);
}

/**
 * A missing resource is an answer, not a failure.
 *
 * When a public id does not exist the name is available, which is the expected
 * result for every first upload of a file. Everything else — 401, 403, 429,
 * 5xx — is a real problem and must not be folded into this.
 */
export function isCloudinaryNotFound(error: unknown) {
  return cloudinaryHttpCode(error) === 404;
}
