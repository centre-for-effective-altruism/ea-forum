"use client";

import { useCallback } from "react";
import { useItemsRead } from "./useItemsRead";
import { useCurrentUser } from "./useCurrentUser";
import { useLoginPopoverContext } from "./useLoginPopoverContext";
import { updatePostReadStatusAction } from "../readStatuses/readStatusActions";

export const useUpdateReadStatus = (postId: string, initialIsRead: boolean) => {
  const { postsRead, setPostRead } = useItemsRead();
  const isRead = !!(postId in postsRead ? postsRead[postId] : initialIsRead);
  const { currentUser } = useCurrentUser();
  const { onSignup } = useLoginPopoverContext();

  const toggleIsRead = useCallback(() => {
    if (!currentUser) {
      onSignup();
      return;
    }
    const newIsRead = !isRead;
    setPostRead(postId, newIsRead);
    void updatePostReadStatusAction({ postId, isRead: newIsRead });
  }, [currentUser, onSignup, setPostRead, postId, isRead]);

  return { isRead, toggleIsRead };
};
