"use client";

import type { InboxConversation } from "@/lib/messages/conversationQueries";
import { inboxConversationHref } from "./inboxHelpers";
import InboxConversationItem from "./InboxConversationItem";
import LoadMoreButton from "../SavedPage/LoadMoreButton";
import Loading from "../Loading";
import Type from "../Type";

export default function InboxConversationList({
  conversations,
  loading,
  canLoadMore,
  onLoadMore,
  selectedConversationId,
  onSelectConversation,
  currentUserId,
  isModInbox,
  userIdFilter,
}: Readonly<{
  conversations: InboxConversation[];
  loading: boolean;
  canLoadMore: boolean;
  onLoadMore: () => void;
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  currentUserId: string;
  isModInbox: boolean;
  userIdFilter?: string;
}>) {
  return (
    <div data-component="InboxConversationList" className="flex flex-col">
      {conversations.length === 0 && !loading && (
        <Type className="text-gray-600 p-4">You have no open conversations.</Type>
      )}
      {conversations.map((conversation) => (
        <InboxConversationItem
          key={conversation._id}
          conversation={conversation}
          href={inboxConversationHref({
            conversationId: conversation._id,
            isModInbox,
            userIdFilter,
          })}
          currentUserId={currentUserId}
          isSelected={conversation._id === selectedConversationId}
          onSelect={onSelectConversation}
        />
      ))}
      {loading ? (
        <Loading className="my-3" />
      ) : (
        canLoadMore && (
          <div className="px-4 pb-3 flex">
            <LoadMoreButton
              canLoadMore={canLoadMore}
              loading={loading}
              onLoadMore={onLoadMore}
            />
          </div>
        )
      )}
    </div>
  );
}
