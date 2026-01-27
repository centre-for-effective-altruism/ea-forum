"use server";

import { z } from "zod/v4";
import { actionClient } from "../actionClient";
import { getCurrentUser } from "../users/currentUser";
import { upsertReadStatus } from "./readStatusQueries";

export const updatePostReadStatusAction = actionClient
  .inputSchema(
    z.object({
      postId: z.string().nonempty(),
      isRead: z.boolean(),
    }),
  )
  .action(async ({ parsedInput: { postId, isRead } }) => {
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
  });
