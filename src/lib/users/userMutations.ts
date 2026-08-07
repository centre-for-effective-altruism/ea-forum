import { eq, inArray } from "drizzle-orm";
import type { CurrentUser } from "./currentUser";
import type { JsonRecord } from "../typeHelpers";
import { updateWithFieldChanges } from "../fieldChanges";
import { randomId } from "../utils/random";
import { db } from "../db";
import { User, users } from "../schema";
import { userCanDo, userGetLocation } from "./userHelpers";
import { getUniqueSlug } from "../slugs/uniqueSlug";
import { isDisplayNameTaken } from "./userQueries";
import { getDefaultFilterSettings } from "../filterSettings";
import { elasticSyncDocument } from "../search/elastic/elasticSync";
import { updateMailchimpSubscription } from "../mailchimp";
import {
  dailyEmailBatchNotificationSettings,
  emailEnabledNotificationTypeSettings,
} from "../notifications/notificationHelpers";

export const createUser = async ({
  clientId,
  displayName: requestedDisplayName,
  email,
  emailVerified,
  services,
}: {
  clientId: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  services: JsonRecord;
}): Promise<User> => {
  const displayName =
    !requestedDisplayName || email === requestedDisplayName
      ? `new_user_${Math.floor(Math.random() * 10e9)}`
      : requestedDisplayName;
  const slug = await getUniqueSlug(db, users, displayName);
  const [user] = await db
    .insert(users)
    .values([
      {
        _id: randomId(),
        displayName,
        username: slug,
        usernameUnset: true,
        slug,
        email,
        emails: [{ address: email, verified: emailVerified }],
        services,
        theme: { name: "auto" },
        frontpageFilterSettings: getDefaultFilterSettings(),
        mapLocationSet: false,
        conversationsDisabled: false,
        abTestKey: clientId || randomId(),
        // TODO: These notification values need to be set here because the database
        // defaults use LessWrong's values, which are different from the EA Forum. At
        // this point we should just update the default values in a migration.
        notificationCommentsOnSubscribedPost: dailyEmailBatchNotificationSettings,
        notificationShortformContent: dailyEmailBatchNotificationSettings,
        notificationRepliesToMyComments: emailEnabledNotificationTypeSettings,
        notificationRepliesToSubscribedComments: dailyEmailBatchNotificationSettings,
        notificationSubscribedUserPost: dailyEmailBatchNotificationSettings,
        notificationSubscribedUserComment: dailyEmailBatchNotificationSettings,
        notificationKarmaPowersGained: emailEnabledNotificationTypeSettings,
        notificationNewMention: emailEnabledNotificationTypeSettings,
        notificationNewPingback: emailEnabledNotificationTypeSettings,
      },
    ])
    .returning();
  const { lat: latitude, lng: longitude } = userGetLocation(user);
  void updateMailchimpSubscription({
    list: "eaForum",
    status: "subscribed",
    email,
    displayName,
    location: { latitude, longitude },
  });
  void elasticSyncDocument("Users", user._id);
  return user;
};

export const completeUserProfile = async (
  currentUser: CurrentUser,
  name: string,
  acceptedTos: boolean,
) => {
  if (!acceptedTos) {
    throw new Error("You must accept the terms of use to continue");
  }
  if (!currentUser.usernameUnset) {
    throw new Error("Only new users can set their username this way");
  }
  await db.transaction(async (txn) => {
    const [isTaken, slug] = await Promise.all([
      isDisplayNameTaken(currentUser, name, txn),
      getUniqueSlug(txn, users, name, currentUser._id),
    ]);
    if (isTaken) {
      throw new Error("Display name already taken");
    }
    if (!slug) {
      throw new Error("Failed to generate slug");
    }
    await updateWithFieldChanges(db, currentUser, users, currentUser._id, {
      displayName: name,
      username: name,
      slug,
      acceptedTos,
      usernameUnset: false,
      subscribedToDigest: false,
    });
  });
  void elasticSyncDocument("Users", currentUser._id);
};

export const approveNewUser = async (
  currentUser: CurrentUser,
  userIdToApprove: string,
) => {
  if (!userCanDo(currentUser, "posts.edit.all")) {
    throw new Error("Permission denied");
  }
  await updateWithFieldChanges(db, currentUser, users, userIdToApprove, {
    reviewedByUserId: currentUser._id,
    sunshineFlagged: false,
    reviewedAt: new Date().toISOString(),
    needsReview: false,
    snoozedUntilContentCount: null,
  });
  void elasticSyncDocument("Users", userIdToApprove);
};

export const userCheckNotifications = async ({
  currentUser,
  hasKarmaChanges,
  openedAt,
  endDate,
}: {
  currentUser: CurrentUser;
  hasKarmaChanges: boolean;
  openedAt: Date;
  endDate: Date;
}) => {
  await db
    .update(users)
    .set({
      lastNotificationsCheck: openedAt.toISOString(),
      ...(hasKarmaChanges && {
        karmaChangeBatchStart: openedAt.toISOString(),
        karmaChangeLastOpened: endDate.toISOString(),
      }),
    })
    .where(eq(users._id, currentUser._id));
};

export const swapUserEmails = async (userId1: string, userId2: string) => {
  if (!userId1 || !userId2 || userId1 === userId2) {
    throw new Error("Invalid user ids");
  }
  await db.transaction(async (txn) => {
    const results = await txn
      .select({
        _id: users._id,
        email: users.email,
        emails: users.emails,
        services: users.services,
      })
      .from(users)
      .where(inArray(users._id, [userId1, userId2]))
      .for("update");
    const usersById = new Map(results.map((user) => [user._id, user]));
    const user1 = usersById.get(userId1);
    const user2 = usersById.get(userId2);
    if (!user1 || !user2) {
      throw new Error("Invalid user ids");
    }
    await txn
      .update(users)
      .set({
        email: user2.email,
        emails: user2.emails,
        services: {
          ...user1.services,
          auth0: user2.services?.auth0 ?? null,
        },
      })
      .where(eq(users._id, userId1));
    await txn
      .update(users)
      .set({
        email: user1.email,
        emails: user1.emails,
        services: {
          ...user2.services,
          auth0: user1.services?.auth0 ?? null,
        },
      })
      .where(eq(users._id, userId2));
  });
};
