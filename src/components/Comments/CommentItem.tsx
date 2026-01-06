"use client";

import { useCallback, useState } from "react";
import type { CommentsList } from "@/lib/comments/commentLists";
import type { CommentTreeNode } from "@/lib/CommentTree";
import { userGetProfileUrl } from "@/lib/users/userHelpers";
import { formatLongDateWithTime, formatRelativeTime } from "@/lib/timeUtils";
import ChevronDownIcon from "@heroicons/react/16/solid/ChevronDownIcon";
import EllipsisVerticalIcon from "@heroicons/react/24/solid/EllipsisVerticalIcon";
import LinkIcon from "@heroicons/react/16/solid/LinkIcon";
import CommentBody from "../ContentStyles/CommentBody";
import UsersTooltip from "../UsersTooltip";
import VoteButtons from "./VoteButtons";
import Type from "../Type";
import Link from "../Link";
import Tooltip from "../Tooltip";

export default function CommentItem({
  node: { comment, depth, children },
}: Readonly<{
  node: CommentTreeNode<CommentsList>;
}>) {
  const [expanded, setExpanded] = useState(true);
  const toggleExpanded = useCallback(() => {
    setExpanded((expanded) => !expanded);
  }, []);
  const { _id, user, html, postedAt } = comment;
  return (
    <div
      data-component="CommentItem"
      className={`
        border border-(--color-comment-border) rounded-sm pl-3 pt-2 mb-1
        ${depth & 1 ? "bg-(--color-comment-odd)" : "bg-(--color-comment-even)"}
        ${depth === 0 ? "" : "border-r-0"}
      `}
    >
      <article id={_id} data-depth={depth} className="pr-3 mb-2">
        <div className="mb-2 flex items-center gap-2">
          <ChevronDownIcon
            className={`
              w-[16px] cursor-pointer text-gray-600 hover:opacity-70
              ${!expanded && "-rotate-90"} transition-transform
            `}
            role="button"
            onClick={toggleExpanded}
          />
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <UsersTooltip user={user as any /* TODO types */}>
            <Type className="font-[600]">
              {user && user.slug && (
                <Link href={userGetProfileUrl(user)}>{user.displayName}</Link>
              )}
            </Type>
          </UsersTooltip>
          <Tooltip title={<Type>{formatLongDateWithTime(postedAt)}</Type>}>
            <Type className="text-gray-600">
              {formatRelativeTime(postedAt, { style: "short" })}
            </Type>
          </Tooltip>
          <div className="flex items-center grow">
            <VoteButtons comment={comment} />
          </div>
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
