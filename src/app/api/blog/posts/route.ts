import { prisma } from "@/lib/prisma";
import { afterWrite, ok, parseBody, withAdmin } from "@/lib/api";
import { createPost } from "@/lib/blog/write";
import { setAltText } from "@/lib/media";
import { blogPostSchema } from "@/lib/validators";

export const GET = withAdmin(async () =>
  ok(
    await prisma.blogPost.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        publishedAt: true,
        updatedAt: true,
      },
    })
  )
);

export const POST = withAdmin(async (session, request: Request) => {
  const data = await parseBody(request, blogPostSchema);
  const post = await createPost(data);

  await setAltText(data.featuredImage, data.featuredImageAlt);

  await afterWrite({
    resource: "blog",
    action: "CREATE",
    label: post.title,
    adminId: session.sub,
  });

  return ok(post, 201);
});
