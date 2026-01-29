"use server";

import { z } from "zod/v4";
import { actionClient } from "../actionClient";
import { getCurrentUser } from "../users/currentUser";
import { fetchSubscription, updateSubscription } from "./subscriptionsMutations";
import { isSubscriptionType } from "./subscriptionTypes";

export const fetchSubscriptionAction = actionClient
  .inputSchema(
    z.object({
      collectionName: z.string(),
      documentId: z.string(),
      type: z.string(),
    }),
  )
  .action(async ({ parsedInput: { collectionName, documentId, type } }) => {
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
  });

export const updateSubscriptionAction = actionClient
  .inputSchema(
    z.object({
      collectionName: z.string(),
      documentId: z.string(),
      type: z.string(),
      subscribed: z.boolean(),
    }),
  )
  .action(
    async ({ parsedInput: { collectionName, documentId, type, subscribed } }) => {
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
    },
  );
