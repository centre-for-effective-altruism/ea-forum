import type { CurrentUser } from "@/lib/users/currentUser";
import { fetchPingbackPosts } from "@/lib/posts/postLists";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import PostsTooltip from "../PostsTooltip";
import Tooltip from "../Tooltip";
import Score from "../Score";
import Type from "../Type";
import Link from "../Link";

export default async function PostPingbacks({
  postId,
  currentUser,
  className,
}: Readonly<{
  postId: string;
  currentUser: CurrentUser | null;
  className?: string;
}>) {
  const pingbacks = await fetchPingbackPosts(currentUser?._id ?? null, postId);
  if (!pingbacks.length) {
    return null;
  }
  return (
    <div data-component="PostPingbacks" className={className}>
      <Tooltip
        title={<Type style="bodySmall">Posts that linked to this post</Type>}
        placement="top-start"
        className="mb-2"
      >
        <Type style="bodyMedium" className="cursor-default">
          Mentioned in
        </Type>
      </Tooltip>
      {pingbacks.map((post) => (
        <PostsTooltip key={post._id} post={post}>
          <Link
            href={postGetPageUrl({ post })}
            className="flex items-center gap-2 hover:bg-gray-100/70 rounded py-1"
          >
            <Score
              baseScore={post.baseScore}
              voteCount={post.voteCount}
              orientation="horizontal"
              className="w-[50px]"
            />
            <Type style="bodyHeavy">{post.title}</Type>
          </Link>
        </PostsTooltip>
      ))}
    </div>
  );
}
