"use client";

import type { ConversationMessage } from "@/lib/messages/conversationQueries";
import clsx from "clsx";
import CommentBody from "../ContentStyles/CommentBody";
import UserProfileImage from "../UserProfileImage";
import UsersName from "../UsersName";
import TimeAgo from "../TimeAgo";
import Type from "../Type";

export default function MessageItem({
  message,
  isOwnMessage,
}: Readonly<{
  message: ConversationMessage;
  isOwnMessage: boolean;
}>) {
  if (!message.html) {
    return null;
  }
  return (
    <div
      data-component="MessageItem"
      className={clsx("flex items-end gap-2 max-w-[95%]", isOwnMessage && "ml-auto")}
    >
      {!isOwnMessage && (
        <UserProfileImage user={message.user} size={36} className="max-sm:hidden" />
      )}
      <div
        className={clsx(
          "min-w-0 grow rounded-[5px] px-3 py-2 break-words",
          isOwnMessage ? "bg-gray-700 text-gray-0" : "bg-gray-200 text-gray-1000",
        )}
      >
        <div className="flex flex-wrap items-baseline gap-x-2 mb-2">
          <Type style="bodyHeavy" As="span">
            <UsersName user={message.user} />
          </Type>
          <TimeAgo
            time={message.createdAt}
            textStyle="bodySmall"
            As="span"
            className={isOwnMessage ? "text-gray-300" : "text-gray-600"}
          />
        </div>
        <CommentBody
          html={message.html}
          className={clsx(
            "[&_img]:max-w-full",
            isOwnMessage && "text-gray-0! [&_*]:text-inherit! [&_a]:underline",
          )}
        />
      </div>
    </div>
  );
}
