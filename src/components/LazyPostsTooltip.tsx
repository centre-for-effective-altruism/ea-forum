import { ElementType, ReactNode, useCallback, useEffect, useState } from "react";
import { rpc } from "@/lib/rpc";
import { captureException } from "@sentry/nextjs";
import type { Placement } from "@floating-ui/react";
import type { PostListItem } from "@/lib/posts/postLists";
import PostsTooltip from "./PostsTooltip";
import Tooltip from "./Tooltip";
import Loading from "./Loading";

export default function LazyPostsTooltip({
  postId,
  placement,
  As = "div",
  className,
  children,
}: Readonly<{
  postId: string | null;
  placement?: Placement;
  As?: ElementType;
  className?: string;
  children: ReactNode;
}>) {
  const [post, setPost] = useState<PostListItem | null>(null);
  const [everHovered, setEverHovered] = useState(false);
  const onMouseEnter = useCallback(() => setEverHovered(true), []);

  // TODO: These results should be stored in a global cache to avoid refetching
  // the same post multiple times
  const refetch = useCallback(async () => {
    if (!postId) {
      setPost(null);
      return;
    }
    try {
      const result = await rpc.posts.listById({ _id: postId });
      setPost(result);
    } catch (e) {
      console.error(`Error fetching post ${postId}:`, e);
      captureException(e);
    }
  }, [postId]);

  useEffect(() => {
    setEverHovered(false);
  }, [postId]);

  useEffect(() => {
    if (everHovered) {
      void refetch();
    }
  }, [everHovered, refetch]);

  if (!postId) {
    return <>{children}</>;
  }

  if (post) {
    return (
      <PostsTooltip As={As} placement={placement} className={className} post={post}>
        {children}
      </PostsTooltip>
    );
  }

  return (
    <Tooltip
      As={As}
      placement={placement}
      className={className}
      tooltipClassName="
        bg-surface-floating! text-gray-900! p-0! shadow-md w-[360px] max-w-full
      "
      title={<Loading />}
    >
      <As onMouseEnter={onMouseEnter}>{children}</As>
    </Tooltip>
  );
}
