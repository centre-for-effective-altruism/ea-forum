import { notFound, redirect, RedirectType } from "next/navigation";
import { PostsRepo } from "@/lib/posts/postQueries.repo";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import { getCurrentUser } from "@/lib/requestHandler";

export default async function PostsPageNoSlug({
  params,
}: {
  params: Promise<{ _id: string }>;
}) {
  const { _id } = await params;
  const { db, currentUser } = await getCurrentUser();
  const post = await new PostsRepo(db).postById({
    postId: _id,
    currentUserId: currentUser?._id ?? null,
    currentUserIsAdmin: !!currentUser?.isAdmin,
  });
  if (!post) {
    notFound();
  }
  redirect(postGetPageUrl({ post }), RedirectType.replace);
}
