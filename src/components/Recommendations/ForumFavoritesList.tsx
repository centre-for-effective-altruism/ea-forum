import { fetchForumFavoritesPostsList } from "@/lib/posts/postLists";
import { getCurrentUser } from "@/lib/users/currentUser";
import PostsList from "../PostsList/PostsList";
import Type from "../Type";

export default async function ForumFavoritesList({
  limit,
}: Readonly<{
  limit: number;
}>) {
  const currentUser = await getCurrentUser();
  const posts = await fetchForumFavoritesPostsList(currentUser?._id ?? null, limit);
  if (posts.length === 0) {
    return (
      <Type style="bodySmall" className="text-gray-600">
        There are no more recommendations left.
      </Type>
    );
  }
  return <PostsList posts={posts} />;
}
