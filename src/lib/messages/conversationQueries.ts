import keyBy from "lodash/keyBy";
import uniq from "lodash/uniq";
import { and, arrayContains, eq, gt, ne, sql, SQL } from "drizzle-orm";
import { db } from "../db";
import { conversations, messages, notifications } from "../schema";
import { userCanDo } from "../users/userHelpers";
import { userBaseProjection, UserBase } from "../users/userQueries";
import { filterNonNull } from "../typeHelpers";
import { htmlToTextDefault } from "../utils/htmlToText";
import type { CurrentUser } from "../users/currentUser";
import type { RelationalFilter } from "../utils/queryHelpers";

const MESSAGE_PREVIEW_LENGTH = 200;

export const userCanViewAllConversations = (user: CurrentUser | null) =>
  userCanDo(user, "conversations.view.all");

const unreadMessageNotificationFilter = (userId: string) =>
  and(
    eq(notifications.userId, userId),
    eq(notifications.type, "newMessage"),
    eq(notifications.documentType, "message"),
    ne(notifications.emailed, true),
    ne(notifications.waitingForBatch, true),
    ne(notifications.deleted, true),
    ne(notifications.viewed, true),
  );

const conversationHasUnreadMessages = (conversationId: SQL, userId: string) =>
  sql<boolean>`EXISTS (
    SELECT 1
    FROM ${notifications}
    JOIN ${messages} ON ${messages._id} = ${notifications.documentId}
    WHERE
      ${messages.conversationId} = ${conversationId} AND
      ${unreadMessageNotificationFilter(userId)}
  )`;

const fetchConversations = async (
  user: CurrentUser,
  {
    where,
    limit,
    offset,
  }: {
    where: RelationalFilter<typeof db.query.conversations>;
    limit?: number;
    offset?: number;
  },
) => {
  const results = await db.query.conversations.findMany({
    columns: {
      _id: true,
      title: true,
      participantIds: true,
      latestActivity: true,
      messageCount: true,
      moderator: true,
    },
    extras: {
      hasUnreadMessages: (conversationsTable, { sql }) =>
        conversationHasUnreadMessages(sql`${conversationsTable}."_id"`, user._id),
    },
    with: {
      messages: {
        columns: {
          _id: true,
          userId: true,
          createdAt: true,
        },
        extras: {
          html: (messagesTable, { sql }) =>
            sql<string | null>`${messagesTable}."contents"->>'html'`,
        },
        orderBy: { createdAt: "desc" },
        limit: 1,
      },
    },
    where,
    orderBy: { latestActivity: "desc" },
    limit,
    offset,
  });

  const participants = await db.query.users.findMany({
    ...userBaseProjection,
    where: {
      _id: { in: uniq(results.flatMap(({ participantIds }) => participantIds)) },
    },
  });
  const participantsById = keyBy(participants, ({ _id }) => _id);

  return results.map(({ messages: [latestMessage], ...conversation }) => ({
    ...conversation,
    participants: filterNonNull(
      conversation.participantIds.map((id) => participantsById[id]),
    ),
    latestMessage: latestMessage
      ? {
          _id: latestMessage._id,
          userId: latestMessage.userId,
          createdAt: latestMessage.createdAt,
          previewText: htmlToTextDefault(latestMessage.html ?? "").slice(
            0,
            MESSAGE_PREVIEW_LENGTH,
          ),
        }
      : null,
  }));
};

export type InboxConversation = Awaited<
  ReturnType<typeof fetchConversations>
>[number];

export type ConversationParticipant = UserBase;

export const fetchInboxConversations = (
  user: CurrentUser,
  { limit, offset }: { limit?: number; offset?: number },
): Promise<InboxConversation[]> =>
  fetchConversations(user, {
    where: {
      messageCount: { gt: 0 },
      participantIds: { arrayContains: [user._id] },
    },
    limit,
    offset,
  });

export const fetchModeratorConversations = (
  user: CurrentUser,
  { userId, limit, offset }: { userId?: string; limit?: number; offset?: number },
): Promise<InboxConversation[]> => {
  if (!userCanViewAllConversations(user)) {
    throw new Error("Permission denied");
  }
  return fetchConversations(user, {
    where: {
      moderator: true,
      messageCount: { gt: 0 },
      ...(userId && { participantIds: { arrayContains: [userId] } }),
    },
    limit,
    offset,
  });
};

/**
 * Fetched separately from the lists, which don't include conversations
 * without messages. Returns null if the user isn't allowed to see it.
 */
export const fetchConversationForUser = async (
  user: CurrentUser,
  conversationId: string,
): Promise<InboxConversation | null> => {
  const [conversation] = await fetchConversations(user, {
    where: { _id: conversationId },
    limit: 1,
  });
  if (
    !conversation ||
    (!conversation.participantIds.includes(user._id) &&
      !userCanViewAllConversations(user))
  ) {
    return null;
  }
  return conversation;
};

const fetchMessages = async (where: RelationalFilter<typeof db.query.messages>) =>
  db.query.messages.findMany({
    columns: {
      _id: true,
      userId: true,
      conversationId: true,
      createdAt: true,
    },
    extras: {
      html: (messagesTable, { sql }) =>
        sql<string | null>`${messagesTable}."contents"->>'html'`,
    },
    with: {
      user: userBaseProjection,
    },
    where,
    orderBy: { createdAt: "asc" },
  });

export type ConversationMessage = Awaited<ReturnType<typeof fetchMessages>>[number];

export const fetchConversationMessages = (
  conversationId: string,
): Promise<ConversationMessage[]> => fetchMessages({ conversationId });

export const fetchConversationMessage = async (
  messageId: string,
): Promise<ConversationMessage | null> => {
  const [message] = await fetchMessages({ _id: messageId });
  return message ?? null;
};

export const fetchUnreadMessagesCount = async (user: CurrentUser) => {
  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)::INT` })
    .from(conversations)
    .where(
      and(
        gt(conversations.messageCount, 0),
        arrayContains(conversations.participantIds, [user._id]),
        conversationHasUnreadMessages(sql`${conversations._id}`, user._id),
      ),
    );
  return count;
};

export const unreadConversationMessageNotificationIds = (
  userId: string,
  conversationId: string,
) =>
  db
    .select({ _id: notifications._id })
    .from(notifications)
    .innerJoin(messages, eq(messages._id, notifications.documentId))
    .where(
      and(
        eq(messages.conversationId, conversationId),
        unreadMessageNotificationFilter(userId),
      ),
    );
