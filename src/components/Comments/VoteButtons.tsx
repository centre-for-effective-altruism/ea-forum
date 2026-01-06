import type { CommentsList } from "@/lib/comments/commentLists";
import type { VoteType } from "@/lib/actions/voteActions";
import VoteButton from "./VoteButton";
import Tooltip from "../Tooltip";
import Type from "../Type";

// TODO
// eslint-disable-next-line no-console
const onVote = (voteType: VoteType) => console.log("vote", voteType);

export default function VoteButtons({
  comment,
}: Readonly<{
  comment: CommentsList;
}>) {
  const { baseScore, voteCount, votes } = comment;
  const currentUserVote = votes?.[0] ?? null;
  // TODO
  // eslint-disable-next-line no-console
  console.log("MARK", currentUserVote);
  return (
    <div
      data-component="VoteButtons"
      className="
        inline-flex items-center h-[22px] px-2
        rounded-sm border-1 border-comment-border
      "
    >
      <VoteButton
        currentVoteType="neutral"
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
        currentVoteType="neutral"
        direction="Upvote"
        orientation="right"
        onVote={onVote}
      />
    </div>
  );
}
