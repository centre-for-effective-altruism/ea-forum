"use client";

import { MouseEvent, useCallback } from "react";
import type { InboxConversation } from "@/lib/messages/conversationQueries";
import { conversationGetTitle } from "@/lib/messages/messageHelpers";
import clsx from "clsx";
import UserProfileImage from "../UserProfileImage";
import TimeAgo from "../TimeAgo";
import Link from "../Link";
import Type from "../Type";

const isPlainLeftClick = (e: MouseEvent) =>
  e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

export default function InboxConversationItem({
  conversation,
  href,
  currentUserId,
  isSelected,
  onSelect,
}: Readonly<{
  conversation: InboxConversation;
  href: string;
  currentUserId: string;
  isSelected: boolean;
  onSelect: (conversationId: string) => void;
}>) {
  const onClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      if (isPlainLeftClick(e)) {
        e.preventDefault();
        onSelect(conversation._id);
      }
    },
    [onSelect, conversation._id],
  );

  const { participants, hasUnreadMessages, latestMessage } = conversation;
  const avatarUser =
    participants.find(({ _id }) => _id !== currentUserId) ?? participants[0];

  return (
    <Link
      href={href}
      onClick={onClick}
      className={clsx(
        "flex items-center gap-3 px-4 py-3 border-b border-gray-200",
        isSelected ? "bg-gray-200" : "hover:bg-gray-100",
      )}
    >
      <UserProfileImage user={avatarUser} size={40} />
      <div className="min-w-0 grow">
        <div className="flex items-center justify-between gap-2">
          <Type
            style={hasUnreadMessages ? "bodyXHeavy" : "bodyHeavy"}
            className="truncate text-gray-1000"
          >
            {conversationGetTitle(conversation, currentUserId)}
          </Type>
          <div className="flex items-center gap-1.5 shrink-0 text-gray-600">
            {hasUnreadMessages && (
              <span
                aria-label="Unread"
                className="w-2 h-2 rounded-full bg-primary"
              />
            )}
            <TimeAgo time={conversation.latestActivity} textStyle="bodySmall" />
          </div>
        </div>
        {latestMessage && (
          <Type
            style={hasUnreadMessages ? "bodySmallMedium" : "bodySmall"}
            className={clsx(
              "truncate mt-0.5",
              hasUnreadMessages ? "text-gray-1000 font-[600]!" : "text-gray-600",
            )}
          >
            {latestMessage.previewText}
          </Type>
        )}
      </div>
    </Link>
  );
}
