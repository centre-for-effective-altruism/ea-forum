"use client";

import { useCallback, useState } from "react";
import type { CommentListItem } from "@/lib/comments/commentLists";
import type { CommentTreeNode } from "@/lib/comments/CommentTree";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import { useOptionalCommentsList } from "./useCommentsList";
import { formatLongDateWithTime } from "@/lib/timeUtils";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { htmlToTextDefault } from "@/lib/utils/htmlToText";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import { useIsClamped } from "@/lib/hooks/useIsClamped";
import {
  commentGetPageUrl,
  commentIsHiddenPendingReview,
  commentRepliesBlockedUntil,
} from "@/lib/comments/commentHelpers";
import {
  userIsAdminOrMod,
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
import LazyPostsTooltip from "../LazyPostsTooltip";
import CommentPollVote from "./CommentPollVote";
import CommentTags from "../Tags/CommentTags";
import PangramBadge from "../PangramBadge";
import CommentDate from "./CommentDate";
import EditComment from "./EditComment";
import NewComment from "./NewComment";
import UsersName from "../UsersName";
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
  node,
  onToggleExpanded,
  startCollapsed,
  showPreviewWhenCollapsed,
  loadingReplies,
  borderless,
  className,
}: Readonly<{
  node: CommentTreeNode<CommentListItem>;
  onToggleExpanded?: (
    expanded: boolean,
    node: CommentTreeNode<CommentListItem>,
  ) => void;
  /** If true, the comment initially renders collapsed */
  startCollapsed?: boolean;
  /**
   * By default, the body of an un-expanded comment is completely hidden. When
   * this is true, we instead show the first couple of lines as a preview, and
   * clicking the preview expands the comment.
   */
  showPreviewWhenCollapsed?: boolean;
  loadingReplies?: boolean;
  /**
   * Don't render a border or outside padding - used for embedding in another
   * component.
   */
  borderless?: boolean;
  className?: string;
}>) {
  const commentsListContext = useOptionalCommentsList();
  const { comment, depth, children } = node;
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
    retracted,
    rejected,
    draft,
    deleted,
    deletedBy,
    deletedDate,
  } = comment;
  const isNew =
    !draft &&
    !!post?.readStatus?.[0]?.lastUpdated &&
    new Date(post?.readStatus?.[0]?.lastUpdated) < new Date(postedAt);
  const collapsedBecauseRepliedTo =
    commentsListContext?.collapsedIfRepliedTo && children.length > 0 && !isNew;
  const repliesBlockedUntil = commentRepliesBlockedUntil(comment);

  const { currentUser } = useCurrentUser();
  const { onSignup } = useLoginPopoverContext();
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(
    !draft && !startCollapsed && !collapsedBecauseRepliedTo,
  );
  const [isTruncated, setIsTruncated] = useState(
    commentsListContext?.collapsedIfRepliedTo && !collapsedBecauseRepliedTo,
  );
  const [isLoadingParent, setIsLoadingParent] = useState(false);
  const { ref, isClamped } = useIsClamped();

  const untruncate = useCallback(() => setIsTruncated(false), []);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((expanded) => {
      const newExpanded = !expanded;
      onToggleExpanded?.(newExpanded, node);
      return newExpanded;
    });
  }, [node, onToggleExpanded]);

  const onClickReply = useCallback(() => {
    if (currentUser) {
      setIsReplying(true);
    } else {
      onSignup();
    }
  }, [currentUser, onSignup]);

  const onReplySuccess = useCallback(() => setIsReplying(false), []);

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
  const onEditSuccess = useCallback((comment: CommentListItem) => {
    setIsEditing(false);
    if (comment.draft) {
      setIsExpanded(false);
    }
  }, []);
  const onEditCancel = useCallback(() => {
    setIsEditing(false);
    if (draft) {
      setIsExpanded(false);
    }
  }, [draft]);

  const isPostAuthor = userIsPostAuthor(user, post);

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

  const onEditDraft = useCallback(() => {
    if (draft) {
      setIsExpanded(true);
      setIsEditing(true);
    }
  }, [draft]);

  return (
    <div
      data-component="CommentItem"
      className={clsx(
        !borderless && "border pl-3 pt-2 mb-1",
        !borderless && (depth === 0 ? "rounded-sm " : "rounded-s-sm"),
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
        {commentsListContext?.showPostTitle && comment.post && (
          <div className="flex items-center mb-2">
            <LazyPostsTooltip
              postId={comment.post._id}
              className="overflow-hidden truncate mr-2 text-gray-600"
            >
              <Type style="bodyHeavy" className="truncate">
                <Link href={postGetPageUrl({ post: comment.post })}>
                  {comment.post.title}
                </Link>
              </Type>
            </LazyPostsTooltip>
            <Type
              style="bodyHeavy"
              className="text-primary-dark whitespace-nowrap max-sm:hidden"
            >
              <Link href={commentGetPageUrl({ comment })}>View in thread</Link>
            </Type>
          </div>
        )}
        <div className="mb-2 flex items-start gap-2">
          <div
            className={clsx(
              "max-w-full flex items-center gap-2 grow",
              !draft && "flex-wrap",
            )}
          >
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
            {!draft && !borderless && (
              <ChevronDownIcon
                className={clsx(
                  "w-4 min-w-4 box-content p-1 rounded cursor-pointer",
                  "text-gray-700 hover:bg-item-hover hover:text-gray-900",
                  "transition-transform",
                  !isExpanded && "-rotate-90",
                )}
                role="button"
                onClick={toggleExpanded}
              />
            )}
            <Type style="bodyHeavy">
              {draft && (
                <span
                  role="button"
                  onClick={onEditDraft}
                  className="cursor-pointer text-gray-600 mr-2"
                >
                  [Draft]
                </span>
              )}
              {deleted ? (
                <span className="text-gray-600">[comment deleted]</span>
              ) : (
                <UsersName user={user} className="whitespace-nowrap" />
              )}
            </Type>
            {!draft && (
              <>
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
                        {user?.displayName} is either new on the EA Forum or
                        doesn&apos;t have much karma yet
                      </Type>
                    }
                    placement="bottom"
                    tooltipClassName="max-w-[200px]! text-center"
                  >
                    <SproutIcon className="text-new-user-sprout" />
                  </Tooltip>
                )}
                <CommentDate comment={comment} />
                {comment.moderatorHat && (
                  <Type className="text-gray-600 cursor-default">
                    Moderator comment
                  </Type>
                )}
                <CommentVoteButtons comment={comment} />
                <CommentPollVote comment={comment} />
                {comment.contentsRevision && userIsAdminOrMod(currentUser) && (
                  <PangramBadge revision={comment.contentsRevision} />
                )}
                <CommentTags comment={comment} className="grow" />
              </>
            )}
            {draft && !isExpanded && (
              <Type
                role="button"
                onClick={onEditDraft}
                className="cursor-pointer grow min-w-0 truncate opacity-70"
              >
                {htmlToTextDefault(html)}
              </Type>
            )}
          </div>
          {!draft && (
            <>
              <Tooltip
                title={<Type style="bodySmall">Copy link</Type>}
                placement="bottom"
              >
                <Link
                  href={commentGetPageUrl({ comment })}
                  onClick={copyLink}
                  className="
                    flex items-center h-6 px-1 rounded text-gray-600
                    hover:bg-item-hover
                  "
                >
                  <LinkIcon className="w-[16px]" />
                </Link>
              </Tooltip>
              {currentUser && (
                <CommentTripleDotMenu
                  comment={comment}
                  onEdit={isEditing ? undefined : onEdit}
                  className="mt-[2px]"
                />
              )}
            </>
          )}
        </div>
        {!isExpanded && showPreviewWhenCollapsed && !deleted && (
          <div onClick={toggleExpanded} className="line-clamp-2 cursor-pointer">
            <CommentBody html={html} />
          </div>
        )}
        {isExpanded &&
          !deleted &&
          (isEditing ? (
            <EditComment
              commentId={comment._id}
              onSuccess={onEditSuccess}
              onCancel={onEditCancel}
              borderless
            />
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
              <CommentBody
                html={html}
                innerRef={ref}
                className={clsx(
                  "cursor-default",
                  isTruncated && "line-clamp-12",
                  retracted && "line-through",
                )}
              />
              {isTruncated && isClamped && (
                <Type
                  onClick={untruncate}
                  As="button"
                  style="bodyHeavy"
                  className="cursor-pointer text-gray-500 hover:text-gray-900 mt-1"
                >
                  Read more
                </Type>
              )}
              {repliesBlockedUntil && (
                <Type style="bodySmall" className="text-gray-600 mt-2">
                  A moderator has deactivated replies on this comment until{" "}
                  {formatLongDateWithTime(repliesBlockedUntil)}
                </Type>
              )}
              {retracted && (
                <Type style="bodySmall" className="text-gray-600 mt-2">
                  [This comment is no longer endorsed by its author]
                </Type>
              )}
              {commentIsHiddenPendingReview(comment) && !rejected && (
                <Type style="bodySmall" className="text-gray-600 mt-2">
                  [This comment will not be visible to other users until the
                  moderation team has reviewed it.]
                </Type>
              )}
            </>
          ))}
        {isExpanded && deleted && (
          <Type style="bodySmall" className="text-gray-600 italic">
            Deleted
            {deletedBy && (
              <span>
                {" "}
                by <UsersName user={user} />
              </span>
            )}
            {deletedDate && <span> on {formatLongDateWithTime(deletedDate)}</span>}
          </Type>
        )}
        {isExpanded && post && !draft && !repliesBlockedUntil && (
          <div>
            <Type
              onClick={onClickReply}
              As="button"
              style="bodyHeavy"
              className="cursor-pointer text-gray-500 hover:text-gray-900 mt-1"
            >
              Reply
            </Type>
            {isReplying && (
              <div className="bg-gray-0 rounded mt-2">
                <NewComment
                  postId={post._id}
                  parentCommentId={_id}
                  onSuccess={onReplySuccess}
                />
              </div>
            )}
          </div>
        )}
      </article>
      {loadingReplies && <Loading />}
      {children.length > 0 && (
        <div>
          {children.map((node) => (
            <CommentItem node={node} key={node.comment._id} />
          ))}
        </div>
      )}
    </div>
  );
}
