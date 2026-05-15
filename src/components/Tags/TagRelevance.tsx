"use client";

import type { PostTag } from "@/lib/tags/tagQueries";
import { getVoteDownStrength, getVoteUpStrength } from "@/lib/votes/voteHelpers";
import { useVote } from "../Voting/useVote";
import VoteButton from "../Voting/VoteButton";
import Type from "../Type";

export default function TagRelevance({
  tag,
}: Readonly<{
  tag: PostTag;
}>) {
  const { onVote, baseScore, voteType } = useVote({
    collectionName: "TagRels",
    document: tag.tagRel,
  });
  return (
    <div className="flex items-center">
      <Type style="bodySmall" className="text-gray-600 mr-1">
        Relevance
      </Type>
      <VoteButton
        currentVoteStrength={getVoteDownStrength(voteType ?? "neutral")}
        direction="Downvote"
        orientation="left"
        onVote={onVote}
        dimWhenNotVoted
      />
      <Type style="bodySmall" className="mx-[2px]">
        {baseScore}
      </Type>
      <VoteButton
        currentVoteStrength={getVoteUpStrength(voteType ?? "neutral")}
        direction="Upvote"
        orientation="right"
        onVote={onVote}
        dimWhenNotVoted
      />
    </div>
  );
}
