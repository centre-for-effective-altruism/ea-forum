import { notFound, redirect, RedirectType } from "next/navigation";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import { db } from "@/lib/db";

export default async function PostsPageBySlug({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await db.query.posts.findFirst({
    columns: {
      _id: true,
      slug: true,
      isEvent: true,
      groupId: true,
    },
    where: {
      slug,
    },
  });
  if (!post) {
    notFound();
  }
  redirect(postGetPageUrl({ post }), RedirectType.replace);
}
