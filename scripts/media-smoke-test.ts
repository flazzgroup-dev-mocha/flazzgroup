import "dotenv/config";
import sharp from "sharp";
import { v2 as cloudinary } from "cloudinary";

import { MEDIA_FOLDERS } from "../src/lib/media/folders";
import { cloudinaryUrl } from "../src/lib/media/url";
import {
  cloudinaryHttpCode,
  cloudinaryMessage,
  isCloudinaryNotFound,
} from "../src/lib/media/errors";
import { sanitizeSvg } from "../src/lib/media/svg";

/**
 * End-to-end check of the Cloudinary integration.
 *
 *   npm run media:check
 *
 * Reproduces exactly what the upload service does — claim a name by listing the
 * prefix, upload, deliver through a transformation, destroy — and asserts on
 * the error shapes that a 404 and a 401 actually produce, since misreading
 * those is what made a first upload fail with a 500.
 *
 * Everything it creates is deleted again. Nothing else in the account is
 * touched: all public ids are prefixed with `smoke-test-<timestamp>`.
 */

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME;
const KEY = process.env.CLOUDINARY_API_KEY;
const SECRET = process.env.CLOUDINARY_API_SECRET;

let failures = 0;

function check(label: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}`);
  if (!ok) {
    failures += 1;
    if (detail) console.log(`        ${detail}`);
  }
}

/** Mirrors the service: list a prefix, then pick the first free suffix. */
async function claim(base: string, folder: string) {
  const prefix = `${folder}/${base}`;
  const listed = await cloudinary.api.resources({
    type: "upload",
    prefix,
    max_results: 500,
  });

  const taken = new Set<string>(
    (listed.resources ?? []).map((r: { public_id: string }) => r.public_id)
  );

  if (!taken.has(prefix)) return prefix;

  for (let suffix = 2; suffix <= 500; suffix += 1) {
    const candidate = `${prefix}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }

  return `${prefix}-${Date.now()}`;
}

function upload(data: Buffer, publicId: string) {
  return new Promise<{
    public_id: string;
    secure_url: string;
    width: number;
    bytes: number;
  }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: "image",
        overwrite: false,
        unique_filename: false,
        use_filename: false,
      },
      (error, result) =>
        error || !result ? reject(error) : resolve(result as never)
    );
    stream.end(data);
  });
}

/**
 * The SVG sanitiser, checked against the payloads it exists to stop.
 *
 * Runs before the credential gate on purpose: it is pure string work with no
 * network and no account, so there is no reason for it to be skipped on a
 * machine that has not been given Cloudinary keys. It is also the one part of
 * the media pipeline whose failure is silent — a vector that keeps its script
 * uploads, stores and serves exactly like one that does not.
 *
 * Every entry below leaked through the previous sanitiser. `f` is a fragment
 * that must not survive; the second list is the mirror image, constructs that
 * are ordinary in real artwork and must not be destroyed.
 */
function checkSvgSanitiser() {
  console.log("— svg sanitiser —");

  const open = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">`;
  const close = "</svg>";
  const wrap = (body: string) => `${open}${body}${close}`;

  const hostile: [string, string, string][] = [
    ["paired <script>", wrap("<script>alert(1)</script>"), "alert(1)"],
    ["self-closing <script href>", wrap('<script href="data:text/javascript,alert(1)"/>'), "data:text/javascript"],
    ["unterminated <script>", `${open}<script>alert(1)`, "<script"],
    ["<script xlink:href>", wrap('<script xlink:href="data:text/javascript,alert(1)"/>'), "data:text/javascript"],
    ["onload attribute", wrap('<rect onload="alert(1)" width="1" height="1"/>'), "onload"],
    ["unquoted onmouseover", wrap("<rect onmouseover=alert(1) width='1'/>"), "onmouseover"],
    ["href=javascript:", wrap('<a href="javascript:alert(1)"><rect width="1"/></a>'), "javascript:"],
    ["named entity in scheme", wrap('<a href="java&#115;cript:alert(1)"><rect width="1"/></a>'), "cript:alert"],
    ["hex entity in scheme", wrap('<a href="&#x6a;avascript:alert(1)"><rect width="1"/></a>'), "avascript:alert"],
    ["newline inside scheme", wrap('<a href="java\nscript:alert(1)"><rect width="1"/></a>'), "script:alert"],
    ["SMIL animate of href", wrap('<a><animate attributeName="href" to="javascript:alert(1)"/></a>'), "<animate"],
    ["SMIL set of onload", wrap('<set attributeName="onload" to="alert(1)"/>'), "<set"],
    ["<foreignObject> html", wrap('<foreignObject><body onload="alert(1)"/></foreignObject>'), "foreignobject"],
    ["<iframe>", wrap('<iframe src="https://example.invalid"/>'), "<iframe"],
    ["<use> of a data: svg", wrap('<use href="data:image/svg+xml;base64,PHN2Zz4="/>'), "data:image/svg"],
    ["DOCTYPE external entity", `<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>${wrap("<text>&xxe;</text>")}`, "entity"],
    ["nested entity expansion", `<!DOCTYPE svg [<!ENTITY a "aa"><!ENTITY b "&a;&a;">]>${wrap("")}`, "<!doctype"],
  ];

  for (const [label, source, forbidden] of hostile) {
    const out = sanitizeSvg(source).toString("utf8").toLowerCase();
    check(`strips ${label}`, !out.includes(forbidden.toLowerCase()), out.slice(0, 160));
  }

  const benign: [string, string, string][] = [
    ["icon sprite fragment", wrap('<use href="#icon"/>'), 'href="#icon"'],
    ["outbound https link", wrap('<a href="https://example.com"><rect width="1"/></a>'), "https://example.com"],
    ["embedded raster", wrap('<image href="data:image/png;base64,iVBORw0KGgo="/>'), "data:image/png"],
    ["opacity animation", wrap('<rect width="1"><animate attributeName="opacity" to="0"/></rect>'), "<animate"],
  ];

  for (const [label, source, expected] of benign) {
    const out = sanitizeSvg(source).toString("utf8");
    check(`keeps ${label}`, out.includes(expected), out.slice(0, 160));
  }
}

async function main() {
  checkSvgSanitiser();

  if (!CLOUD || !KEY || !SECRET) {
    console.error(
      "\nCloudinary is not configured.\n\n" +
        "Add these to .env, then run this again:\n" +
        "  CLOUDINARY_CLOUD_NAME=\n  CLOUDINARY_API_KEY=\n  CLOUDINARY_API_SECRET=\n\n" +
        "All three are on the Cloudinary dashboard under Settings > API Keys.\n"
    );
    process.exit(1);
  }

  cloudinary.config({
    cloud_name: CLOUD,
    api_key: KEY,
    api_secret: SECRET,
    secure: true,
  });

  console.log(`\nCloudinary account: ${CLOUD}\n`);

  const folder = MEDIA_FOLDERS.banner;
  const base = `smoke-test-${Date.now()}`;
  const created: string[] = [];

  // ------------------------------------------------------------ error shapes
  //
  // The regression that caused HTTP 500 on every first upload: `http_code` is
  // nested under `.error` for Admin API rejections, so a top-level check read
  // it as undefined and treated an ordinary 404 as an unknown failure.

  console.log("— error shapes (the 500 regression) —");
  try {
    await cloudinary.api.resource(`${folder}/${base}-missing`);
    check("a missing public id rejects", false, "it resolved instead");
  } catch (error) {
    check("a missing public id is recognised as 404", isCloudinaryNotFound(error));
    check(
      "http_code is nested, not top level",
      (error as { http_code?: number }).http_code === undefined &&
        cloudinaryHttpCode(error) === 404,
      `top-level=${(error as { http_code?: number }).http_code} resolved=${cloudinaryHttpCode(error)}`
    );
  }

  const realSecret = cloudinary.config().api_secret;
  cloudinary.config({ api_secret: "deliberately-wrong" });
  try {
    await cloudinary.api.resource("anything");
    check("a bad secret rejects", false, "it resolved instead");
  } catch (error) {
    check("a bad secret reads as 401, not 404", cloudinaryHttpCode(error) === 401);
    check("a bad secret is NOT treated as 'name is free'", !isCloudinaryNotFound(error));
    check("its message survives for the log", cloudinaryMessage(error).length > 0);
  }
  cloudinary.config({ api_secret: realSecret });

  // ------------------------------------------------------------- name claim
  console.log("\n— claiming a name (no 404 on the happy path) —");
  const firstId = await claim(base, folder);
  check("a brand new name is claimed as-is", firstId === `${folder}/${base}`, firstId);
  check("listing an unused prefix does not throw", true);

  // ---------------------------------------------------------------- upload
  console.log("\n— upload —");
  const png = await sharp({
    create: {
      width: 1920,
      height: 800,
      channels: 3,
      background: { r: 13, g: 27, b: 61 },
    },
  })
    .png()
    .toBuffer();

  const first = await upload(png, firstId);
  created.push(first.public_id);
  check("lands in flazzgroup/banner/", first.public_id.startsWith(`${folder}/`));
  check("keeps the SEO filename (no UUID)", !/[0-9a-f]{8}-[0-9a-f]{4}-/.test(first.public_id));
  check("returns dimensions", first.width === 1920, `width=${first.width}`);
  check("returns an https delivery URL", first.secure_url.startsWith("https://res.cloudinary.com/"));

  // ------------------------------------------------------------- collisions
  console.log("\n— collision handling —");
  const secondId = await claim(base, folder);
  check("the taken name now resolves to -2", secondId === `${folder}/${base}-2`, secondId);

  const second = await upload(png, secondId);
  created.push(second.public_id);

  const thirdId = await claim(base, folder);
  check("a third upload resolves to -3", thirdId === `${folder}/${base}-3`, thirdId);
  check("no file was overwritten", first.public_id !== second.public_id);

  // -------------------------------------------------------------- delivery
  console.log("\n— delivery transformations —");
  const transformed = cloudinaryUrl(first.secure_url, { width: 828 });
  check("injects f_auto", transformed.includes("f_auto"));
  check("injects q_auto", transformed.includes("q_auto"));
  check("injects w_828,c_limit", transformed.includes("w_828,c_limit"));

  const response = await fetch(transformed, {
    headers: { Accept: "image/avif,image/webp,image/*" },
  });
  check("transformed URL serves 200", response.ok, `status ${response.status}`);
  const type = response.headers.get("content-type") ?? "";
  check("negotiates a modern format (avif/webp)", /avif|webp/.test(type), `content-type: ${type}`);

  // ---------------------------------------------------------------- delete
  console.log("\n— delete —");
  for (const id of created) {
    await cloudinary.uploader.destroy(id, { invalidate: true });
  }

  const gone = await cloudinary.api
    .resource(created[0])
    .then(() => false)
    .catch((error) => isCloudinaryNotFound(error));
  check("uploaded files are removed again", gone);

  const repeat = await cloudinary.uploader.destroy(created[0], { invalidate: true });
  check(
    "deleting an already-deleted file is not an error",
    String(repeat?.result) === "not found",
    `result=${repeat?.result}`
  );

  const reclaimed = await claim(base, folder);
  check("the name is free again after deletion", reclaimed === `${folder}/${base}`, reclaimed);

  console.log(
    failures === 0
      ? "\nAll checks passed — uploads, SEO filenames, collisions, transformations, deletes and error classification all work.\n"
      : `\n${failures} check(s) failed.\n`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("\nSmoke test could not run:", cloudinaryMessage(error));
  process.exit(1);
});
