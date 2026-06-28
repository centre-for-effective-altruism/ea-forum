import type { CommentListItem } from "@/lib/comments/commentLists";
import { getVoteDownStrength, getVoteUpStrength } from "@/lib/votes/voteHelpers";
import { useVote } from "./useVote";
import ReactButtons from "./ReactButtons";
import VoteButton from "./VoteButton";
import Tooltip from "../Tooltip";
import Type from "../Type";

export default function CommentVoteButtons({
  comment,
}: Readonly<{ comment: CommentListItem }>) {
  const {
    onVote,
    onReact,
    baseScore,
    extendedScore,
    voteCount,
    voteType,
    extendedVoteType,
  } = useVote({
    collectionName: "Comments",
    document: comment,
  });
  return (
    <>
      <div
        data-component="CommentVoteButtons"
        className="inline-flex items-center -mr-[6px]"
      >
        <VoteButton
          currentVoteStrength={getVoteDownStrength(voteType)}
          direction="Downvote"
          orientation="down"
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
          className="text-gray-600 cursor-default -mx-[1px]"
        >
          <Type style="bodyMedium" As="span">
            {baseScore}
          </Type>
        </Tooltip>
        <VoteButton
          currentVoteStrength={getVoteUpStrength(voteType)}
          direction="Upvote"
          orientation="up"
          onVote={onVote}
          dimWhenNotVoted
          className="text-gray-400"
        />
      </div>
      <ReactButtons
        reactors={comment.reactors}
        extendedScore={extendedScore}
        extendedVoteType={extendedVoteType}
        onReact={onReact}
        reactClassName="-mr-0.5"
        scoreStyle="bodyMedium"
      />
    </>
  );
}
