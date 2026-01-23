import { useCallback, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import type { CommentsList } from "@/lib/comments/commentLists";
import { calculateVotePower, VoteType } from "@/lib/votes/voteHelpers";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import { useTracking } from "@/lib/analyticsEvents";
import { onVoteAction } from "@/lib/votes/voteActions";

type VoteState = {
  baseScore: number;
  voteCount: number;
  currentUserVoteType: VoteType;
  showVotingPatternWarning: boolean;
};

type VoteStateUpdate = {
  voteType: VoteType;
  userKarma: number;
};

const getInitialVoteState = (comment: CommentsList): VoteState => ({
  baseScore: comment.baseScore,
  voteCount: comment.voteCount,
  currentUserVoteType: (comment.votes?.[0]?.voteType as VoteType) ?? "neutral",
  showVotingPatternWarning: false,
});

const doOptimisticVote = (
  { baseScore, voteCount, currentUserVoteType, showVotingPatternWarning }: VoteState,
  { voteType, userKarma }: VoteStateUpdate,
): VoteState => {
  const oldPower = calculateVotePower(userKarma, currentUserVoteType);
  const newPower = calculateVotePower(userKarma, voteType);
  const newState: VoteState = {
    baseScore: baseScore - oldPower + newPower,
    voteCount: voteCount,
    currentUserVoteType: voteType,
    showVotingPatternWarning,
  };
  if (voteType === "neutral" && currentUserVoteType !== "neutral") {
    newState.voteCount--;
  } else if (currentUserVoteType === "neutral" && voteType !== "neutral") {
    newState.voteCount++;
  }
  return newState;
};

/**
 * Frontend logic for voting on documents including optimistic client-side updates.
 * TODO: This currently only support comments.
 */
export const useVote = (comment: CommentsList) => {
  const { _id } = comment;
  const { currentUser } = useCurrentUser();
  const { onSignup } = useLoginPopoverContext();
  const { captureEvent } = useTracking();
  const [_isPending, startTransition] = useTransition();
  const [vote, setVote] = useState(() => getInitialVoteState(comment));
  const requestIdRef = useRef(0);

  const onVote = useCallback(
    (voteType: VoteType) => {
      if (!currentUser) {
        onSignup();
        return;
      }

      // Save the previous vote in case an error is thrown
      let previousVote: VoteState;
      setVote((prev) => {
        previousVote = prev;
        return doOptimisticVote(prev, { voteType, userKarma: currentUser.karma });
      });

      const collectionName = "Comments";
      requestIdRef.current++;
      const requestId = requestIdRef.current;
      startTransition(async () => {
        try {
          const { data: result } = await onVoteAction({
            collectionName,
            documentId: _id,
            voteType,
          });
          if (requestId === requestIdRef.current && result) {
            setVote({
              baseScore: result.baseScore,
              voteCount: result.voteCount,
              currentUserVoteType: result.voteType,
              showVotingPatternWarning: result.showVotingPatternWarning,
            });
          }
        } catch (e) {
          console.error("Vote error:", e);
          if (requestId === requestIdRef.current) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
            setVote(previousVote);
          }
        }
      });

      captureEvent("vote", { collectionName });
    },
    [currentUser, onSignup, captureEvent, startTransition, _id],
  );

  return {
    ...vote,
    onVote,
  };
};
