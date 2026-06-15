import { useCallback, useRef, useState } from "react";
import type { CommentListItem } from "@/lib/comments/commentLists";
import { userCanModeratePost } from "@/lib/posts/postsHelpers";
import {
  usePinCommentOnProfile,
  useQuickTakeFrontpage,
} from "@/lib/hooks/useCommentModerationActions";
import { userCanEditComment } from "@/lib/comments/commentHelpers";
import { useUpdateBookmark } from "@/lib/hooks/useUpdateBookmark";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import PencilIcon from "@heroicons/react/24/outline/PencilIcon";
import ExclamationCircleIcon from "@heroicons/react/24/outline/ExclamationCircleIcon";
import EllipsisVerticalIcon from "@heroicons/react/24/solid/EllipsisVerticalIcon";
import BookmarkSolidIcon from "@heroicons/react/24/solid/BookmarkIcon";
import BookmarkOutlineIcon from "@heroicons/react/24/outline/BookmarkIcon";
import PinIcon from "../Icons/PinIcon";
import ReportPopover from "../Moderation/ReportPopover";
import DropdownMenu from "../Dropdown/DropdownMenu";
import clsx from "clsx";

export default function CommentTripleDotMenu({
  comment,
  onEdit,
  small,
  className,
}: Readonly<{
  comment: CommentListItem;
  onEdit?: () => void;
  small?: boolean;
  className?: string;
}>) {
  const dismissRef = useRef<() => void>(null);
  const { currentUser } = useCurrentUser();
  const [reportOpen, setReportOpen] = useState(false);
  const openReport = useCallback(() => setReportOpen(true), []);
  const closeReport = useCallback(() => setReportOpen(false), []);
  const { isBookmarked, toggleIsBookmarked } = useUpdateBookmark(
    "Comments",
    comment._id,
    comment.bookmarks?.[0]?.active ?? false,
  );
  const canEdit = userCanEditComment(currentUser, comment) && !!onEdit;
  const { isPinnedOnProfile, toggleIsPinnedOnProfile } =
    usePinCommentOnProfile(comment);
  const { isQuickTakeFrontpage, toggleQuickTakeFrontpage } =
    useQuickTakeFrontpage(comment);

  const editComment = useCallback(() => {
    if (canEdit) {
      onEdit();
      dismissRef.current?.();
    }
  }, [canEdit, onEdit]);

  return (
    <>
      <DropdownMenu
        placement="bottom-end"
        className="text-gray-900"
        dismissRef={dismissRef}
        items={[
          canEdit
            ? {
                title: "Edit",
                Icon: PencilIcon,
                onClick: editComment,
              }
            : null,
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
          className={clsx(
            "text-gray-600 hover:text-gray-900 cursor-pointer flex items-center",
            className,
          )}
        >
          <EllipsisVerticalIcon
            className={clsx(
              "text-gray-600 hover:text-gray-1000",
              small ? "w-4" : "w-5",
            )}
          />
        </button>
      </DropdownMenu>
      <ReportPopover comment={comment} open={reportOpen} onClose={closeReport} />
    </>
  );
}
