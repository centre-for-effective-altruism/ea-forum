import type { PostListItem } from "@/lib/posts/postLists";
import PostsItem from "./PostsItem";
import clsx from "clsx";

export default function PostsList({
  posts,
  className,
}: Readonly<{
  posts: PostListItem[];
  className?: string;
}>) {
  return (
    <section className={clsx("max-w-full", className)} data-component="PostsList">
      {posts.map((post) => (
        <PostsItem key={post._id} post={post} />
      ))}
    </section>
  );
}
