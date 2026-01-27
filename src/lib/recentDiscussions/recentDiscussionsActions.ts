"use server";

import { z } from "zod/v4";
import { actionClient } from "../actionClient";
import { getCurrentUser } from "../users/currentUser";
import { fetchRecentDiscussions } from "./fetchRecentDiscussions";

export const fetchRecentDiscussionsAction = actionClient
  .inputSchema(
    z.object({
      limit: z.number().min(1).max(50),
      cutoff: z.date().optional(),
      offset: z.number().min(0).optional(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const currentUser = await getCurrentUser();
    return fetchRecentDiscussions({
      currentUser,
      ...parsedInput,
    });
  });
