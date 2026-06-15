"use client";

import { useUpdateReadStatus } from "@/lib/hooks/useUpdateReadStatus";
import clsx from "clsx";
import CheckIcon from "@heroicons/react/16/solid/CheckIcon";
import Tooltip from "./Tooltip";
import Type from "./Type";

export default function PostReadCheckbox({
  postId,
  initialIsRead,
  className,
}: Readonly<{
  postId: string;
  initialIsRead: boolean;
  className?: string;
}>) {
  const { isRead, toggleIsRead } = useUpdateReadStatus(postId, initialIsRead);
  return (
    <Tooltip
      title={<Type style="bodySmall">Mark as {isRead ? "unread" : "read"}</Type>}
    >
      <div
        data-component="PostReadCheckbox"
        role="checkbox"
        aria-checked={isRead}
        onClick={toggleIsRead}
        className={clsx(
          "w-3 h-3 min-w-3 border-1 rounded-[2px] cursor-pointer",
          "flex items-center justify-center",
          isRead ? "border-primary bg-primary/10" : "border-gray-600",
          className,
        )}
      >
        <CheckIcon className={clsx("w-3 text-primary", !isRead && "opacity-0")} />
      </div>
    </Tooltip>
  );
}
