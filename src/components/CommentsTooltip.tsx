import type { ElementType, ReactNode } from "react";
import type { Placement } from "@floating-ui/react";
import type { CommentListItem } from "@/lib/comments/commentLists";
import { CommentsListProvider } from "./Comments/useCommentsList";
import CommentsList from "./Comments/CommentsList";
import Tooltip from "./Tooltip";

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
      tooltipClassName="
        bg-gray-0! text-gray-900! px-3! py-2! shadow-md w-[360px] max-w-full
      "
      title={
        <div data-component="CommentsTooltip">
          <CommentsListProvider comments={[comment]}>
            <CommentsList borderless />
          </CommentsListProvider>
        </div>
      }
    >
      {children}
    </Tooltip>
  );
}
