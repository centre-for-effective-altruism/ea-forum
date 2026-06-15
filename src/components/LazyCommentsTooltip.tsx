import { ElementType, ReactNode, useCallback, useEffect, useState } from "react";
import { rpc } from "@/lib/rpc";
import { captureException } from "@sentry/nextjs";
import type { Placement } from "@floating-ui/react";
import type { CommentListItem } from "@/lib/comments/commentLists";
import CommentsTooltip from "./CommentsTooltip";
import Tooltip from "./Tooltip";
import Loading from "./Loading";

export default function LazyCommentsTooltip({
  commentId,
  placement,
  As = "div",
  className,
  children,
}: Readonly<{
  commentId: string | null;
  placement?: Placement;
  As?: ElementType;
  className?: string;
  children: ReactNode;
}>) {
  const [comment, setComment] = useState<CommentListItem | null>(null);
  const [everHovered, setEverHovered] = useState(false);
  const onMouseEnter = useCallback(() => setEverHovered(true), []);

  // TODO: These results should be stored in a global cache to avoid refetching
  // the same comment multiple times
  const refetch = useCallback(async () => {
    if (!commentId) {
      setComment(null);
      return;
    }
    try {
      const result = await rpc.comments.listById({ _id: commentId });
      setComment(result);
    } catch (e) {
      console.error(`Error fetching comment ${commentId}:`, e);
      captureException(e);
    }
  }, [commentId]);

  useEffect(() => {
    setEverHovered(false);
  }, [commentId]);

  useEffect(() => {
    if (everHovered) {
      void refetch();
    }
  }, [everHovered, refetch]);

  if (!commentId) {
    return <>{children}</>;
  }

  if (comment) {
    return (
      <CommentsTooltip
        As={As}
        placement={placement}
        className={className}
        comment={comment}
      >
        {children}
      </CommentsTooltip>
    );
  }

  return (
    <Tooltip
      As={As}
      placement={placement}
      className={className}
      tooltipClassName="
        bg-surface-floating! text-gray-900! p-0! shadow-lg w-[360px] max-w-full
      "
      title={<Loading />}
    >
      <As onMouseEnter={onMouseEnter}>{children}</As>
    </Tooltip>
  );
}
