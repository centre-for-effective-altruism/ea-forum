import { z } from "zod/v4";
import { os } from "@orpc/server";
import { getCurrentUser } from "../users/currentUser";
import { getCurrentClientId } from "../clientIds/currentClientId";
import RecommendationService from "./RecommendationService";

export const recommendationsRouter = {
  observe: os
    .input(
      z.object({
        postId: z.string(),
      }),
    )
    .handler(async ({ input: { postId } }) => {
      const [currentUser, clientId] = await Promise.all([
        getCurrentUser(),
        getCurrentClientId(),
      ]);
      const service = new RecommendationService();
      await service.markRecommendationAsObserved(currentUser, clientId, postId);
    }),
  click: os
    .input(
      z.object({
        postId: z.string(),
      }),
    )
    .handler(async ({ input: { postId } }) => {
      const [currentUser, clientId] = await Promise.all([
        getCurrentUser(),
        getCurrentClientId(),
      ]);
      const service = new RecommendationService();
      await service.markRecommendationAsClicked(currentUser, clientId, postId);
    }),
};
