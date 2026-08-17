import type { ElementType, ReactNode } from "react";
import type { Placement } from "@floating-ui/react";
import type { CommentListItem } from "@/lib/comments/commentLists";
import { CommentsListProvider } from "./Comments/useCommentsList";
import CommentsList from "./Comments/CommentsList";
import Tooltip from "./Tooltip";
import Type from "./Type";

export default function CommentsTooltip({
  comment,
  placement = "bottom-start",
  As = "div",
  className,
  children,
}: Readonly<{
  comment: CommentListItem | null | undefined;
  placement?: Placement;
  As?: ElementType;
  className?: string;
  children: ReactNode;
}>) {
  if (!comment) {
    return <>{children}</>;
  }
  return (
    <Tooltip
      placement={placement}
      As={As}
      className={className}
      popover
      tooltipClassName="px-3! py-2! w-[360px]"
      title={
        <div data-component="CommentsTooltip">
          {comment.post?.title && (
            <Type style="postTitle" className="mb-2">
              {comment.post.title}
            </Type>
          )}
          <CommentsListProvider comments={[comment]}>
            <CommentsList />
          </CommentsListProvider>
        </div>
      }
    >
      {children}
    </Tooltip>
  );
}
