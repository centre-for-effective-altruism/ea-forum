import { z } from "zod/v4";
import { os } from "@orpc/server";
import { getCurrentUser } from "../users/currentUser";
import {
  fetchCommunitySequences,
  fetchSequenceById,
  fetchSequencePosts,
} from "./sequenceQueries";
import {
  dismissContinueReading,
  fetchContinueReading,
  updateContinueReading,
} from "./continueReading";
import { sequenceEditDataSchema } from "./sequenceHelpers";
import { editSequence } from "./sequenceMutations";

export const sequencesRouter = {
  listById: os
    .input(z.object({ _id: z.string() }))
    .handler(async ({ input: { _id } }) => {
      const currentUser = await getCurrentUser();
      return fetchSequenceById({ currentUser, sequenceId: _id });
    }),
  listPosts: os
    .input(z.object({ sequenceId: z.string().nonempty() }))
    .handler(async ({ input: { sequenceId } }) => {
      const currentUser = await getCurrentUser();
      return await fetchSequencePosts({ currentUser, sequenceId });
    }),
  listCommunitySequences: os
    .input(
      z.object({
        offset: z.number().min(0).optional(),
        limit: z.number().min(0).max(50).optional(),
      }),
    )
    .handler(async ({ input: { offset, limit } }) => {
      const items = await fetchCommunitySequences({ offset, limit });
      return { items };
    }),
  updateContinueReading: os
    .input(
      z.object({
        sequenceId: z.string().nonempty(),
        postId: z.string().nonempty(),
      }),
    )
    .handler(async ({ input: { sequenceId, postId } }) => {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        await updateContinueReading({ currentUser, sequenceId, postId });
      }
    }),
  listContinueReading: os.handler(async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Please login");
    }
    return await fetchContinueReading(currentUser);
  }),
  dismissContinueReading: os
    .input(z.object({ postId: z.string().nonempty() }))
    .handler(async ({ input: { postId } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      await dismissContinueReading({ currentUser, postId });
    }),
  edit: os
    .input(
      z.object({
        sequenceId: z.string().nonempty(),
        data: sequenceEditDataSchema,
      }),
    )
    .handler(async ({ input: { sequenceId, data } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      await editSequence(currentUser, sequenceId, data);
      return { sequenceId };
    }),
};
