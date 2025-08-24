import type { ICurrentUser } from "@/lib/users/userQueries.schemas";
import { getDbOrThrow } from "@/lib/db";
import { PostsRepo } from "@/lib/posts/postQueries.repo";
import PostBody from "./PostBody";

export default async function LazyPostBody({
  currentUser,
  postId,
  className,
}: Readonly<{
  currentUser: ICurrentUser | null;
  postId: string;
  className?: string;
}>) {
  const postBody = await new PostsRepo(getDbOrThrow()).postBodyById({
    postId,
    currentUserId: currentUser?._id ?? null,
    currentUserIsAdmin: !!currentUser?.isAdmin,
  });
  return postBody ? <PostBody html={postBody.body} className={className} /> : null;
}
