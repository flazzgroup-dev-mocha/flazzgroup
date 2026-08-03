import "server-only";

import { z } from "zod";

import {
  afterWrite,
  fail,
  isRecordNotFound,
  ok,
  parseBody,
  parseVersionedBody,
  staleWrite,
  withAdmin,
} from "@/lib/api";
import { releaseImage, releaseIfReplaced } from "@/lib/media";
import { reorderSchema } from "@/lib/validators";
import type { ResourceKey } from "@/lib/cache";

/**
 * Rows carry `updatedAt` where the model has one, which is everything except
 * BlogTag. Its absence is handled rather than special-cased: a row with no
 * version cannot be version-checked, so the guard is skipped for it.
 */
type Row = { id: string; updatedAt?: Date };

/**
 * Extra `where` clauses the update must also satisfy, spread by each route into
 * its Prisma call. Passing this rather than checking the version separately is
 * what makes the check atomic — a read-then-compare-then-write leaves a window
 * between the compare and the write, which is the same race in a smaller box.
 */
export type VersionGuard = { updatedAt: Date } | undefined;

type CollectionConfig<S extends z.ZodType, T extends Row> = {
  resource: ResourceKey;
  schema: S;
  list: () => Promise<T[]>;
  create: (data: z.output<S>) => Promise<T>;
  /** Human name used in the activity log. */
  label: (row: T) => string;
};

type ItemConfig<S extends z.ZodType, T extends Row> = {
  resource: ResourceKey;
  schema: S;
  find: (id: string) => Promise<T | null>;
  update: (id: string, data: z.output<S>, guard: VersionGuard) => Promise<T>;
  remove: (id: string) => Promise<T>;
  label: (row: T) => string;
  /**
   * Stored images this row owns.
   *
   * Used twice: on delete every one is released, and on update any that changed
   * is released, so replacing a picture does not strand the old file in
   * Cloudinary forever. Order matters — the same index is compared before and
   * after, so always return the same slots.
   */
  images?: (row: T) => (string | null | undefined)[];
};

type RouteContext = { params: Promise<{ id: string }> };

/** `GET /api/<resource>` and `POST /api/<resource>`. */
export function collectionRoute<S extends z.ZodType, T extends Row>(
  config: CollectionConfig<S, T>
) {
  const GET = withAdmin(async () => ok(await config.list()));

  const POST = withAdmin(async (session, request: Request) => {
    const data = await parseBody(request, config.schema);
    const row = await config.create(data);

    await afterWrite({
      resource: config.resource,
      action: "CREATE",
      label: config.label(row),
      adminId: session.sub,
    });

    return ok(row, 201);
  });

  return { GET, POST };
}

/** `PUT /api/<resource>/[id]` and `DELETE /api/<resource>/[id]`. */
export function itemRoute<S extends z.ZodType, T extends Row>(
  config: ItemConfig<S, T>
) {
  const PUT = withAdmin(
    async (session, request: Request, context: RouteContext) => {
      const { id } = await context.params;
      const { data, expectedVersion } = await parseVersionedBody(
        request,
        config.schema
      );

      /**
       * Read before writing, for two reasons that happen to want the same read:
       * a swapped-out picture has to be reclaimed afterwards, and the version
       * token has to be checked against something.
       */
      const before = await config.find(id);
      if (!before) return fail("That item no longer exists.", 404);

      /**
       * A versioned row must be written with a version.
       *
       * Rejecting the omission rather than treating it as "no opinion" is the
       * point. This is the guard that stops a stale form from destroying a
       * live image: admin A replaces picture X with Y, `releaseIfReplaced`
       * deletes X from Cloudinary, and admin B — whose form still holds X —
       * saves and puts the row back to a file that no longer exists. Nothing
       * errors, and the public page shows a broken image. An opt-out would be
       * an opt-out of exactly that protection.
       */
      if (before.updatedAt && !expectedVersion) {
        return fail("Please fix the highlighted fields.", 400, {
          form: "This form is missing its version stamp. Refresh the page and try again.",
        });
      }

      const guard: VersionGuard =
        before.updatedAt && expectedVersion
          ? { updatedAt: expectedVersion }
          : undefined;

      let row: T;
      try {
        row = await config.update(id, data, guard);
      } catch (error) {
        /**
         * With the guard in the `where` clause, "no row matched" is ambiguous:
         * the row was deleted, or it was written to since this client read it.
         * One more read separates them, and only then can this answer 404 or
         * 409 honestly.
         */
        if (isRecordNotFound(error) && (await config.find(id))) {
          return staleWrite();
        }
        throw error;
      }

      if (config.images) {
        const previous = config.images(before);
        const next = config.images(row);

        await Promise.all(
          previous.map((url, index) => releaseIfReplaced(url, next[index]))
        );
      }

      await afterWrite({
        resource: config.resource,
        action: "UPDATE",
        label: config.label(row),
        adminId: session.sub,
      });

      return ok(row);
    }
  );

  const DELETE = withAdmin(
    async (session, _request: Request, context: RouteContext) => {
      const { id } = await context.params;

      const existing = await config.find(id);
      if (!existing) return fail("That item no longer exists.", 404);

      const row = await config.remove(id);

      // Reclaim storage only after the row is gone, so a failed delete never
      // leaves a record pointing at a missing file.
      if (config.images) {
        await Promise.all(config.images(existing).map(releaseImage));
      }

      await afterWrite({
        resource: config.resource,
        action: "DELETE",
        label: config.label(row),
        adminId: session.sub,
      });

      return ok({ id });
    }
  );

  return { PUT, DELETE };
}

/** `POST /api/<resource>/reorder` — persists a drag-and-drop ordering. */
export function reorderRoute(config: {
  resource: ResourceKey;
  /** Resolves to the number of rows actually updated. */
  apply: (ids: string[]) => Promise<number>;
}) {
  const POST = withAdmin(async (session, request: Request) => {
    const { ids } = await parseBody(request, reorderSchema);
    const count = await config.apply(ids);

    /**
     * A partial match means the client is working from a stale list — a row it
     * is trying to position has been deleted since it loaded. Answering 200
     * would leave that tab convinced its ordering is what the database holds.
     *
     * The rows that did match keep their new positions; this is a report, not
     * a rollback, and the client refetches on 409.
     */
    if (count !== ids.length) {
      return fail(
        "The list changed while you were reordering it. Refresh and try again.",
        409,
        { form: `${count} of ${ids.length} items still exist.` }
      );
    }

    await afterWrite({
      resource: config.resource,
      action: "REORDER",
      label: `${count} items reordered`,
      adminId: session.sub,
    });

    return ok({ count, requested: ids.length });
  });

  return { POST };
}
