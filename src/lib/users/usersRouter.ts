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
import { calculateKarmaChanges } from "./karmaChanges";
import {
  fetchOnboardingUsers,
  fetchUserBySlug,
  fetchUsersById,
  isDisplayNameTaken,
  updateExpandedSection,
  updateProfileImage,
  updateWork,
} from "./userQueries";
import {
  approveNewUser,
  completeUserProfile,
  userCheckNotifications,
} from "./userMutations";
import { themeSchema } from "../themes";
import {
  mailchimpListSchema,
  updateMailchimpSubscription,
  updateUserMailchimpSubscription,
} from "../mailchimp";
import {
  LOGIN_TOKEN_COOKIE_NAME,
  loginWithPassword,
  signupWithPassword,
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
        isSignup: z.boolean().optional(),
      }),
    )
    .handler(async ({ input: { email, password, isSignup } }) => {
      try {
        const cookieStore = await cookies();
        const hashedToken = isSignup
          ? await signupWithPassword(cookieStore, email, password)
          : await loginWithPassword(cookieStore, email, password);
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
  listBySlug: os
    .input(z.object({ slug: z.string().nonempty() }))
    .handler(async ({ input: { slug } }) => {
      const currentUser = await getCurrentUser();
      return await fetchUserBySlug(currentUser, slug);
    }),
  listByIds: os
    .input(z.object({ userIds: z.array(z.string()) }))
    .handler(async ({ input: { userIds } }) => {
      const currentUser = await getCurrentUser();
      return await fetchUsersById(currentUser, userIds);
    }),
  hideDigestAd: os.handler(async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Please login");
    }
    await db
      .update(users)
      .set({ hideSubscribePoke: true })
      .where(eq(users._id, currentUser._id));
  }),
  subscribeToList: os
    .input(
      z.object({
        list: mailchimpListSchema,
        email: z.string().optional(),
        subscribed: z.boolean().optional(),
      }),
    )
    .handler(async ({ input: { list, email, subscribed = true } }) => {
      const status = subscribed ? "subscribed" : "unsubscribed";
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
  updateSendMarketingEmails: os
    .input(z.object({ value: z.boolean() }))
    .handler(async ({ input: { value } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      await updateWithFieldChanges(db, currentUser, users, currentUser._id, {
        sendMarketingEmails: value,
      });
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
  updateProfileImage: os
    .input(
      z.object({
        userId: z.string().nonempty(),
        profileImageId: z.string().nonempty().nullable(),
      }),
    )
    .handler(async ({ input: { userId, profileImageId } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      await updateProfileImage(currentUser, userId, profileImageId);
    }),
  fetchOnboardingUsers: os.handler(fetchOnboardingUsers),
  karmaChanges: os
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .handler(async ({ input: { startDate, endDate } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      return await calculateKarmaChanges(currentUser, startDate, endDate);
    }),
  checkNotifications: os
    .input(
      z.object({
        hasKarmaChanges: z.boolean(),
        openedAt: z.date(),
        endDate: z.date(),
      }),
    )
    .handler(async ({ input: { hasKarmaChanges, openedAt, endDate } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      return await userCheckNotifications({
        currentUser,
        hasKarmaChanges,
        openedAt,
        endDate,
      });
    }),
};
