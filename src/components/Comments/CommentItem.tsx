"use client";

import { useCallback, useState } from "react";
import type { CommentsList } from "@/lib/comments/commentLists";
import type { CommentTreeNode } from "@/lib/comments/CommentTree";
import { commentGetPageUrl } from "@/lib/comments/commentHelpers";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import {
  userGetProfileUrl,
  userIsNew,
  userIsPostAuthor,
} from "@/lib/users/userHelpers";
import toast from "react-hot-toast";
import clsx from "clsx";
import ChevronDownIcon from "@heroicons/react/16/solid/ChevronDownIcon";
import LinkIcon from "@heroicons/react/16/solid/LinkIcon";
import SproutIcon from "../Icons/SproutIcon";
import AuthorIcon from "../Icons/AuthorIcon";
import CommentTripleDotMenu from "./CommentTripleDotMenu";
import CommentVoteButtons from "../Voting/CommentVoteButtons";
import CommentBody from "../ContentStyles/CommentBody";
import CommentTags from "../Tags/CommentTags";
import UsersTooltip from "../UsersTooltip";
import CommentDate from "./CommentDate";
import Tooltip from "../Tooltip";
import Type from "../Type";
import Link from "../Link";

export default function CommentItem({
  node: { comment, depth, children },
  onToggleExpanded,
  startCollapsed,
  showPreviewWhenCollapsed,
  borderless,
  className,
}: Readonly<{
  node: CommentTreeNode<CommentsList>;
  onToggleExpanded?: (expanded: boolean) => void;
  /** If true, the comment initially renders un-collapsed */
  startCollapsed?: boolean;
  /**
   * By default, the body of an un-expanded comment is completely hidden. When
   * this is true, we instead show the first couple of lines as a preview, and
   * clicking the preview expands the comment.
   */
  showPreviewWhenCollapsed?: boolean;
  /**
   * Don't render a border or outside padding - used for embedding in another
   * component.
   */
  borderless?: boolean;
  className?: string;
}>) {
  const { currentUser } = useCurrentUser();
  const [expanded, setExpanded] = useState(!startCollapsed);
  const toggleExpanded = useCallback(() => {
    setExpanded((expanded) => {
      const newExpanded = !expanded;
      onToggleExpanded?.(newExpanded);
      return newExpanded;
    });
  }, [onToggleExpanded]);

  const copyLink = useCallback(async () => {
    try {
      const link = commentGetPageUrl({
        comment,
        permalink: true,
        isAbsolute: true,
      });
      await navigator.clipboard.writeText(link);
      toast.success("Copied comment link to clipboard");
    } catch {
      toast.error("Something went wrong");
    }
  }, [comment]);

  const { _id, user, html, postedAt, post, promoted, promotedBy, moderatorHat } =
    comment;
  const isPostAuthor = userIsPostAuthor(user, post);
  const isNew =
    !!post?.readStatus?.[0]?.lastUpdated &&
    new Date(post?.readStatus?.[0]?.lastUpdated) < new Date(postedAt);
  return (
    <div
      data-component="CommentItem"
      className={clsx(
        !borderless && "border rounded-sm pl-3 pt-2 mb-1",
        !borderless &&
          (promoted ? "border-promoted-comment" : "border-comment-border"),
        !borderless &&
          !moderatorHat &&
          (depth & 1 ? "bg-comment-odd" : "bg-comment-even"),
        !borderless && moderatorHat && "bg-moderator-comment",
        !borderless && depth === 0 ? "" : "border-r-0",
        isNew && "border-l-primary-light border-l-[4px]",
        className,
      )}
    >
      <article
        id={_id}
        data-depth={depth}
        className={borderless ? undefined : "pr-3 mb-2"}
      >
        <div className="mb-2 flex items-center gap-2">
          {!borderless && (
            <ChevronDownIcon
              className={clsx(
                "w-[16px] cursor-pointer text-gray-600 hover:opacity-70",
                "transition-transform",
                !expanded && "-rotate-90",
              )}
              role="button"
              onClick={toggleExpanded}
            />
          )}
          <UsersTooltip user={user}>
            <Type className="font-[600]">
              {user && user.slug && (
                <Link href={userGetProfileUrl({ user })}>{user.displayName}</Link>
              )}
            </Type>
          </UsersTooltip>
          {isPostAuthor && (
            <Tooltip
              title={<Type style="bodySmall">Post author</Type>}
              placement="bottom"
            >
              <AuthorIcon className="w-4 text-gray-600 translate-y-px" />
            </Tooltip>
          )}
          {user && userIsNew(user) && (
            <Tooltip
              title={
                <Type style="bodySmall">
                  {user?.displayName} is either new on the EA Forum or doesn&apos;t
                  have much karma yet
                </Type>
              }
              placement="bottom-start"
              tooltipClassName="max-w-[300px]"
            >
              <SproutIcon className="text-new-user-sprout" />
            </Tooltip>
          )}
          <CommentDate comment={comment} />
          {comment.moderatorHat && (
            <Type className="text-gray-600 cursor-default">Moderator comment</Type>
          )}
          <CommentVoteButtons comment={comment} />
          <div className="grow">
            <CommentTags comment={comment} />
          </div>
          <Link href={commentGetPageUrl({ comment })} onClick={copyLink}>
            <LinkIcon className="w-[16px] text-gray-600 hover:text-gray-1000" />
          </Link>
          {currentUser && <CommentTripleDotMenu comment={comment} />}
        </div>
        {!expanded && showPreviewWhenCollapsed && (
          <div onClick={toggleExpanded} className="line-clamp-2 cursor-pointer">
            <CommentBody html={html} />
          </div>
        )}
        {expanded && (
          <>
            {promotedBy?.displayName && (
              <Type
                style="bodySmall"
                className="text-promoted-comment cursor-default mb-2"
              >
                Promoted by {promotedBy.displayName}
              </Type>
            )}
            <CommentBody html={html} />
          </>
        )}
      </article>
      {expanded && children.length > 0 && (
        <div>
          {children.map((node) => (
            <CommentItem node={node} key={node.comment._id} />
          ))}
        </div>
      )}
    </div>
  );
}
