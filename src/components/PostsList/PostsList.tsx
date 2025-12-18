import type { PostListItem } from "@/lib/posts/postLists";
import PostsItem from "./PostsItem";

export default function PostsList({
  posts,
}: Readonly<{
  posts: PostListItem[];
}>) {
  return (
    <section className="max-w-full" data-component="PostsList">
      {posts.map((post) => (
        <PostsItem key={post._id} post={post} />
      ))}
    </section>
  );
}
