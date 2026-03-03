import { z } from "zod/v4";
import { os } from "@orpc/server";
import { getCurrentUser } from "../users/currentUser";
import { fetchSubscription, updateSubscription } from "./subscriptionsMutations";
import { isSubscriptionType } from "./subscriptionTypes";

export const subscriptionsRouter = {
  fetch: os
    .input(
      z.object({
        collectionName: z.string(),
        documentId: z.string(),
        type: z.string(),
      }),
    )
    .handler(async ({ input: { collectionName, documentId, type } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      if (!isSubscriptionType(type)) {
        throw new Error("Invalid subscription type");
      }
      return await fetchSubscription({
        currentUser,
        collectionName,
        documentId,
        type,
      });
    }),
  update: os
    .input(
      z.object({
        collectionName: z.string(),
        documentId: z.string(),
        type: z.string(),
        subscribed: z.boolean(),
      }),
    )
    .handler(async ({ input: { collectionName, documentId, type, subscribed } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      if (!isSubscriptionType(type)) {
        throw new Error("Invalid subscription type");
      }
      return await updateSubscription({
        currentUser,
        collectionName,
        documentId,
        type,
        subscribed,
      });
    }),
};
