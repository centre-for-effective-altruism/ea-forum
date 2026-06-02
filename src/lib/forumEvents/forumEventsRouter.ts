import { z } from "zod/v4";
import { os } from "@orpc/server";
import { fetchForumEventById } from "./forumEventQueries";

export const forumEventsRouter = {
  listById: os
    .input(z.object({ _id: z.string().nonempty() }))
    .handler(async ({ input: { _id } }) => fetchForumEventById(_id)),
  removeVote: os
    .input(z.object({ forumEventId: z.string().nonempty() }))
    .handler(async () => {
      // TODO
    }),
};
