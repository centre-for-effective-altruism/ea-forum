import type {
  ConversationMessage,
  InboxConversation,
} from "@/lib/messages/conversationQueries";
import {
  conversationGetPageUrl,
  inboxBasePath,
} from "@/lib/messages/messageHelpers";

export const inboxConversationsLimit = 20;

export type SelectedConversation = {
  conversation: InboxConversation;
  messages: ConversationMessage[];
};

export const getSelectedConversationId = (pathname: string, isModInbox: boolean) => {
  const prefix = `${inboxBasePath(isModInbox)}/`;
  return pathname.startsWith(prefix)
    ? decodeURIComponent(pathname.slice(prefix.length)) || null
    : null;
};

export const inboxConversationHref = ({
  conversationId,
  isModInbox,
  userIdFilter,
}: {
  conversationId: string | null;
  isModInbox: boolean;
  userIdFilter?: string;
}) => {
  const path = conversationId
    ? conversationGetPageUrl({ conversationId, isModInbox })
    : inboxBasePath(isModInbox);
  return userIdFilter
    ? `${path}?${new URLSearchParams({ userId: userIdFilter })}`
    : path;
};
