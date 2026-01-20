"use server";

import { CurrentUser, getCurrentUser } from "@/lib/users/currentUser";
import { db } from "../db";
import { users } from "../schema";
import {
  updateMailchimpSubscription,
  updateUserMailchimpSubscription,
} from "../mailchimp";
import { eq } from "drizzle-orm";

export const fetchCurrentUserAction = async (): Promise<CurrentUser | null> =>
  getCurrentUser();

export const subscribeToDigestAction = async ({ email }: { email?: string }) => {
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
};

export const hideSubscribePokeAction = async () => {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    await db
      .update(users)
      .set({ hideSubscribePoke: true })
      .where(eq(users._id, currentUser._id));
  }
};
