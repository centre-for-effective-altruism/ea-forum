import { fetchPostDisplayWithTableOfContents } from "@/lib/posts/postQueries";
import PostTableOfContents from "./PostTableOfContents";

export default async function PostTableOfContentsAsync({
  postId,
  className,
}: Readonly<{
  postId: string;
  className?: string;
}>) {
  const { post, tableOfContents } =
    await fetchPostDisplayWithTableOfContents(postId);
  if (!post) {
    return null;
  }

  return (
    <PostTableOfContents
      title={post.title}
      contents={tableOfContents}
      commentCount={post.commentCount}
      className={className}
    />
  );
}
