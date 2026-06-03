import { z } from "zod/v4";
import { os } from "@orpc/server";
import { fetchForumEventById } from "./forumEventQueries";

export const forumEventsRouter = {
  listById: os
    .input(z.object({ _id: z.string().nonempty() }))
    .handler(async ({ input: { _id } }) => fetchForumEventById(_id)),
  addVote: os
    .input(z.object({
      forumEventId: z.string().nonempty(),
      postIds: z.string().nonempty().array().optional(),
      x: z.number(),
      delta: z.number().optional(),
    }))
    .handler(async () => {
      console.warn("Adding vote...");
      // TODO
    }),
  removeVote: os
    .input(z.object({ forumEventId: z.string().nonempty() }))
    .handler(async () => {
      console.warn("Removing vote...");
      // TODO
    }),
};
