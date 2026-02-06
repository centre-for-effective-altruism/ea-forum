import { useCallback, useState } from "react";
import type { CommentsList } from "@/lib/comments/commentLists";
import { userCanModeratePost } from "@/lib/posts/postsHelpers";
import {
  usePinCommentOnProfile,
  useQuickTakeFrontpage,
} from "@/lib/hooks/useCommentModerationActions";
import { useUpdateBookmark } from "@/lib/hooks/useUpdateBookmark";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import ExclamationCircleIcon from "@heroicons/react/24/outline/ExclamationCircleIcon";
import EllipsisVerticalIcon from "@heroicons/react/24/solid/EllipsisVerticalIcon";
import BookmarkSolidIcon from "@heroicons/react/24/solid/BookmarkIcon";
import BookmarkOutlineIcon from "@heroicons/react/24/outline/BookmarkIcon";
import PinIcon from "../Icons/PinIcon";
import ReportPopover from "../Moderation/ReportPopover";
import DropdownMenu from "../Dropdown/DropdownMenu";

export default function CommentTripleDotMenu({
  comment,
}: Readonly<{
  comment: CommentsList;
}>) {
  const { currentUser } = useCurrentUser();
  const [reportOpen, setReportOpen] = useState(false);
  const openReport = useCallback(() => setReportOpen(true), []);
  const closeReport = useCallback(() => setReportOpen(false), []);
  const { isBookmarked, toggleIsBookmarked } = useUpdateBookmark(
    "Comments",
    comment._id,
    comment.bookmarks?.[0]?.active ?? false,
  );
  const { isPinnedOnProfile, toggleIsPinnedOnProfile } =
    usePinCommentOnProfile(comment);
  const { isQuickTakeFrontpage, toggleQuickTakeFrontpage } =
    useQuickTakeFrontpage(comment);

  return (
    <>
      <DropdownMenu
        placement="bottom-end"
        className="text-gray-900"
        items={[
          // TODO Edit comment
          toggleIsPinnedOnProfile
            ? {
                title: isPinnedOnProfile
                  ? "Unpin from user profile"
                  : "Pin to user profile",
                Icon: PinIcon,
                onClick: toggleIsPinnedOnProfile,
              }
            : null,
          // TODO subscriptions
          {
            title: isBookmarked ? "Saved" : "Save",
            Icon: isBookmarked ? BookmarkSolidIcon : BookmarkOutlineIcon,
            onClick: toggleIsBookmarked,
          },
          {
            title: "Report",
            Icon: ExclamationCircleIcon,
            onClick: openReport,
          },
          userCanModeratePost(currentUser, comment.post) ? "divider" : null,
          toggleQuickTakeFrontpage
            ? {
                title: isQuickTakeFrontpage
                  ? "Remove from frontpage"
                  : "Allow on frontpage",
                onClick: toggleQuickTakeFrontpage,
              }
            : null,
          // TODO
          // Delete
          // Retract
          // Lock thread
          // Ban user from post
          // Ban user from all posts
          // Ban user from all personal posts
          // Toggle is moderator comment
        ]}
      >
        <button
          aria-label="Comment options"
          className="
            text-gray-600 hover:text-gray-900 cursor-pointer flex items-center
          "
        >
          <EllipsisVerticalIcon className="w-5 text-gray-600 hover:text-gray-1000" />
        </button>
      </DropdownMenu>
      <ReportPopover comment={comment} open={reportOpen} onClose={closeReport} />
    </>
  );
}
