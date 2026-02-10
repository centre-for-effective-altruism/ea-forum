"use client";

import { usePostDisplay } from "../PostsPage/usePostDisplay";
import { getVoteDownStrength, getVoteUpStrength } from "@/lib/votes/voteHelpers";
import ReactButtons from "./ReactButtons";
import VoteButton from "./VoteButton";
import Tooltip from "../Tooltip";
import Type from "../Type";

export default function PostVoteButtons() {
  const {
    post: { reactors },
    vote: {
      onVote,
      onReact,
      baseScore,
      extendedScore,
      voteCount,
      voteType,
      extendedVoteType,
    },
  } = usePostDisplay();
  return (
    <div data-component="PostVoteButtons" className="flex items-center gap-1">
      <VoteButton
        currentVoteStrength={getVoteDownStrength(voteType)}
        direction="Downvote"
        orientation="down"
        onVote={onVote}
        large
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
        <Type style="bodyMedium" className="text-[16px] cursor-default">
          {baseScore}
        </Type>
      </Tooltip>
      <VoteButton
        currentVoteStrength={getVoteUpStrength(voteType)}
        direction="Upvote"
        orientation="up"
        onVote={onVote}
        large
        className="text-gray-600"
      />
      <ReactButtons
        reactors={reactors}
        extendedScore={extendedScore}
        extendedVoteType={extendedVoteType}
        onReact={onReact}
        className="ml-3"
      />
    </div>
  );
}
