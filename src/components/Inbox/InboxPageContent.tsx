import { notFound } from "next/navigation";
import type { NextSearchParams } from "@/lib/typeHelpers";
import { CurrentUser, getCurrentUser } from "@/lib/users/currentUser";
import { markConversationRead } from "@/lib/messages/messageMutations";
import { getDraftMessageHtml } from "@/lib/messages/messageHelpers";
import { fetchModerationTemplate } from "@/lib/moderationTemplates/moderationTemplateQueries";
import {
  fetchConversationForUser,
  fetchConversationMessages,
  fetchInboxConversations,
  fetchModeratorConversations,
  userCanViewAllConversations,
} from "@/lib/messages/conversationQueries";
import { inboxConversationsLimit, SelectedConversation } from "./inboxHelpers";
import Inbox from "./Inbox";
import Type from "../Type";

const getQueryString = (value: string | string[] | undefined) =>
  typeof value === "string" && value ? value : undefined;

const fetchSelectedConversation = async (
  currentUser: CurrentUser,
  conversationId: string,
): Promise<SelectedConversation | null> => {
  const conversation = await fetchConversationForUser(currentUser, conversationId);
  if (!conversation) {
    return null;
  }
  const [messages] = await Promise.all([
    fetchConversationMessages(conversationId),
    markConversationRead(currentUser, conversationId),
  ]);
  return { conversation: { ...conversation, hasUnreadMessages: false }, messages };
};

const fetchTemplateHtml = async (
  currentUser: CurrentUser,
  query: NextSearchParams,
) => {
  const templateId = getQueryString(query.templateId);
  if (!templateId) {
    return undefined;
  }
  const template = await fetchModerationTemplate(currentUser, templateId);
  return template?.html
    ? getDraftMessageHtml({
        html: template.html,
        displayName: getQueryString(query.displayName),
      })
    : undefined;
};

export default async function InboxPageContent({
  conversationId: conversationIdPromise,
  searchParams,
  isModInbox,
}: Readonly<{
  conversationId?: Promise<string>;
  searchParams: Promise<NextSearchParams>;
  isModInbox: boolean;
}>) {
  const [currentUser, conversationId, query] = await Promise.all([
    getCurrentUser(),
    conversationIdPromise,
    searchParams,
  ]);
  if (!currentUser) {
    return (
      <Type className="text-gray-600 max-sm:p-4">
        Log in to access private messages.
      </Type>
    );
  }
  const canViewModInbox = userCanViewAllConversations(currentUser);
  if (isModInbox && !canViewModInbox) {
    return (
      <Type className="text-gray-600 max-sm:p-4">
        You don&apos;t have permission to view the moderator inbox.
      </Type>
    );
  }

  const userIdFilter = isModInbox ? getQueryString(query.userId) : undefined;
  const selectedConversation = conversationId
    ? await fetchSelectedConversation(currentUser, conversationId)
    : null;
  if (conversationId && !selectedConversation) {
    notFound();
  }

  const [initialConversations, templateHtml] = await Promise.all([
    isModInbox
      ? fetchModeratorConversations(currentUser, {
          userId: userIdFilter,
          limit: inboxConversationsLimit,
        })
      : fetchInboxConversations(currentUser, { limit: inboxConversationsLimit }),
    selectedConversation ? fetchTemplateHtml(currentUser, query) : undefined,
  ]);

  return (
    <Inbox
      isModInbox={isModInbox}
      userIdFilter={userIdFilter}
      canViewModInbox={canViewModInbox}
      initialConversations={initialConversations}
      initialSelectedConversation={selectedConversation}
      templateHtml={templateHtml}
    />
  );
}
