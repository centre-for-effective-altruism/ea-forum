import { z } from "zod/v4";
import { os } from "@orpc/server";
import { getCurrentUser } from "../users/currentUser";
import { fetchNotificationDisplays } from "./fetchNotificationDisplays";

export const notificationsRouter = {
  list: os
    .input(
      z.object({
        offset: z.number().min(0).default(0),
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .handler(async ({ input: { offset, limit } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      return await fetchNotificationDisplays({
        userId: currentUser._id,
        offset,
        limit,
      });
    }),
};
