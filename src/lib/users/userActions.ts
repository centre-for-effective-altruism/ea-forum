"use server";

import { z } from "zod/v4";
import { eq } from "drizzle-orm";
import { actionClient } from "../actionClient";
import { getCurrentUser } from "@/lib/users/currentUser";
import { userIsInGroup } from "./userHelpers";
import { db } from "../db";
import { users } from "../schema";
import { updateWithFieldChanges } from "../fieldChanges";
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
    await updateWithFieldChanges(db, currentUser, users, currentUser._id, {
      hideSubscribePoke: true,
    });
  }
});

export const toggleAdminAction = actionClient.action(async () => {
  const currentUser = await getCurrentUser();
  if (!currentUser || !userIsInGroup(currentUser, "realAdmins")) {
    throw new Error("Permission denied");
  }
  await db
    .update(users)
    .set({
      isAdmin: !currentUser.isAdmin,
      groups: currentUser.isAdmin
        ? currentUser.groups?.filter((group) => group !== "sunshineRegiment")
        : [...(currentUser.groups ?? []), "sunshineRegiment"],
    })
    .where(eq(users._id, currentUser._id));
});
