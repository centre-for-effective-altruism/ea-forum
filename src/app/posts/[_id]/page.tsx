import { notFound, redirect, RedirectType } from "next/navigation";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import { db } from "@/lib/schema";

export default async function PostsPageNoSlug({
  params,
}: {
  params: Promise<{ _id: string }>;
}) {
  const { _id } = await params;
  const post = await db.query.posts.findFirst({
    columns: {
      _id: true,
      slug: true,
      isEvent: true,
      groupId: true,
    },
    where: {
      _id,
    },
  });
  if (!post) {
    notFound();
  }
  redirect(postGetPageUrl({ post }), RedirectType.replace);
}
