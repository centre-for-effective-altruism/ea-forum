"use client";

import { useState } from "react";
import type { CommentsList } from "@/lib/comments/commentLists";
import { userGetProfileUrl } from "@/lib/users/userHelpers";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { InteractionWrapper, useClickableCell } from "@/lib/hooks/useClickableCell";
import ChatBubbleLeftIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import CommentTripleDotMenu from "../Comments/CommentTripleDotMenu";
import CommentBody from "../ContentStyles/CommentBody";
import CommentItem from "../Comments/CommentItem";
import CommentDate from "../Comments/CommentDate";
import UsersTooltip from "../UsersTooltip";
import Score from "../Score";
import Type from "../Type";
import Link from "../Link";

export default function QuickTakeItem({
  quickTake,
}: Readonly<{
  quickTake: CommentsList;
}>) {
  const { currentUser } = useCurrentUser();
  const [expanded, setExpanded] = useState(false);
  const { onClick } = useClickableCell({
    onClick: () => setExpanded(true),
  });

  if (expanded) {
    return (
      <CommentItem
        node={{ comment: quickTake, depth: 0, children: [], isLocal: false }}
        onToggleExpanded={() => setExpanded(false)}
      />
    );
  }

  const { baseScore, voteCount, user, descendentCount, html } = quickTake;
  return (
    <article
      data-component="QuickTakeItem"
      onClick={onClick}
      className="
        max-w-full rounded bg-gray-50 border border-gray-100 px-4 py-3
        cursor-pointer
      "
    >
      <div className="flex flex-row gap-2 items-center mb-2 text-gray-600">
        <Score baseScore={baseScore} voteCount={voteCount} orient="horizontal" />
        <Type style="body" className="text-black font-[700]">
          {user ? (
            <InteractionWrapper>
              <Link href={userGetProfileUrl({ user })}>
                <UsersTooltip As="span" user={user}>
                  {user.displayName}
                </UsersTooltip>
              </Link>
            </InteractionWrapper>
          ) : (
            "[Anonymous]"
          )}
        </Type>
        <CommentDate comment={quickTake} />
        <div className="grow" />
        <Type
          style="body"
          className="flex flex-row gap-1 cursor-pointer hover:text-black"
        >
          <ChatBubbleLeftIcon className="w-[16px]" />
          {descendentCount}
        </Type>
        {currentUser && (
          <InteractionWrapper className="flex items-center">
            <CommentTripleDotMenu comment={quickTake} small />
          </InteractionWrapper>
        )}
      </div>
      <CommentBody html={html} className="line-clamp-2" />
    </article>
  );
}
