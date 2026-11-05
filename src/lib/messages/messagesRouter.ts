import uniq from "lodash/uniq";
import { z } from "zod/v4";
import { ORPCError, os } from "@orpc/server";
import { getCurrentUser } from "../users/currentUser";
import { editorDataSchema } from "../ckeditor/editorHelpers";
import {
  createConversation,
  markConversationRead,
  sendConversationMessage,
  updateConversation,
} from "./messageMutations";
import { fetchConversationByParticipants } from "./messageQueries";
import {
  fetchConversationForUser,
  fetchConversationMessage,
  fetchConversationMessages,
  fetchInboxConversations,
  fetchModeratorConversations,
  fetchUnreadMessagesCount,
} from "./conversationQueries";
import {
  userCanInitiateConversations,
  userHasMessagingDisabled,
} from "../users/userHelpers";

const requireCurrentUser = async () => {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("Please login");
  }
  return currentUser;
};

export const messagesRouter = {
  createConversation: os
    .input(
      z.object({
        userIds: z.string().nonempty().array().nonempty(),
        includeModerators: z.boolean().optional().default(false),
      }),
    )
    .handler(async ({ input: { userIds, includeModerators } }) => {
      const currentUser = await requireCurrentUser();
      if (userHasMessagingDisabled(currentUser)) {
        throw new ORPCError("FORBIDDEN", {
          message: "You are not allowed to send messages",
        });
      }
      if (!userCanInitiateConversations(currentUser)) {
        throw new Error("Permission denied");
      }
      const participantIds = uniq([...userIds, currentUser._id]);
      const moderator = !!includeModerators;
      const existingConversationId = await fetchConversationByParticipants(
        participantIds,
        moderator,
      );
      if (existingConversationId) {
        return existingConversationId;
      }
      const newConversation = await createConversation(currentUser, {
        title: null,
        participantIds,
        moderator,
      });
      return newConversation._id;
    }),
  listConversations: os
    .input(
      z.object({
        moderator: z.boolean().optional(),
        userId: z.string().nonempty().optional(),
        offset: z.int().nonnegative().optional(),
        limit: z.int().positive().max(50).default(20),
      }),
    )
    .handler(async ({ input: { moderator, userId, offset, limit } }) => {
      const currentUser = await requireCurrentUser();
      const items = moderator
        ? await fetchModeratorConversations(currentUser, { userId, limit, offset })
        : await fetchInboxConversations(currentUser, { limit, offset });
      return { items };
    }),
  getConversation: os
    .input(z.object({ conversationId: z.string().nonempty() }))
    .handler(async ({ input: { conversationId } }) => {
      const currentUser = await requireCurrentUser();
      const conversation = await fetchConversationForUser(
        currentUser,
        conversationId,
      );
      if (!conversation) {
        return null;
      }
      const messages = await fetchConversationMessages(conversationId);
      return { conversation, messages };
    }),
  sendMessage: os
    .input(
      z.object({
        conversationId: z.string().nonempty(),
        editorData: editorDataSchema,
        noEmail: z.boolean().optional(),
      }),
    )
    .handler(async ({ input: { conversationId, editorData, noEmail } }) => {
      const currentUser = await requireCurrentUser();
      const message = await sendConversationMessage({
        user: currentUser,
        conversationId,
        editorData,
        noEmail,
      });
      return await fetchConversationMessage(message._id);
    }),
  markConversationRead: os
    .input(z.object({ conversationId: z.string().nonempty() }))
    .handler(async ({ input: { conversationId } }) => {
      const currentUser = await requireCurrentUser();
      await markConversationRead(currentUser, conversationId);
    }),
  updateConversation: os
    .input(
      z.object({
        conversationId: z.string().nonempty(),
        title: z.string().nullable().optional(),
        participantIds: z.string().nonempty().array().nonempty().optional(),
        moderator: z.boolean().optional(),
      }),
    )
    .handler(async ({ input: { conversationId, ...updates } }) => {
      const currentUser = await requireCurrentUser();
      await updateConversation(currentUser, conversationId, updates);
      return await fetchConversationForUser(currentUser, conversationId);
    }),
  unreadCount: os.handler(async () => {
    const currentUser = await requireCurrentUser();
    return await fetchUnreadMessagesCount(currentUser);
  }),
};
