import { fail, ok, withAdmin } from "@/lib/api";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import {
  MAX_UPLOAD_BYTES,
  UploadError,
  isMediaFolder,
  saveUpload,
} from "@/lib/media";

/** Image processing is CPU- and network-bound, so it gets its own budget. */
const LIMIT = 30;
const WINDOW_MS = 5 * 60 * 1000;

/**
 * `POST /api/upload` — multipart form with a `file` field and a `folder` field.
 *
 * The folder decides where the image lands in Cloudinary and is validated
 * against a closed list, so a request cannot write outside the account's
 * `flazzgroup/` tree.
 */
export const POST = withAdmin(async (_session, request: Request) => {
  const limit = rateLimit({
    key: clientKey(request, "upload"),
    limit: LIMIT,
    windowMs: WINDOW_MS,
  });

  if (!limit.ok) {
    return fail("Too many uploads. Wait a moment and try again.", 429);
  }

  // Reject oversized bodies before buffering them into memory.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES * 1.1) {
    return fail(
      `File is too large. Maximum size is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
      413
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  const folder = form.get("folder");

  if (!(file instanceof File)) {
    return fail("No file was sent.", 400);
  }

  if (!isMediaFolder(folder)) {
    return fail("Unknown upload folder.", 400);
  }

  try {
    return ok(await saveUpload(file, folder), 201);
  } catch (error) {
    // UploadError carries its own status: 415 for a file we will not accept,
    // 413 for one too large, 429 when Cloudinary is rate-limiting, 503 for a
    // credentials or plan problem, 502 when Cloudinary itself is failing.
    // Reporting all of those as one status is what made a bad API secret
    // indistinguishable from a bad JPEG.
    if (error instanceof UploadError) {
      return fail(error.message, error.status);
    }
    throw error;
  }
});
