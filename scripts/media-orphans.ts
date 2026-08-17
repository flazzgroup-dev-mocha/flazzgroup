import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

import { findOrphanedAssets } from "../src/lib/media/references";
import { prisma } from "../src/lib/prisma";
import { cloudinaryMessage } from "../src/lib/media/errors";

/**
 * Stored files that nothing on the site points at any more.
 *
 *   npm run media:orphans              list them, change nothing
 *   npm run media:orphans -- --delete  remove them from Cloudinary and the table
 *
 * Two ways a file ends up here. An upload can succeed at Cloudinary and then
 * fail to write its row, leaving the bytes with no owner; and a row can be
 * deleted while the shared-reference check was less complete than it is now, so
 * the file was never released. Both are recoverable, and this is how.
 *
 * ------------------------------------------------------------------ safety
 *
 * Listing is the default and deleting takes an explicit flag, because media is
 * the one thing here with no undo: Postgres has Neon's branch history, the code
 * has git, and a destroyed Cloudinary asset is simply gone.
 *
 * Only rows in `media_assets` are considered — only files this application
 * uploaded. Anything added through the Cloudinary dashboard has no row, is never
 * listed, and is never touched. The reference check is `isStillReferenced`, the
 * same function every delete in the admin panel goes through, so this cannot
 * disagree with the running site about what is in use.
 *
 * Read the list before passing `--delete`. If a name looks like something you
 * recognise, stop and find out why nothing references it.
 */

const DELETE = process.argv.includes("--delete");

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME;
const KEY = process.env.CLOUDINARY_API_KEY;
const SECRET = process.env.CLOUDINARY_API_SECRET;

const kb = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`;

async function main() {
  const orphans = await findOrphanedAssets();

  if (orphans.length === 0) {
    console.log("\nNo orphaned media. Every stored file is referenced.\n");
    return;
  }

  const total = orphans.reduce((sum, asset) => sum + asset.bytes, 0);

  console.log(
    `\n${orphans.length} orphaned asset(s), ${kb(total)} total:\n`
  );

  for (const asset of orphans) {
    const dimensions = `${asset.width}x${asset.height}`;
    console.log(`  ${asset.publicId}.${asset.format}`);
    console.log(
      `      ${dimensions.padEnd(11)} ${kb(asset.bytes).padStart(8)}   uploaded ${asset.createdAt.toISOString().slice(0, 10)}` +
        (asset.originalFilename ? `   as "${asset.originalFilename}"` : "")
    );
  }

  if (!DELETE) {
    console.log(
      "\nNothing was changed. Review the list above, then re-run with --delete\n" +
        "to remove these from Cloudinary and drop their rows:\n\n" +
        "  npm run media:orphans -- --delete\n"
    );
    return;
  }

  if (!CLOUD || !KEY || !SECRET) {
    console.error(
      "\nCloudinary is not configured, so nothing can be deleted.\n" +
        "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.\n"
    );
    process.exitCode = 1;
    return;
  }

  cloudinary.config({
    cloud_name: CLOUD,
    api_key: KEY,
    api_secret: SECRET,
    secure: true,
  });

  console.log("\nDeleting…\n");
  let removed = 0;

  for (const asset of orphans) {
    try {
      const result = await cloudinary.uploader.destroy(asset.publicId, {
        invalidate: true,
      });
      const outcome = String(result?.result ?? "");

      // "not found" counts: the file is gone either way, and the row should
      // follow it. Anything else leaves the row alone, so the pointer to a file
      // that still exists is not thrown away.
      if (outcome === "ok" || outcome === "not found") {
        await prisma.mediaAsset.deleteMany({ where: { publicId: asset.publicId } });
        removed += 1;
        console.log(`  removed  ${asset.publicId}`);
      } else {
        console.log(`  KEPT     ${asset.publicId} — Cloudinary said "${outcome}"`);
      }
    } catch (error) {
      console.log(`  KEPT     ${asset.publicId} — ${cloudinaryMessage(error)}`);
    }
  }

  console.log(
    `\n${removed} of ${orphans.length} removed.` +
      (removed < orphans.length
        ? " The rest were left in place, along with their rows.\n"
        : "\n")
  );
}

main()
  .catch((error) => {
    console.error("\nCould not run:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
