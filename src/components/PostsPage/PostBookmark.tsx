"use client";

import { useCallback } from "react";
import { toggleBookmarkAction } from "@/lib/bookmarks/bookmarkActions";
import { useOptimisticState } from "@/lib/hooks/useOptimisticState";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import { useTracking } from "@/lib/analyticsEvents";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { usePostDisplay } from "./usePostDisplay";
import BookmarkSolidIcon from "@heroicons/react/24/solid/BookmarkIcon";
import BookmarkOutlineIcon from "@heroicons/react/24/outline/BookmarkIcon";
import Tooltip from "../Tooltip";
import Type from "../Type";

export default function PostBookmark() {
  const { captureEvent } = useTracking();
  const { currentUser } = useCurrentUser();
  const { onSignup } = useLoginPopoverContext();
  const {
    post: { _id: documentId, bookmarks },
  } = usePostDisplay();

  const {
    value: { bookmarked },
    execute,
  } = useOptimisticState(
    { bookmarked: bookmarks?.[0]?.active ?? false },
    (prev, { collectionName, documentId }) => {
      const bookmarked = !prev.bookmarked;
      captureEvent("bookmarkToggle", { collectionName, documentId, bookmarked });
      return { bookmarked };
    },
    toggleBookmarkAction,
  );

  const onToggle = useCallback(() => {
    if (currentUser) {
      void execute({ collectionName: "Posts", documentId });
    } else {
      onSignup();
    }
  }, [currentUser, onSignup, execute, documentId]);

  const label = bookmarked ? "Remove from saved items" : "Save for later";
  const Icon = bookmarked ? BookmarkSolidIcon : BookmarkOutlineIcon;
  return (
    <Tooltip title={<Type style="bodySmall">{label}</Type>}>
      <button
        data-component="PostBookmark"
        aria-label={label}
        className="
          flex items-center cursor-pointer text-gray-600 hover:text-gray-1000
        "
        onClick={onToggle}
      >
        <Icon className="w-5" />
      </button>
    </Tooltip>
  );
}
