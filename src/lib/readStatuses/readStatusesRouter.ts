import { z } from "zod/v4";
import { os } from "@orpc/server";
import { getCurrentUser } from "../users/currentUser";
import { upsertReadStatus } from "./readStatusQueries";

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
};
