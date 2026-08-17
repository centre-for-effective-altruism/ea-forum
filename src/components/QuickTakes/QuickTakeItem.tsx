"use client";

import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { captureException } from "@sentry/nextjs";
import type { CommentListItem } from "@/lib/comments/commentLists";
import type { CommentTreeNode } from "@/lib/comments/CommentTree";
import toast from "react-hot-toast";
import { rpc } from "@/lib/rpc";
import { userGetProfileUrl } from "@/lib/users/userHelpers";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { CommentsListProvider, useCommentsList } from "../Comments/useCommentsList";
import { InteractionWrapper, useClickableCell } from "@/lib/hooks/useClickableCell";
import ChatBubbleLeftIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import CommentTripleDotMenu from "../Comments/CommentTripleDotMenu";
import CommentAwardButton from "../Voting/CommentAwardButton";
import CommentBody from "../ContentStyles/CommentBody";
import CommentsList from "../Comments/CommentsList";
import CommentDate from "../Comments/CommentDate";
import CommentTags from "../Tags/CommentTags";
import UsersTooltip from "../UsersTooltip";
import Score from "../Score";
import Type from "../Type";
import Link from "../Link";

const QuickTakeItemInner: FC<{
  quickTake: CommentListItem;
}> = ({ quickTake }) => {
  const commentList = useCommentsList();
  const { currentUser } = useCurrentUser();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState<"no" | "yes" | "finished">("no");
  const { onClick } = useClickableCell({
    onClick: () => setExpanded(true),
  });

  useEffect(() => {
    if (expanded && loading === "no") {
      void (async () => {
        try {
          setLoading("yes");
          const replies = await rpc.comments.listReplies({
            commentId: quickTake._id,
          });
          commentList.addComments(replies);
          setLoading("finished");
        } catch (e) {
          captureException(e);
          console.error(e);
          toast.error("Error fetching replies to quick take");
          setLoading("no");
        }
      })();
    }
  }, [commentList, quickTake._id, expanded, loading]);

  const onToggleExpanded = useCallback(
    (expanded: boolean, node: CommentTreeNode<CommentListItem>) => {
      if (node.depth === 0) {
        setExpanded(expanded);
      }
    },
    [],
  );

  if (expanded) {
    return (
      <CommentsList
        loadingReplies={loading === "yes"}
        onToggleExpanded={onToggleExpanded}
      />
    );
  }

  const { baseScore, voteCount, user, descendentCount, html } = quickTake;
  return (
    <article
      data-component="QuickTakeItem"
      onClick={onClick}
      className="
        max-w-full rounded bg-comment-even border border-comment-border px-4 py-3
        cursor-pointer mb-1
      "
    >
      <div className="flex flex-row gap-2 items-center mb-2 text-gray-600">
        <Score
          baseScore={baseScore}
          voteCount={voteCount}
          orientation="horizontal"
        />
        <Type style="body" className="text-gray-1000 font-[700]">
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
        <div className="grow">
          <CommentTags comment={quickTake} />
        </div>
        <CommentAwardButton comment={quickTake} />
        {descendentCount > 0 && (
          <Type
            style="body"
            className="flex flex-row gap-1 cursor-pointer hover:text-gray-1000"
          >
            <ChatBubbleLeftIcon className="w-[16px]" />
            {descendentCount}
          </Type>
        )}
        {currentUser && (
          <InteractionWrapper className="flex items-center">
            <CommentTripleDotMenu comment={quickTake} small />
          </InteractionWrapper>
        )}
      </div>
      <CommentBody html={html} className="line-clamp-2" />
    </article>
  );
};

export default function QuickTakeItem({
  quickTake,
}: Readonly<{
  quickTake: CommentListItem;
}>) {
  const comments = useMemo(() => [quickTake], [quickTake]);
  return (
    <CommentsListProvider comments={comments}>
      <QuickTakeItemInner quickTake={quickTake} />
    </CommentsListProvider>
  );
}
