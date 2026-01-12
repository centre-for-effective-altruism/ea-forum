import type { CommentsList } from "@/lib/comments/commentLists";
import { getVoteDownStrength, getVoteUpStrength } from "@/lib/votes/voteHelpers";
import { useVote } from "./useVote";
import VoteButton from "./VoteButton";
import Tooltip from "../Tooltip";
import Type from "../Type";

export default function VoteButtons({
  comment,
}: Readonly<{ comment: CommentsList }>) {
  const { onVote, baseScore, voteCount, currentUserVoteType } = useVote(comment);
  return (
    <div
      data-component="VoteButtons"
      className="
        inline-flex items-center h-[22px] px-2
        rounded-sm border-1 border-comment-border
      "
    >
      <VoteButton
        currentVoteStrength={getVoteDownStrength(currentUserVoteType)}
        direction="Downvote"
        orientation="left"
        onVote={onVote}
      />
      <Tooltip
        title={
          <Type>
            This comment has {baseScore} <strong>overall</strong> karma ({voteCount}{" "}
            vote{voteCount === 1 ? "" : "s"})
          </Type>
        }
        className="text-[14px] font-500 text-gray-600"
      >
        {baseScore}
      </Tooltip>
      <VoteButton
        currentVoteStrength={getVoteUpStrength(currentUserVoteType)}
        direction="Upvote"
        orientation="right"
        onVote={onVote}
      />
    </div>
  );
}
