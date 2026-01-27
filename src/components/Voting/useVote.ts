"use client";

import { useCallback } from "react";
import type { PostDisplay } from "@/lib/posts/postQueries";
import type { CommentsList } from "@/lib/comments/commentLists";
import { useOptimisticState } from "@/lib/hooks/useOptimisticState";
import { calculateVotePower, VoteType } from "@/lib/votes/voteHelpers";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import { useTracking } from "@/lib/analyticsEvents";
import { onVoteAction } from "@/lib/votes/voteActions";

type VoteState = {
  baseScore: number;
  voteCount: number;
  voteType: VoteType;
  showVotingPatternWarning: boolean;
};

const getInitialVoteState = (document: PostDisplay | CommentsList): VoteState => ({
  baseScore: document.baseScore,
  voteCount: document.voteCount,
  voteType: document.votes?.[0]?.voteType ?? "neutral",
  showVotingPatternWarning: false,
});

const doOptimisticVote = (
  userKarma: number,
  { baseScore, voteCount, voteType, showVotingPatternWarning }: VoteState,
  { voteType: newVoteType }: { voteType: VoteType },
): VoteState => {
  const oldPower = calculateVotePower(userKarma, voteType);
  const newPower = calculateVotePower(userKarma, newVoteType);
  const newState: VoteState = {
    baseScore: baseScore - oldPower + newPower,
    voteCount: voteCount,
    voteType: newVoteType,
    showVotingPatternWarning,
  };
  if (newVoteType === "neutral" && voteType !== "neutral") {
    newState.voteCount--;
  } else if (voteType === "neutral" && newVoteType !== "neutral") {
    newState.voteCount++;
  }
  return newState;
};

type UseVoteProps =
  | {
      collectionName: "Posts";
      document: PostDisplay;
    }
  | {
      collectionName: "Comments";
      document: CommentsList;
    };

/**
 * Frontend logic for voting on documents including optimistic client-side updates.
 */
export const useVote = ({ collectionName, document }: UseVoteProps) => {
  const { _id } = document;
  const { currentUser } = useCurrentUser();
  const { onSignup } = useLoginPopoverContext();
  const { captureEvent } = useTracking();

  const { value, execute } = useOptimisticState(
    getInitialVoteState(document),
    doOptimisticVote.bind(null, currentUser?.karma ?? 0),
    onVoteAction,
  );

  const onVote = useCallback(
    (voteType: VoteType) => {
      if (currentUser) {
        void execute({ collectionName, documentId: _id, voteType });
        captureEvent("vote", { collectionName });
      } else {
        onSignup();
      }
    },
    [currentUser, onSignup, captureEvent, execute, _id, collectionName],
  );

  return {
    ...value,
    onVote,
  };
};
