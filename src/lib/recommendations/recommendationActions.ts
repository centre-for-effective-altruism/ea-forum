"use server";

import { z } from "zod/v4";
import { actionClient } from "../actionClient";
import { getCurrentUser } from "../users/currentUser";
import { getCurrentClientId } from "../clientIds/currentClientId";
import RecommendationService from "./RecommendationService";

export const observeRecommendationAction = actionClient
  .inputSchema(
    z.object({
      postId: z.string(),
    }),
  )
  .action(async ({ parsedInput: { postId } }) => {
    const [currentUser, clientId] = await Promise.all([
      getCurrentUser(),
      getCurrentClientId(),
    ]);
    const service = new RecommendationService();
    await service.markRecommendationAsObserved(currentUser, clientId, postId);
  });

export const clickRecommendationAction = actionClient
  .inputSchema(
    z.object({
      postId: z.string(),
    }),
  )
  .action(async ({ parsedInput: { postId } }) => {
    const [currentUser, clientId] = await Promise.all([
      getCurrentUser(),
      getCurrentClientId(),
    ]);
    const service = new RecommendationService();
    await service.markRecommendationAsClicked(currentUser, clientId, postId);
  });
