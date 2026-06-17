import { useCallback } from "react";
import toast from "react-hot-toast";
import type { CommentListItem } from "../comments/commentLists";
import { rpc } from "../rpc";
import { useCurrentUser } from "./useCurrentUser";
import { useOptimisticState } from "./useOptimisticState";
import { userCanDo, userOwns } from "../users/userHelpers";
import { userCanPinCommentOnProfile } from "../comments/commentHelpers";
import { useOptionalCommentsList } from "@/components/Comments/useCommentsList";
import { captureException } from "@sentry/nextjs";

export const usePinCommentOnProfile = (comment: CommentListItem) => {
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

export const useQuickTakeFrontpage = (comment: CommentListItem) => {
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

export const useRetractComment = (comment: CommentListItem) => {
  const { currentUser } = useCurrentUser();
  const commentsList = useOptionalCommentsList();
  const toggleRetracted = useCallback(async () => {
    const toastId = toast.loading(`Updating comment...`);
    try {
      const updatedComment = await rpc.comments.toggleRetracted({
        commentId: comment._id,
      });
      commentsList?.updateComment(updatedComment);
      toast.success(
        updatedComment.retracted ? "Retracted comment" : "Unretracted comment",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      captureException(e);
    }
    toast.remove(toastId);
  }, [commentsList, comment]);
  return {
    isRetracted: comment.retracted,
    toggleRetracted:
      currentUser && currentUser._id === comment.user?._id ? toggleRetracted : null,
  };
};
