"use client";

import { useUpdateBookmark } from "@/lib/hooks/useUpdateBookmark";
import { usePostDisplay } from "./usePostDisplay";
import BookmarkSolidIcon from "@heroicons/react/24/solid/BookmarkIcon";
import BookmarkOutlineIcon from "@heroicons/react/24/outline/BookmarkIcon";
import Tooltip from "../Tooltip";
import Type from "../Type";

export default function PostBookmark() {
  const {
    post: { _id, bookmarks },
  } = usePostDisplay();
  const { isBookmarked, toggleIsBookmarked } = useUpdateBookmark(
    "Posts",
    _id,
    bookmarks?.[0]?.active ?? false,
  );
  const label = isBookmarked ? "Remove from saved items" : "Save for later";
  const Icon = isBookmarked ? BookmarkSolidIcon : BookmarkOutlineIcon;
  return (
    <Tooltip title={<Type style="bodySmall">{label}</Type>} offsetPx={8}>
      <button
        data-component="PostBookmark"
        aria-label={label}
        className="
          flex items-center cursor-pointer text-gray-600
          rounded p-1.5 hover:bg-gray-200 hover:text-gray-800
        "
        onClick={toggleIsBookmarked}
      >
        <Icon className="w-5" />
      </button>
    </Tooltip>
  );
}
