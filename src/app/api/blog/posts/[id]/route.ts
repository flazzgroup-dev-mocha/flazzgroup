import { prisma } from "@/lib/prisma";
import {
  afterWrite,
  fail,
  isRecordNotFound,
  ok,
  parseVersionedBody,
  staleWrite,
  withAdmin,
} from "@/lib/api";
import { deletePost, updatePost } from "@/lib/blog/write";
import { releaseImage, releaseIfReplaced, setAltText } from "@/lib/media";
import { blogPostSchema } from "@/lib/validators";

type Context = { params: Promise<{ id: string }> };

export const PUT = withAdmin(async (session, request: Request, context: Context) => {
  const { id } = await context.params;
  const { data, expectedVersion } = await parseVersionedBody(request, blogPostSchema);

  // Read the old featured image before the write, so swapping it can reclaim
  // the file that is no longer referenced.
  const before = await prisma.blogPost.findUnique({
    where: { id },
    select: { featuredImage: true, updatedAt: true },
  });

  if (!before) return fail("That article no longer exists.", 404);

  // An article is the longest-lived form in the panel — it is entirely normal
  // to leave it open for an hour — so it is the one most likely to be saved
  // over someone else's work.
  if (!expectedVersion) {
    return fail("Please fix the highlighted fields.", 400, {
      form: "This editor is missing its version stamp. Refresh the page and try again.",
    });
  }

  let post: Awaited<ReturnType<typeof updatePost>>;
  try {
    post = await updatePost(id, data, { updatedAt: expectedVersion });
  } catch (error) {
    if (
      isRecordNotFound(error) &&
      (await prisma.blogPost.findUnique({ where: { id }, select: { id: true } }))
    ) {
      return staleWrite();
    }
    throw error;
  }

  await releaseIfReplaced(before.featuredImage, data.featuredImage);
  await setAltText(data.featuredImage, data.featuredImageAlt);

  await afterWrite({
    resource: "blog",
    action: "UPDATE",
    label: post.title,
    adminId: session.sub,
  });

  return ok(post);
});

export const DELETE = withAdmin(async (session, _request: Request, context: Context) => {
  const { id } = await context.params;

  const existing = await prisma.blogPost.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return fail("That article no longer exists.", 404);

  const post = await deletePost(id);
  await releaseImage(post.featuredImage);

  await afterWrite({
    resource: "blog",
    action: "DELETE",
    label: post.title,
    adminId: session.sub,
  });

  return ok({ id });
});
