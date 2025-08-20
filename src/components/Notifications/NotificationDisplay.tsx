import type { INotificationDisplays } from "@/lib/notifications/notificationsQueries.schemas";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { formatNotificationType } from "@/lib/notifications/notificationHelpers";
import ChatBubbleLeftIcon from "@heroicons/react/16/solid/ChatBubbleLeftIcon";
import DocumentIcon from "@heroicons/react/16/solid/DocumentIcon";
import GiftIcon from "@heroicons/react/16/solid/GiftIcon";
import PostsTooltip from "../PostsTooltip";
import TimeAgo from "../TimeAgo";
import Type from "../Type";
import Link from "../Link";

const icons = {
  post: {
    Icon: DocumentIcon,
    className: "bg-(--color-primary)",
  },
  comment: {
    Icon: ChatBubbleLeftIcon,
    className: "bg-gray-600",
  },
  wrapped: {
    Icon: GiftIcon,
    className: "wrapped-notification",
  },
};

export default function NotificationDisplay({
  notification,
}: Readonly<{
  notification: INotificationDisplays;
}>) {
  const { message, link, type, post, comment, viewed, createdAt } = notification;
  const icon = icons[type === "wrapped" ? "wrapped" : comment ? "comment" : "post"];
  return (
    <AnalyticsContext pageSubSectionContext="notificationsPageItem">
      <PostsTooltip postId={post?._id ?? comment?.post?._id} placement="left-start">
        <Link
          href={link ?? "#"}
          className={`
            flex gap-2 text-gray-600 p-[6px_8px] rounded
            cursor-pointer hover:bg-gray-100
          `}
          data-component="NotificationDisplay"
        >
          <div
            className={`
              flex items-center justify-center text-(--always-white) rounded-full
              w-[24px] min-w-[24px] h-[24px] ${icon.className}
            `}
          >
            <icon.Icon className="w-[14px] h-[14px] min-w-[14px] min-h-[14px]" />
          </div>
          <div className="flex grow">
            <div className="grow">
              <Type style="bodySmall">{formatNotificationType(type)}</Type>
              <Type
                style="bodySmall"
                className={`text-black ${!viewed ? "font-[600]" : ""}`}
              >
                {message}
              </Type>
            </div>
            <div className="flex gap-2">
              {!viewed && (
                <div
                  className={`
                    w-[10px] min-w-[10px] h-[10px] min-h-[10px] mt-[5px]
                    rounded-full bg-(--color-primary)
                  `}
                />
              )}
              {createdAt && <TimeAgo time={createdAt} textStyle="bodySmall" />}
            </div>
          </div>
        </Link>
      </PostsTooltip>
    </AnalyticsContext>
  );
}
