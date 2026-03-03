import { useCallback } from "react";
import type { CommentsList } from "../comments/commentLists";
import { rpc } from "../rpc";
import { useCurrentUser } from "./useCurrentUser";
import { useOptimisticState } from "./useOptimisticState";
import { userCanDo, userOwns } from "../users/userHelpers";
import { userCanPinCommentOnProfile } from "../comments/commentHelpers";

export const usePinCommentOnProfile = (comment: CommentsList) => {
  const { currentUser } = useCurrentUser();
  const {
    value: { isPinnedOnProfile },
    execute,
  } = useOptimisticState(
    { isPinnedOnProfile: comment.isPinnedOnProfile },
    ({ isPinnedOnProfile }) => ({ isPinnedOnProfile: !isPinnedOnProfile }),
    rpc.comments.updatePinnedOnProfile,
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

export const useQuickTakeFrontpage = (comment: CommentsList) => {
  const { currentUser } = useCurrentUser();
  const {
    value: { shortformFrontpage },
    execute,
  } = useOptimisticState(
    { shortformFrontpage: comment.shortformFrontpage },
    ({ shortformFrontpage }) => ({ shortformFrontpage: !shortformFrontpage }),
    rpc.comments.updateQuickTakeFrontpage,
  );
  const toggleQuickTakeFrontpage = useCallback(
    () => execute({ commentId: comment._id, frontpage: !shortformFrontpage }),
    [execute, comment._id, shortformFrontpage],
  );
  const canToggle =
    comment.shortform &&
    (userCanDo(currentUser, "comments.edit.all") || userOwns(currentUser, comment));
  return {
    isQuickTakeFrontpage: shortformFrontpage,
    toggleQuickTakeFrontpage: canToggle ? toggleQuickTakeFrontpage : null,
  };
};
