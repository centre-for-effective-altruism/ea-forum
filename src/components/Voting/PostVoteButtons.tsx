"use client";

import type { PostDisplay } from "@/lib/posts/postQueries";
import { getVoteDownStrength, getVoteUpStrength } from "@/lib/votes/voteHelpers";
import { useVote } from "./useVote";
import VoteButton from "./VoteButton";
import Tooltip from "../Tooltip";
import Type from "../Type";

export default function PostVoteButtons({
  post,
}: Readonly<{
  post: PostDisplay;
}>) {
  const { onVote, baseScore, voteCount, currentUserVoteType } = useVote({
    collectionName: "Posts",
    document: post,
  });
  return (
    <div data-component="PostVoteButtons" className="flex items-center gap-1">
      <VoteButton
        currentVoteStrength={getVoteDownStrength(currentUserVoteType)}
        direction="Downvote"
        orientation="down"
        onVote={onVote}
        size={20}
        className="text-gray-600"
      />
      <Tooltip
        title={
          <Type>
            This post has {baseScore} karma ({voteCount} vote
            {voteCount === 1 ? "" : "s"})
          </Type>
        }
        className="text-[14px] font-500 text-gray-600"
      >
        <Type style="bodyMedium" className="text-[16px]">
          {baseScore}
        </Type>
      </Tooltip>
      <VoteButton
        currentVoteStrength={getVoteUpStrength(currentUserVoteType)}
        direction="Upvote"
        orientation="up"
        onVote={onVote}
        size={20}
        className="text-gray-600"
      />
    </div>
  );
}
