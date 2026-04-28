"use client";

import { useCallback, useState } from "react";
import type { CommentListItem } from "@/lib/comments/commentLists";
import type { CommentTreeNode } from "@/lib/comments/CommentTree";
import { commentGetPageUrl } from "@/lib/comments/commentHelpers";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useOptionalCommentsList } from "./useCommentsList";
import {
  userGetProfileUrl,
  userIsNew,
  userIsPostAuthor,
} from "@/lib/users/userHelpers";
import toast from "react-hot-toast";
import clsx from "clsx";
import ArrowTurnLeftUpIcon from "@heroicons/react/16/solid/ArrowTurnLeftUpIcon";
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
import EditComment from "./EditComment";
import Loading from "../Loading";
import Tooltip from "../Tooltip";
import Type from "../Type";
import Link from "../Link";

/**
 * Render a comment. While you can use this directly, it's often better to instead
 * create a `CommentsListProvider` and then place a `CommentsList` inside it, as
 * this will enable more dynamic features such as loading parent comments.
 */
export default function CommentItem({
  node: { comment, depth, children },
  onToggleExpanded,
  startCollapsed,
  showPreviewWhenCollapsed,
  borderless,
  className,
}: Readonly<{
  node: CommentTreeNode<CommentListItem>;
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
  const commentsListContext = useOptionalCommentsList();
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!startCollapsed);
  const [isLoadingParent, setIsLoadingParent] = useState(false);
  const toggleExpanded = useCallback(() => {
    setIsExpanded((expanded) => {
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

  const onEdit = useCallback(() => setIsEditing(true), []);
  const onFinishEdit = useCallback(() => setIsEditing(false), []);

  const {
    _id,
    user,
    html,
    postedAt,
    parentCommentId,
    post,
    promoted,
    promotedBy,
    moderatorHat,
  } = comment;
  const isPostAuthor = userIsPostAuthor(user, post);
  const isNew =
    !!post?.readStatus?.[0]?.lastUpdated &&
    new Date(post?.readStatus?.[0]?.lastUpdated) < new Date(postedAt);

  const canLoadParent =
    !!commentsListContext &&
    !!parentCommentId &&
    !isLoadingParent &&
    !commentsListContext.commentIsLoaded(parentCommentId);

  const loadParent = useCallback(() => {
    if (canLoadParent) {
      setIsLoadingParent(true);
      void (async () => {
        await commentsListContext.loadParentComment(parentCommentId);
        setIsLoadingParent(false);
      })();
    }
  }, [canLoadParent, commentsListContext, parentCommentId]);

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
        !borderless && isNew && "border-l-primary-light border-l-[4px]",
        className,
      )}
    >
      <article
        id={_id}
        data-depth={depth}
        className={borderless ? undefined : "pr-3 mb-2"}
      >
        <div className="mb-2 flex items-start gap-2">
          <div className="flex items-center gap-2 flex-wrap grow">
            {canLoadParent && (
              <Tooltip title={<Type style="bodySmall">Show parent comment</Type>}>
                <ArrowTurnLeftUpIcon
                  role="button"
                  className="w-3 cursor-pointer text-gray-600 hover:opacity-70"
                  onClick={loadParent}
                />
              </Tooltip>
            )}
            {isLoadingParent && <Loading />}
            {!borderless && (
              <ChevronDownIcon
                className={clsx(
                  "w-4 cursor-pointer text-gray-600 hover:opacity-70",
                  "transition-transform",
                  !isExpanded && "-rotate-90",
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
          </div>
          <Link href={commentGetPageUrl({ comment })} onClick={copyLink}>
            <LinkIcon className="w-[16px] text-gray-600 hover:text-gray-1000" />
          </Link>
          {currentUser && (
            <CommentTripleDotMenu
              comment={comment}
              onEdit={isEditing ? undefined : onEdit}
            />
          )}
        </div>
        {!isExpanded && showPreviewWhenCollapsed && (
          <div onClick={toggleExpanded} className="line-clamp-2 cursor-pointer">
            <CommentBody html={html} />
          </div>
        )}
        {isExpanded &&
          (isEditing ? (
            <EditComment commentId={comment._id} onFinishEdit={onFinishEdit} />
          ) : (
            <>
              {promotedBy?.displayName && (
                <Type
                  style="bodySmall"
                  className="text-promoted-comment cursor-default mb-2"
                >
                  Promoted by {promotedBy.displayName}
                </Type>
              )}
              <CommentBody html={html} className="cursor-default" />
            </>
          ))}
      </article>
      {isExpanded && children.length > 0 && (
        <div>
          {children.map((node) => (
            <CommentItem node={node} key={node.comment._id} />
          ))}
        </div>
      )}
    </div>
  );
}
