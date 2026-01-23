"use server";

import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { actionClient } from "../actionClient";
import { getCurrentUser } from "@/lib/users/currentUser";
import { db } from "../db";
import { users } from "../schema";
import {
  updateMailchimpSubscription,
  updateUserMailchimpSubscription,
} from "../mailchimp";

export const fetchCurrentUserAction = actionClient.action(getCurrentUser);

export const subscribeToDigestAction = actionClient
  .inputSchema(z.object({ email: z.string().optional() }))
  .action(async ({ parsedInput: { email } }) => {
    const list = "digest";
    const status = "subscribed";
    const currentUser = await getCurrentUser();
    if (currentUser) {
      await updateUserMailchimpSubscription({
        list,
        status,
        user: currentUser,
      });
    } else if (email) {
      await updateMailchimpSubscription({
        list,
        status,
        email,
      });
    } else {
      throw new Error("No email provided");
    }
  });

export const hideSubscribePokeAction = actionClient.action(async () => {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    await db
      .update(users)
      .set({ hideSubscribePoke: true })
      .where(eq(users._id, currentUser._id));
  }
});
