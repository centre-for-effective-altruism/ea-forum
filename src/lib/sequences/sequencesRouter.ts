import { z } from "zod/v4";
import { os } from "@orpc/server";
import { getCurrentUser } from "../users/currentUser";
import { fetchSequenceById, fetchSequencePosts } from "./sequenceQueries";

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
};
