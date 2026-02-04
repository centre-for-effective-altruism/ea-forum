"use client";

import { useCallback } from "react";
import type { PostDisplay } from "@/lib/posts/postQueries";
import type { CommentsList } from "@/lib/comments/commentLists";
import { useOptimisticState } from "@/lib/hooks/useOptimisticState";
import { calculateVotePower, VoteType } from "@/lib/votes/voteHelpers";
import { getReactionMutuallyExclusivePartner } from "@/lib/votes/reactions";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useTracking } from "@/lib/analyticsEvents";
import { onVoteAction } from "@/lib/votes/voteActions";

type VoteState = {
  baseScore: number;
  voteCount: number;
  extendedScore: Record<string, number>;
  voteType: VoteType;
  extendedVoteType?: Record<string, boolean>;
  showVotingPatternWarning: boolean;
};

type VoteStateUpdate = Parameters<typeof onVoteAction>[0];

const getInitialVoteState = (document: PostDisplay | CommentsList): VoteState => ({
  baseScore: document.baseScore,
  voteCount: document.voteCount,
  extendedScore: document.extendedScore ?? {},
  voteType: document.votes?.[0]?.voteType ?? "neutral",
  extendedVoteType: document.votes?.[0]?.extendedVoteType ?? undefined,
  showVotingPatternWarning: false,
});

const doOptimisticVote = (
  userKarma: number,
  {
    baseScore,
    voteCount,
    extendedScore,
    voteType,
    extendedVoteType,
    showVotingPatternWarning,
  }: VoteState,
  { voteType: newVoteType, extendedVoteType: newExtendedVoteType }: VoteStateUpdate,
): VoteState => {
  const allReactions = new Set([
    ...Object.keys(extendedVoteType ?? {}),
    ...Object.keys(newExtendedVoteType ?? {}),
  ]);
  const newExtendedScore = { ...extendedScore };
  for (const reaction of allReactions) {
    const before = extendedVoteType?.[reaction] ?? false;
    const after = newExtendedVoteType?.[reaction] ?? false;
    if (before && !after) {
      newExtendedScore[reaction] = Math.max(0, (extendedScore?.[reaction] ?? 0) - 1);
    } else if (after && !before) {
      newExtendedScore[reaction] = (extendedScore?.[reaction] ?? 0) + 1;
    }
  }
  const oldPower = calculateVotePower(userKarma, voteType);
  const newPower = calculateVotePower(userKarma, newVoteType);
  const newState: VoteState = {
    baseScore: baseScore - oldPower + newPower,
    voteCount: voteCount,
    extendedScore: newExtendedScore,
    voteType: newVoteType,
    extendedVoteType: newExtendedVoteType,
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

export type UseVoteResult = VoteState & {
  onVote: (voteType: VoteType) => void;
  onReact: (reactionName: string) => void;
};

/**
 * Frontend logic for voting on documents including optimistic client-side updates.
 */
export const useVote = ({
  collectionName,
  document,
}: UseVoteProps): UseVoteResult => {
  const { _id } = document;
  const { currentUser } = useCurrentUser();
  const { onSignup } = useLoginPopoverContext();
  const { captureEvent } = useTracking();

  const { value, execute } = useOptimisticState<VoteState, VoteStateUpdate>(
    getInitialVoteState(document),
    doOptimisticVote.bind(null, currentUser?.karma ?? 0),
    onVoteAction,
  );

  const onVote = useCallback(
    (voteType: VoteType) => {
      if (!currentUser) {
        onSignup();
      }
      void execute({
        collectionName,
        documentId: _id,
        voteType,
        extendedVoteType: value.extendedVoteType,
      });
      captureEvent("vote", { collectionName });
    },
    [currentUser, onSignup, captureEvent, execute, value, _id, collectionName],
  );

  const onReact = useCallback(
    (reactionName: string) => {
      if (!currentUser) {
        onSignup();
        return;
      }

      const newExtendedVoteType: Record<string, boolean> = {
        ...(value.extendedVoteType ?? {}),
        [reactionName]: !value.extendedVoteType?.[reactionName],
      };
      const partner = getReactionMutuallyExclusivePartner(reactionName);
      if (partner && newExtendedVoteType[reactionName]) {
        newExtendedVoteType[partner] = false;
      }

      void execute({
        collectionName,
        documentId: _id,
        voteType: value.voteType,
        extendedVoteType: newExtendedVoteType,
      });

      const event = newExtendedVoteType[reactionName] ? "react" : "unreact";
      captureEvent(event, { collectionName, reactionName });
    },
    [currentUser, onSignup, value, collectionName, _id, execute, captureEvent],
  );

  return {
    ...value,
    onVote,
    onReact,
  };
};
