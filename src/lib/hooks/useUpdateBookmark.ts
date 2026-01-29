"use client";

import { useCallback } from "react";
import { useTracking } from "../analyticsEvents";
import { toggleBookmarkAction } from "../bookmarks/bookmarkActions";
import { useCurrentUser } from "./useCurrentUser";
import { useLoginPopoverContext } from "./useLoginPopoverContext";
import { useOptimisticState } from "@/lib/hooks/useOptimisticState";

export const useUpdateBookmark = (
  collectionName: "Posts" | "Comments",
  documentId: string,
  initialIsBookmarked: boolean,
) => {
  const { captureEvent } = useTracking();
  const { currentUser } = useCurrentUser();
  const { onSignup } = useLoginPopoverContext();

  const {
    value: { bookmarked },
    execute,
  } = useOptimisticState(
    { bookmarked: initialIsBookmarked },
    (prev, { collectionName, documentId }) => {
      const bookmarked = !prev.bookmarked;
      captureEvent("bookmarkToggle", { collectionName, documentId, bookmarked });
      return { bookmarked };
    },
    toggleBookmarkAction,
  );

  const toggleIsBookmarked = useCallback(async () => {
    if (currentUser) {
      await execute({ collectionName, documentId });
    } else {
      onSignup();
    }
  }, [currentUser, onSignup, execute, collectionName, documentId]);

  return { isBookmarked: bookmarked, toggleIsBookmarked };
};
