import { z } from "zod/v4";
import { os } from "@orpc/server";
import { getCurrentUser } from "../users/currentUser";
import {
  addPollVote,
  removePollVote,
  addMcPollVote,
  removeMcPollVote,
} from "./forumEventMutations";
import { fetchForumEventById } from "./forumEventQueries";

export const forumEventsRouter = {
  listById: os
    .input(z.object({ _id: z.string().nonempty() }))
    .handler(async ({ input: { _id } }) => fetchForumEventById(_id)),
  addVote: os
    .input(
      z.object({
        forumEventId: z.string().nonempty(),
        postIds: z.string().nonempty().array().optional(),
        x: z.number(),
        delta: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      await addPollVote({ ...input, currentUser });
    }),
  removeVote: os
    .input(z.object({ forumEventId: z.string().nonempty() }))
    .handler(async ({ input: { forumEventId } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      await removePollVote(currentUser, forumEventId);
    }),
  addMcVote: os
    .input(
      z.object({
        forumEventId: z.string().nonempty(),
        answerIds: z.array(z.string().nonempty()).max(50),
      }),
    )
    .handler(async ({ input: { forumEventId, answerIds } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      return await addMcPollVote({ currentUser, forumEventId, answerIds });
    }),
  removeMcVote: os
    .input(z.object({ forumEventId: z.string().nonempty() }))
    .handler(async ({ input: { forumEventId } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      await removeMcPollVote(currentUser, forumEventId);
    }),
};
