"use server";

import { z } from "zod/v4";
import { actionClient } from "../actionClient";
import { getCurrentUser } from "../users/currentUser";
import { fetchNotificationDisplays } from "./fetchNotificationDisplays";

export const fetchNotificationsAction = actionClient
  .inputSchema(
    z.object({
      offset: z.number().min(0).default(0),
      limit: z.number().min(1).max(50).default(20),
    }),
  )
  .action(async ({ parsedInput: { offset, limit } }) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Please login");
    }
    return await fetchNotificationDisplays({
      userId: currentUser._id,
      offset,
      limit,
    });
  });
