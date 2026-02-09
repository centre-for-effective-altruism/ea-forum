"use server";

import { z } from "zod/v4";
import { actionClient } from "../actionClient";

export const observeRecommendationAction = actionClient
  .inputSchema(
    z.object({
      postId: z.string(),
    }),
  )
  .action(async () => {
    // TODO
  });

export const clickRecommendationAction = actionClient
  .inputSchema(
    z.object({
      postId: z.string(),
    }),
  )
  .action(async () => {
    // TODO
  });
