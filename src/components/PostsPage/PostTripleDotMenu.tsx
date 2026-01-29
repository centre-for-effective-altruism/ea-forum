"use client";

import { useCallback, useState } from "react";
import type { PostDisplay } from "@/lib/posts/postQueries";
import type { PostListItem } from "@/lib/posts/postLists";
import { usePostAnalyticsLink, usePostEditLink } from "@/lib/hooks/usePostLinks";
import { useUpdateBookmark } from "@/lib/hooks/useUpdateBookmark";
import { useUpdateReadStatus } from "@/lib/hooks/useUpdateReadStatus";
import { usePostSubscriptions } from "@/lib/hooks/useSubscriptions";
import {
  useApproveNewUser,
  useArchiveDraft,
  useExcludeFromRecommendations,
  useMoveToDraft,
  useMoveToFrontpage,
  useSetAsQuickTakesPost,
  useSuggestForCurated,
} from "@/lib/hooks/usePostModerationActions";
import clsx from "clsx";
import PencilIcon from "@heroicons/react/24/outline/PencilIcon";
import ChartBarIcon from "@heroicons/react/24/outline/ChartBarIcon";
import BellIcon from "@heroicons/react/24/outline/BellIcon";
import EllipsisVerticalIcon from "@heroicons/react/24/outline/EllipsisVerticalIcon";
import EllipsisHorizontalIcon from "@heroicons/react/24/outline/EllipsisHorizontalIcon";
import ArchiveBoxArrowDownIcon from "@heroicons/react/24/outline/ArchiveBoxArrowDownIcon";
import ArchiveBoxXMarkIcon from "@heroicons/react/24/outline/ArchiveBoxXMarkIcon";
import BookmarkSolidIcon from "@heroicons/react/24/solid/BookmarkIcon";
import BookmarkOutlineIcon from "@heroicons/react/24/outline/BookmarkIcon";
import ExclamationCircleIcon from "@heroicons/react/24/outline/ExclamationCircleIcon";
import EnvelopeIcon from "@heroicons/react/24/outline/EnvelopeIcon";
import EnvelopeOpenIcon from "@heroicons/react/24/outline/EnvelopeOpenIcon";
import CheckCircleIcon from "@heroicons/react/24/outline/CheckCircleIcon";
import XCircleIcon from "@heroicons/react/24/outline/XCircleIcon";
import StarIcon from "@heroicons/react/24/outline/StarIcon";
import StarSolidIcon from "@heroicons/react/24/solid/StarIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import NewspaperIcon from "@heroicons/react/24/outline/NewspaperIcon";
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
  const { subscriptionMenuItems } = usePostSubscriptions(post);
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
  const { excludedFromRecommendations, toggleExcludeFromRecommendations } =
    useExcludeFromRecommendations(post);
  const { isFrontpage, toggleFrontpage } = useMoveToFrontpage(post);
  const setAsQuickTakesPost = useSetAsQuickTakesPost(post);
  const moveToDraft = useMoveToDraft(post);
  const archiveDraft = useArchiveDraft(post);
  const approveNewUser = useApproveNewUser(post);
  const openReport = useCallback(() => setReportOpen(true), []);
  const closeReport = useCallback(() => setReportOpen(false), []);

  // TODO: See PostActions.tsx
  // resync rss
  // duplicate event
  // hide from frontpage
  // edit tags
  // delete draft

  const TripleDotIcon =
    orientation === "horizontal" ? EllipsisHorizontalIcon : EllipsisVerticalIcon;
  return (
    <>
      <DropdownMenu
        placement="bottom-end"
        className="text-gray-900"
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
          {
            title: "Get notified",
            Icon: BellIcon,
            submenu: subscriptionMenuItems,
          },
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
          moveToDraft
            ? {
                title: "Move to draft",
                Icon: ArchiveBoxArrowDownIcon,
                onClick: moveToDraft,
              }
            : null,
          archiveDraft
            ? {
                title: "Archive draft",
                Icon: ArchiveBoxXMarkIcon,
                onClick: archiveDraft,
              }
            : null,
          toggleExcludeFromRecommendations
            ? {
                title: excludedFromRecommendations
                  ? "Enable recommendation"
                  : "Disable recommendation",
                Icon: excludedFromRecommendations ? CheckCircleIcon : XCircleIcon,
                onClick: toggleExcludeFromRecommendations,
              }
            : null,
          approveNewUser
            ? {
                title: "Approve new user",
                Icon: CheckIcon,
                onClick: approveNewUser,
              }
            : null,
          toggleFrontpage
            ? {
                title: isFrontpage ? "Move to personal blog" : "Move to frontpage",
                Icon: NewspaperIcon,
                onClick: toggleFrontpage,
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
