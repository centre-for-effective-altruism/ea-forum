import { requestHandler } from "@/lib/requestHandler";
import { PostsRepo } from "@/lib/posts/postQueries.repo";

export const GET = requestHandler(async ({ db, currentUser, params }) => {
  const { _id } = await params;
  if (!_id) {
    return Response.json({ error: "Missing post _id" }, { status: 400 });
  }
  const post = await new PostsRepo(db).postById({
    postId: _id,
    currentUserId: currentUser?._id ?? "",
    currentUserIsAdmin: currentUser?.isAdmin ?? false,
  });
  return post
    ? Response.json({ post }, { status: 200 })
    : Response.json({ error: `Post ${_id} not found` }, { status: 404 });
});
