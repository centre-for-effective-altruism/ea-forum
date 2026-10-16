import uniq from "lodash/uniq";
import { z } from "zod/v4";
import { os } from "@orpc/server";
import { getCurrentUser } from "../users/currentUser";
import { createConversation } from "./messageMutations";
import { fetchConversationByParticipants } from "./messageQueries";
import { userCanInitiateConversations } from "../users/userHelpers";

export const messagesRouter = {
  createConversation: os
    .input(
      z.object({
        userIds: z.string().nonempty().array().nonempty(),
        includeModerators: z.boolean().optional().default(false),
      }),
    )
    .handler(async ({ input: { userIds, includeModerators } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
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
};
