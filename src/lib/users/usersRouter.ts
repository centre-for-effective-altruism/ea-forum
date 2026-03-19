import { z } from "zod/v4";
import { os } from "@orpc/server";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { captureException } from "@sentry/nextjs";
import { db } from "../db";
import { users } from "../schema";
import { careerStageValuesSchema, userIsInGroup } from "./userHelpers";
import { updateWithFieldChanges } from "../fieldChanges";
import { filterSettingsSchema } from "../filterSettings";
import {
  fetchOnboardingUsers,
  isDisplayNameTaken,
  updateExpandedSection,
  updateWork,
} from "./userQueries";
import { approveNewUser, completeUserProfile } from "./userMutations";
import { themeSchema } from "../themes";
import {
  updateMailchimpSubscription,
  updateUserMailchimpSubscription,
} from "../mailchimp";
import {
  LOGIN_TOKEN_COOKIE_NAME,
  loginWithPassword,
  UserIsBannedError,
} from "../authHelpers";
import {
  fetchCurrentUserByHashedToken,
  getCurrentUser,
} from "@/lib/users/currentUser";

export const usersRouter = {
  // This handles user/password login. Google login redirects through auth0
  // and uses the route handler at /auth/auth0/callback
  login: os
    .input(
      z.object({
        email: z.string().nonempty(),
        password: z.string().nonempty(),
      }),
    )
    .handler(async ({ input: { email, password } }) => {
      try {
        const cookieStore = await cookies();
        const hashedToken = await loginWithPassword(cookieStore, email, password);
        const currentUser = await fetchCurrentUserByHashedToken(hashedToken);
        return { ok: true, currentUser };
      } catch (e) {
        if (e instanceof UserIsBannedError) {
          return { redirect: "/ban-notice" };
        }
        captureException(e);
        if (e instanceof Error) {
          return { ok: false, error: e.message };
        }
        return { ok: false, error: "Unknown error" };
      }
    }),
  logout: os.handler(async () => {
    const cookieStore = await cookies();
    cookieStore.delete(LOGIN_TOKEN_COOKIE_NAME);
  }),
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
  updateFilterSettings: os.input(filterSettingsSchema).handler(async ({ input }) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Please login");
    }
    await db
      .update(users)
      .set({ frontpageFilterSettings: input })
      .where(eq(users._id, currentUser._id));
  }),
  updateTheme: os
    .input(z.object({ theme: themeSchema }))
    .handler(async ({ input: { theme } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      await db
        .update(users)
        .set({ theme: { name: theme } })
        .where(eq(users._id, currentUser._id));
    }),
  updateExpandedSection: os
    .input(z.object({ section: z.string(), expanded: z.boolean() }))
    .handler(async ({ input: { section, expanded } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      await updateExpandedSection(currentUser._id, section, expanded);
    }),
  completeUserProfile: os
    .input(
      z.object({
        name: z.string(),
        acceptedTos: z.boolean(),
      }),
    )
    .handler(async ({ input: { name, acceptedTos } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      await completeUserProfile(currentUser, name, acceptedTos);
    }),
  isDisplayNameTaken: os
    .input(z.object({ displayName: z.string().nonempty() }))
    .handler(async ({ input: { displayName } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      return await isDisplayNameTaken(currentUser, displayName);
    }),
  updateWork: os
    .input(
      z.object({
        jobTitle: z.string().nullable().optional(),
        organization: z.string().nullable().optional(),
        careerStage: z.array(careerStageValuesSchema).nullable().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      return await updateWork(currentUser, input);
    }),
  fetchOnboardingUsers: os.handler(fetchOnboardingUsers),
};
