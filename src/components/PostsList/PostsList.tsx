import type { ComponentProps } from "react";
import PostsItem from "./PostsItem";

export default function PostsList({
  posts,
}: Readonly<{
  posts: ComponentProps<typeof PostsItem>["post"][];
}>) {
  return (
    <section className="max-w-full" data-component="PostsList">
      {posts.map((post) => (
        <PostsItem key={post._id} post={post} />
      ))}
    </section>
  );
}
