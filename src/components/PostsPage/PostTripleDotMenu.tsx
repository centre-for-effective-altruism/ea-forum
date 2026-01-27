"use client";

import type { PostDisplay } from "@/lib/posts/postQueries";
import type { PostListItem } from "@/lib/posts/postLists";
import { useUpdateReadStatus } from "@/lib/hooks/useUpdateReadStatus";
import EllipsisHorizontalIcon from "@heroicons/react/24/outline/EllipsisHorizontalIcon";
import EllipsisVerticalIcon from "@heroicons/react/24/outline/EllipsisVerticalIcon";
import EnvelopeIcon from "@heroicons/react/24/outline/EnvelopeIcon";
import DropdownMenu from "../Dropdown/DropdownMenu";
import clsx from "clsx";

export default function PostTripleDotMenu({
  post,
  orientation,
  className,
}: Readonly<{
  post: PostDisplay | PostListItem;
  orientation: "vertical" | "horizontal";
  className?: string;
}>) {
  const { isRead, toggleIsRead } = useUpdateReadStatus(
    post._id,
    !!post.readStatus?.[0]?.isRead,
  );
  const Icon =
    orientation === "horizontal" ? EllipsisHorizontalIcon : EllipsisVerticalIcon;
  return (
    <DropdownMenu
      placement="bottom-end"
      className="text-gray-900"
      items={[
        {
          title: isRead ? "Mark as unread" : "Mark as read",
          Icon: EnvelopeIcon,
          onClick: toggleIsRead,
        },
      ]}
    >
      <button
        aria-label="Post options"
        className="text-gray-600 hover:text-gray-900 cursor-pointer flex items-center"
      >
        <Icon className={clsx("w-5", className)} />
      </button>
    </DropdownMenu>
  );
}
