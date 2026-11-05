import { z } from "zod/v4";
import { os } from "@orpc/server";
import { getCurrentUser } from "../users/currentUser";
import { upsertReadStatus } from "./readStatusQueries";
import { fetchReadHistoryPosts } from "../posts/postLists";

export const readStatusesRouter = {
  update: os
    .input(
      z.object({
        postId: z.string().nonempty(),
        isRead: z.boolean(),
      }),
    )
    .handler(async ({ input: { postId, isRead } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      await upsertReadStatus({
        userId: currentUser._id,
        postId,
        isRead,
        updateIsReadIfAlreadyExists: true,
      });
    }),
  listHistory: os
    .input(
      z.object({
        offset: z.int().nonnegative().optional(),
        limit: z.int().positive().max(50).default(20),
      }),
    )
    .handler(async ({ input: { offset, limit } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      const items = await fetchReadHistoryPosts({
        currentUserId: currentUser._id,
        offset,
        limit,
      });
      return { items };
    }),
};
