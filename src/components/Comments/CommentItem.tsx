"use client";

import { useCallback, useState } from "react";
import type { CommentsList } from "@/lib/comments/commentLists";
import type { CommentTreeNode } from "@/lib/comments/CommentTree";
import { formatLongDateWithTime, formatRelativeTime } from "@/lib/timeUtils";
import {
  userGetProfileUrl,
  userIsNew,
  userIsPostAuthor,
} from "@/lib/users/userHelpers";
import clsx from "clsx";
import ChevronDownIcon from "@heroicons/react/16/solid/ChevronDownIcon";
import EllipsisVerticalIcon from "@heroicons/react/24/solid/EllipsisVerticalIcon";
import LinkIcon from "@heroicons/react/16/solid/LinkIcon";
import SproutIcon from "../Icons/SproutIcon";
import AuthorIcon from "../Icons/AuthorIcon";
import CommentVoteButtons from "../Voting/CommentVoteButtons";
import CommentBody from "../ContentStyles/CommentBody";
import UsersTooltip from "../UsersTooltip";
import Tooltip from "../Tooltip";
import Type from "../Type";
import Link from "../Link";

export default function CommentItem({
  node: { comment, depth, children },
  borderless,
  className,
}: Readonly<{
  node: CommentTreeNode<CommentsList>;
  /**
   * Don't render a border or outside padding - used for embedding in another
   * component.
   */
  borderless?: boolean;
  className?: string;
}>) {
  const [expanded, setExpanded] = useState(true);
  const toggleExpanded = useCallback(() => {
    setExpanded((expanded) => !expanded);
  }, []);
  const { _id, user, html, postedAt, post } = comment;
  const isPostAuthor = userIsPostAuthor(user, post);
  const isNew =
    !!post?.readStatus?.[0]?.lastUpdated &&
    new Date(post?.readStatus?.[0]?.lastUpdated) < new Date(postedAt);
  return (
    <div
      data-component="CommentItem"
      className={clsx(
        !borderless &&
          "border border-(--color-comment-border) rounded-sm pl-3 pt-2 mb-1",
        !borderless && depth & 1
          ? "bg-(--color-comment-odd)"
          : "bg-(--color-comment-even)",
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
          <Tooltip title={<Type>{formatLongDateWithTime(postedAt)}</Type>}>
            <Type className="text-gray-600">
              {formatRelativeTime(postedAt, { style: "short" })}
            </Type>
          </Tooltip>
          <CommentVoteButtons comment={comment} className="grow" />
          <Link href={`#${_id}`}>
            <LinkIcon className="w-[16px] text-gray-600 hover:opacity-70" />
          </Link>
          <EllipsisVerticalIcon
            className="cursor-pointer w-[20px] text-gray-600 hover:opacity-70"
            role="button"
          />
        </div>
        {expanded && <CommentBody html={html} />}
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
