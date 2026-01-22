import DocumentIcon from "@heroicons/react/24/solid/DocumentIcon";
import CalendarIcon from "@heroicons/react/24/solid/CalendarIcon";
import CommentIcon from "@heroicons/react/24/solid/ChatBubbleLeftIcon";
import TagIcon from "@heroicons/react/24/solid/TagIcon";
import QIcon from "@/components/Icons/QIcon";
import clsx from "clsx";

const recentDiscussionIcons = {
  Post: DocumentIcon,
  Event: CalendarIcon,
  Comment: CommentIcon,
  Tag: TagIcon,
  Question: QIcon,
} as const;

export type RecentDiscussionIconName = keyof typeof recentDiscussionIcons;

const recentDiscussionIconVariants = {
  primary: "bg-primary",
  grey: "bg-recent-discussions-gray",
  green: "bg-recent-discussions-green",
} as const;

export type RecentDiscussionIconVariant = keyof typeof recentDiscussionIconVariants;

export default function RecentDiscussionIcon({
  icon,
  variant,
}: Readonly<{
  icon: RecentDiscussionIconName;
  variant: RecentDiscussionIconVariant;
}>) {
  const Icon = recentDiscussionIcons[icon];
  return (
    <div
      data-component="RecentDiscussionIcon"
      className={clsx(
        "flex items-center justify-center text-always-white rounded-[50%]",
        "w-6 h-6 min-w-6",
        recentDiscussionIconVariants[variant],
      )}
    >
      <Icon className="w-[14px] h-[14px]" />
    </div>
  );
}
