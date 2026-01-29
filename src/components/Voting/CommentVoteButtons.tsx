import type { CommentsList } from "@/lib/comments/commentLists";
import { getVoteDownStrength, getVoteUpStrength } from "@/lib/votes/voteHelpers";
import { useVote } from "./useVote";
import VoteButton from "./VoteButton";
import Tooltip from "../Tooltip";
import Type from "../Type";

export default function CommentVoteButtons({
  comment,
}: Readonly<{ comment: CommentsList }>) {
  const { onVote, baseScore, voteCount, voteType } = useVote({
    collectionName: "Comments",
    document: comment,
  });
  return (
    <div
      data-component="CommentVoteButtons"
      className="
        inline-flex items-center h-[22px] px-2
        rounded-sm border-1 border-comment-border
      "
    >
      <VoteButton
        currentVoteStrength={getVoteDownStrength(voteType)}
        direction="Downvote"
        orientation="left"
        onVote={onVote}
        dimWhenNotVoted
        className="text-gray-400"
      />
      <Tooltip
        title={
          <Type>
            This comment has {baseScore} karma ({voteCount} vote
            {voteCount === 1 ? "" : "s"})
          </Type>
        }
        className="text-[14px] font-500 text-gray-600"
      >
        {baseScore}
      </Tooltip>
      <VoteButton
        currentVoteStrength={getVoteUpStrength(voteType)}
        direction="Upvote"
        orientation="right"
        onVote={onVote}
        dimWhenNotVoted
        className="text-gray-400"
      />
    </div>
  );
}
