"use client";

import { useCallback, useState } from "react";
import type { PostDisplay } from "@/lib/posts/postQueries";
import type { PostListItem } from "@/lib/posts/postLists";
import { usePostAnalyticsLink, usePostEditLink } from "@/lib/hooks/usePostLinks";
import { useUpdateBookmark } from "@/lib/hooks/useUpdateBookmark";
import { useUpdateReadStatus } from "@/lib/hooks/useUpdateReadStatus";
import {
  useSetAsQuickTakesPost,
  useSuggestForCurated,
} from "@/lib/hooks/usePostModerationActions";
import clsx from "clsx";
import PencilIcon from "@heroicons/react/24/outline/PencilIcon";
import ChartBarIcon from "@heroicons/react/24/outline/ChartBarIcon";
import EllipsisHorizontalIcon from "@heroicons/react/24/outline/EllipsisHorizontalIcon";
import EllipsisVerticalIcon from "@heroicons/react/24/outline/EllipsisVerticalIcon";
import BookmarkSolidIcon from "@heroicons/react/24/solid/BookmarkIcon";
import BookmarkOutlineIcon from "@heroicons/react/24/outline/BookmarkIcon";
import ExclamationCircleIcon from "@heroicons/react/24/outline/ExclamationCircleIcon";
import EnvelopeIcon from "@heroicons/react/24/outline/EnvelopeIcon";
import EnvelopeOpenIcon from "@heroicons/react/24/outline/EnvelopeOpenIcon";
import StarIcon from "@heroicons/react/24/outline/StarIcon";
import StarSolidIcon from "@heroicons/react/24/solid/StarIcon";
import DropdownMenu from "../Dropdown/DropdownMenu";
import ReportPopover from "./ReportPopover";

export default function PostTripleDotMenu({
  post,
  orientation,
  hideBookmark,
  className,
}: Readonly<{
  post: PostDisplay | PostListItem;
  orientation: "vertical" | "horizontal";
  hideBookmark?: boolean;
  className?: string;
}>) {
  const [reportOpen, setReportOpen] = useState(false);
  const editLink = usePostEditLink(post);
  const analyticsLink = usePostAnalyticsLink(post);
  const { isBookmarked, toggleIsBookmarked } = useUpdateBookmark(
    "Posts",
    post._id,
    post.bookmarks?.[0]?.active ?? false,
  );
  const { isRead, toggleIsRead } = useUpdateReadStatus(
    post._id,
    !!post.readStatus?.[0]?.isRead,
  );
  const { hasSuggestedForCuration, toggleSuggestedForCuration } =
    useSuggestForCurated(post);
  const setAsQuickTakesPost = useSetAsQuickTakesPost(post);

  const openReport = useCallback(() => setReportOpen(true), []);
  const closeReport = useCallback(() => setReportOpen(false), []);

  // TODO: See PostActions.tsx
  // resync RSS
  // duplicate event
  // subscriptions
  // hide from frontpage
  // edit tags
  // move to draft
  // delete draft
  // move to frontpage
  // exclude from recommendations
  // approve new user

  const TripleDotIcon =
    orientation === "horizontal" ? EllipsisHorizontalIcon : EllipsisVerticalIcon;
  return (
    <>
      <DropdownMenu
        placement="bottom-end"
        className="text-gray-900 min-w-[200px]"
        items={[
          editLink
            ? {
                title: "Edit",
                Icon: PencilIcon,
                href: editLink,
              }
            : null,
          analyticsLink
            ? {
                title: "Analytics",
                Icon: ChartBarIcon,
                href: analyticsLink,
              }
            : null,
          hideBookmark
            ? null
            : {
                title: isBookmarked ? "Saved" : "Save",
                Icon: isBookmarked ? BookmarkSolidIcon : BookmarkOutlineIcon,
                onClick: toggleIsBookmarked,
              },
          {
            title: "Report",
            Icon: ExclamationCircleIcon,
            onClick: openReport,
          },
          {
            title: isRead ? "Mark as unread" : "Mark as read",
            Icon: isRead ? EnvelopeIcon : EnvelopeOpenIcon,
            onClick: toggleIsRead,
          },
          toggleSuggestedForCuration
            ? {
                title: hasSuggestedForCuration
                  ? "Unsuggest curation"
                  : "Suggest curation",
                Icon: hasSuggestedForCuration ? StarSolidIcon : StarIcon,
                onClick: toggleSuggestedForCuration,
              }
            : null,
          setAsQuickTakesPost
            ? {
                title: "Set as user's quick takes post",
                onClick: setAsQuickTakesPost,
              }
            : null,
        ]}
      >
        <button
          aria-label="Post options"
          className="
            text-gray-600 hover:text-gray-900 cursor-pointer flex items-center
          "
        >
          <TripleDotIcon className={clsx("w-5", className)} />
        </button>
      </DropdownMenu>
      <ReportPopover post={post} open={reportOpen} onClose={closeReport} />
    </>
  );
}
