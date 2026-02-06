import type { CommentsList } from "../comments/commentLists";
import { useCurrentUser } from "./useCurrentUser";
import { useOptimisticState } from "./useOptimisticState";
import { updateCommentPinnedOnProfileAction } from "../comments/commentActions";
import { userCanPinCommentOnProfile } from "../comments/commentHelpers";
import { useCallback } from "react";

export const usePinCommentOnProfile = (comment: CommentsList) => {
  const { currentUser } = useCurrentUser();
  const {
    value: { isPinnedOnProfile },
    execute,
  } = useOptimisticState(
    { isPinnedOnProfile: comment.isPinnedOnProfile },
    ({ isPinnedOnProfile }) => ({ isPinnedOnProfile: !isPinnedOnProfile }),
    updateCommentPinnedOnProfileAction,
  );
  const toggleIsPinnedOnProfile = useCallback(
    () => execute({ commentId: comment._id, pinned: !isPinnedOnProfile }),
    [execute, comment._id, isPinnedOnProfile],
  );
  return {
    isPinnedOnProfile,
    toggleIsPinnedOnProfile: userCanPinCommentOnProfile(currentUser, comment)
      ? toggleIsPinnedOnProfile
      : null,
  };
};
