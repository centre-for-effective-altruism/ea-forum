import type { Message } from "../schema";
import { getSiteUrl } from "../routeHelpers";
import { userGetDisplayName, UserDisplayNameInfo } from "../users/userHelpers";

export const inboxBasePath = (isModInbox?: boolean) =>
  isModInbox ? "/moderatorInbox" : "/inbox";

export const conversationGetPageUrl = ({
  conversationId,
  isAbsolute,
  isModInbox,
  from,
}: {
  conversationId: string;
  isAbsolute?: boolean;
  isModInbox?: boolean;
  from?: string;
}) => {
  const prefix = isAbsolute ? getSiteUrl().slice(0, -1) : "";
  const query = from ? `?${new URLSearchParams({ from })}` : "";
  return `${prefix}${inboxBasePath(isModInbox)}/${conversationId}${query}`;
};

export const messageGetPageUrl = ({
  message,
  isAbsolute,
}: {
  message: Pick<Message, "conversationId">;
  isAbsolute?: boolean;
}) => conversationGetPageUrl({ conversationId: message.conversationId, isAbsolute });

/**
 * Get the title of a conversation, formatted like e.g. "Bob, Charlie + 1 more"
 */
export const conversationGetTitle = (
  conversation: {
    title: string | null;
    participants: (UserDisplayNameInfo & { _id: string })[];
  },
  currentUserId: string | null,
) => {
  if (conversation.title) {
    return conversation.title;
  }
  const names = conversation.participants
    .filter(({ _id }) => _id !== currentUserId)
    .map(userGetDisplayName);
  if (names.length === 0) {
    return "Conversation";
  }
  if (names.length === 2) {
    return names.join(" and ");
  }
  const title = names.slice(0, 2).join(", ");
  return names.length > 2 ? `${title} + ${names.length - 2} more` : title;
};

/**
 * Moderation templates can contain notes for moderators before a `\\` marker,
 * and `{{displayName}}`/`{{firstName}}` placeholders for the recipient.
 */
export const getDraftMessageHtml = ({
  html,
  displayName,
}: {
  html: string;
  displayName?: string | null;
}) => {
  const body = html.replace(/.*\\\\/, "");
  if (!displayName) {
    return body;
  }
  const firstName = displayName.split(" ")[0];
  return body
    .replace(/{{displayName}}/g, displayName)
    .replace(/{{firstName}}/g, firstName);
};
