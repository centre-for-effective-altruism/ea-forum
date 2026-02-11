import { os } from "@orpc/server";
import { z } from "zod/v4";
import { getCurrentUser } from "../users/currentUser";
import { fetchRecentDiscussions } from "./fetchRecentDiscussions";

export const recentDiscussions = {
  list: os
    .input(
      z.object({
        limit: z.number().min(1).max(50),
        cutoff: z.date().optional(),
        offset: z.number().min(0).optional(),
      }),
    )
    .handler(async ({ input }) => {
      const currentUser = await getCurrentUser();
      return fetchRecentDiscussions({
        currentUser,
        ...input,
      });
    }),
};
