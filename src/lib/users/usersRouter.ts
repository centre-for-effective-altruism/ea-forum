import { z } from "zod/v4";
import { os } from "@orpc/server";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../schema";
import { getCurrentUser } from "@/lib/users/currentUser";
import { userIsInGroup } from "./userHelpers";
import { updateWithFieldChanges } from "../fieldChanges";
import { approveNewUser } from "./userMutations";
import {
  updateMailchimpSubscription,
  updateUserMailchimpSubscription,
} from "../mailchimp";

export const usersRouter = {
  currentUser: os.handler(getCurrentUser),
  subscribeToDigest: os
    .input(z.object({ email: z.string().optional() }))
    .handler(async ({ input: { email } }) => {
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
    }),
  hideSubscribePoke: os.handler(async () => {
    const currentUser = await getCurrentUser();
    if (currentUser) {
      await updateWithFieldChanges(db, currentUser, users, currentUser._id, {
        hideSubscribePoke: true,
      });
    }
  }),
  toggleAdmin: os.handler(async () => {
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
  }),
  approveNewUser: os
    .input(z.object({ userId: z.string() }))
    .handler(async ({ input: { userId } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Permission denied");
      }
      await approveNewUser(currentUser, userId);
    }),
};
