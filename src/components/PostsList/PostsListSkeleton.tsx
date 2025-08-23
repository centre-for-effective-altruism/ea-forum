import PostsItemSkeleton from "./PostsItemSkeleton";

export default function PostsListSkeleton({ count }: Readonly<{ count: number }>) {
  return (
    <section className="max-w-full" data-component="PostsListSkeleton">
      {new Array(count).fill(null).map((_, i) => (
        <PostsItemSkeleton key={i} />
      ))}
    </section>
  );
}
