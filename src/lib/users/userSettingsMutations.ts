import { waitUntil } from "@vercel/functions";
import { captureException } from "@sentry/nextjs";
import { and, eq, ne, sql } from "drizzle-orm";
import type { CurrentUser } from "./currentUser";
import { db } from "../db";
import { posts, User, users } from "../schema";
import { updateWithFieldChanges } from "../fieldChanges";
import { getAllUsersByEmail, updateAuth0Email } from "../authHelpers";
import { slugify } from "../slugs/slugify";
import { postStatuses } from "../posts/postsHelpers";
import {
  isMailchimpListConfigured,
  syncUserMailchimpSubscription,
} from "../mailchimp";
import { objectKeys } from "../typeHelpers";
import { userCanEditUser, userIsBanned } from "./userHelpers";
import { elasticSyncDocument } from "../search/elastic/elasticSync";
import { getUserSettings, isEditableUserGroup } from "./userSettingsQueries";
import { approveUnreviewedSubmissions } from "./userApproval";
import { getUpdatableUserSettings, type UserSettings } from "./userSettings";
import {
  banUserIpsAndResetLoginTokens,
  deleteUserContent,
  nullifyVotesForUser,
  reindexUserContent,
} from "./userModeration";

type UserUpdate = Partial<typeof users.$inferInsert>;

const runInBackground = (task: () => Promise<unknown>) => {
  waitUntil(
    task().catch((e) => {
      console.error(e);
      captureException(e);
    }),
  );
};

const fetchUser = async (userId: string) => {
  const user = await db.query.users.findFirst({ where: { _id: userId } });
  if (!user) {
    throw new Error("User not found");
  }
  return user;
};

const isEmailTaken = async (email: string, userId: string) =>
  (await getAllUsersByEmail(email)).some(({ _id }) => _id !== userId);

const isSlugTaken = async (slug: string, userId: string) => {
  const result = await db.query.users.findFirst({
    columns: { _id: true },
    where: {
      _id: { ne: userId },
      OR: [{ slug }, { RAW: (users) => sql`${slug} = ANY(${users.oldSlugs})` }],
    },
  });
  return !!result;
};

const validateShortformPost = async (postId: string, userId: string) => {
  const post = await db.query.posts.findFirst({
    columns: { userId: true, draft: true, deletedDraft: true, status: true },
    where: { _id: postId },
  });
  if (!post) {
    throw new Error("Invalid post ID for shortform");
  }
  if (post.userId !== userId) {
    throw new Error(
      "Post can only be an author's short-form post if they are the post's author",
    );
  }
  if (post.draft) {
    throw new Error("Draft post cannot be a user's short-form post");
  }
  if (post.deletedDraft || post.status === postStatuses.STATUS_DELETED) {
    throw new Error("Deleted post cannot be a user's short-form post");
  }
};

type MailchimpUser = Pick<User, "email" | "displayName" | "mongoLocation">;

const syncDigestSubscription = async (
  user: MailchimpUser,
  subscribed: boolean,
  { ignoreErrors }: { ignoreErrors: boolean },
) => {
  try {
    await syncUserMailchimpSubscription({
      user,
      list: "digest",
      status: subscribed ? "subscribed" : "unsubscribed",
    });
  } catch (e) {
    captureException(e);
    if (!ignoreErrors) {
      throw e;
    }
  }
};

const getChangedEmail = (user: User, data: UserSettings) =>
  data.email !== undefined && data.email !== user.email ? data.email : null;

/**
 * Applies the email and digest subscription parts of an update to Auth0 and
 * Mailchimp before writing to the database, so no row lock is held during the
 * external calls. Each external change is undone if a later step fails.
 */
const withExternalAccountSync = async <T>(
  user: User,
  update: UserUpdate,
  write: () => Promise<T>,
) => {
  const undoSteps: (() => Promise<unknown>)[] = [];
  try {
    const oldEmail = user.email;
    const newEmail = update.email;
    if (newEmail && newEmail !== oldEmail) {
      await updateAuth0Email(user, newEmail);
      if (oldEmail) {
        undoSteps.push(() => updateAuth0Email(user, oldEmail));
      }
    }

    const nextUser: MailchimpUser = { ...user, ...update };
    const wasSubscribed = user.subscribedToDigest;
    const isSubscribed = update.subscribedToDigest ?? wasSubscribed;
    const addressChanged = nextUser.email !== oldEmail;
    if (addressChanged && wasSubscribed && !isMailchimpListConfigured("digest")) {
      console.error("Digest list not configured, not moving the subscription");
      return await write();
    }
    if (wasSubscribed && (!isSubscribed || addressChanged)) {
      await syncDigestSubscription(user, false, { ignoreErrors: false });
      undoSteps.push(() =>
        syncDigestSubscription(user, true, { ignoreErrors: false }),
      );
    }
    if (isSubscribed && (!wasSubscribed || addressChanged)) {
      await syncDigestSubscription(nextUser, true, { ignoreErrors: false });
      undoSteps.push(() =>
        syncDigestSubscription(nextUser, false, { ignoreErrors: false }),
      );
    }

    return await write();
  } catch (e) {
    for (const undo of undoSteps.reverse()) {
      try {
        await undo();
      } catch (undoError) {
        captureException(undoError);
      }
    }
    throw e;
  }
};

const toUserUpdate = async (user: User, data: UserSettings): Promise<UserUpdate> => {
  const { location, reviewedAt, banned, groups, ...rest } = data;
  const update: UserUpdate = { ...rest };

  if (location !== undefined) {
    update.location = location?.label ?? null;
    update.googleLocation = location?.googleLocation ?? null;
    update.mongoLocation = location
      ? {
          type: "Point",
          coordinates: [
            location.googleLocation.geometry.location.lng,
            location.googleLocation.geometry.location.lat,
          ],
        }
      : null;
    update.profileUpdatedAt = new Date().toISOString();
  }
  if (reviewedAt !== undefined) {
    update.reviewedAt = reviewedAt?.toISOString() ?? null;
  }
  if (banned !== undefined) {
    update.banned = banned?.toISOString() ?? null;
  }
  if (groups) {
    update.groups = [
      ...(user.groups ?? []).filter((group) => !isEditableUserGroup(group)),
      ...groups,
    ];
  }

  const newEmail = getChangedEmail(user, data);
  if (newEmail) {
    if (await isEmailTaken(newEmail, user._id)) {
      throw new Error("Email already taken");
    }
    const [, ...otherEmails] = user.emails ?? [];
    update.emails = [{ address: newEmail, verified: false }, ...otherEmails];
  }

  if (data.slug !== undefined) {
    const slug = slugify(data.slug);
    update.slug = slug;
    if (slug !== user.slug) {
      if (await isSlugTaken(slug, user._id)) {
        throw new Error(`Slug ${slug} is already taken`);
      }
      update.oldSlugs = [
        ...user.oldSlugs.filter((oldSlug) => oldSlug !== slug),
        user.slug,
      ];
    }
  }

  if (data.unsubscribeFromAll && !user.unsubscribeFromAll) {
    update.subscribedToDigest = false;
  }

  if (
    data.karmaChangeNotifierSettings &&
    data.karmaChangeNotifierSettings.updateFrequency !==
      user.karmaChangeNotifierSettings?.updateFrequency
  ) {
    update.karmaChangeLastOpened = null;
    update.karmaChangeBatchStart = null;
  }

  if (data.shortformFeedId && data.shortformFeedId !== user.shortformFeedId) {
    await validateShortformPost(data.shortformFeedId, user._id);
  }

  return update;
};

const setPostAsShortform = (postId: string) =>
  db
    .update(posts)
    .set({ shortform: true })
    .where(and(eq(posts._id, postId), ne(posts.shortform, true)));

export const updateUserSettings = async (
  currentUser: CurrentUser,
  userId: string,
  data: UserSettings,
) => {
  const user = await fetchUser(userId);
  const updatableFields = getUpdatableUserSettings(currentUser, user);
  const fields = objectKeys(data);
  if (!fields.length) {
    return getUserSettings(user, updatableFields);
  }
  if (fields.some((field) => !updatableFields.has(field))) {
    throw new Error("Permission denied");
  }

  const update = await toUserUpdate(user, data);
  const updatedUser = await withExternalAccountSync(user, update, () =>
    db.transaction((txn) =>
      updateWithFieldChanges(txn, currentUser, users, userId, update),
    ),
  );

  if (updatedUser.reviewedByUserId && !user.reviewedByUserId) {
    await approveUnreviewedSubmissions(userId);
  }
  if (
    updatedUser.shortformFeedId &&
    updatedUser.shortformFeedId !== user.shortformFeedId
  ) {
    await setPostAsShortform(updatedUser.shortformFeedId);
  }
  if (userIsBanned(updatedUser) && !userIsBanned(user)) {
    runInBackground(() => banUserIpsAndResetLoginTokens(userId));
  }
  if (updatedUser.nullifyVotes && !user.nullifyVotes) {
    runInBackground(() => nullifyVotesForUser(userId));
  }
  if (updatedUser.deleteContent && !user.deleteContent) {
    runInBackground(() => deleteUserContent(currentUser, userId));
  }
  waitUntil(elasticSyncDocument("Users", userId));
  return getUserSettings(updatedUser, updatableFields);
};

const applyAccountStatusUpdate = async (
  currentUser: CurrentUser,
  user: User,
  update: UserUpdate,
) => {
  const deactivating = update.deleted === true && !user.deleted;
  if (deactivating && user.subscribedToDigest) {
    await syncDigestSubscription(user, false, { ignoreErrors: true });
    update.subscribedToDigest = false;
  }
  await updateWithFieldChanges(db, currentUser, users, user._id, update);
  waitUntil(elasticSyncDocument("Users", user._id));
  if (update.deleted !== undefined && update.deleted !== user.deleted) {
    runInBackground(() => reindexUserContent(user._id));
  }
};

const fetchEditableUser = async (currentUser: CurrentUser, userId: string) => {
  const user = await fetchUser(userId);
  if (!userCanEditUser(currentUser, user)) {
    throw new Error("Permission denied");
  }
  return user;
};

export const setUserDeactivated = async (
  currentUser: CurrentUser,
  userId: string,
  deactivated: boolean,
) => {
  const user = await fetchEditableUser(currentUser, userId);
  if (!deactivated && user.permanentDeletionRequestedAt) {
    throw new Error("Revoke the deletion request to reactivate this account");
  }
  await applyAccountStatusUpdate(currentUser, user, { deleted: deactivated });
};

export const setAccountDeletionRequested = async (
  currentUser: CurrentUser,
  userId: string,
  requested: boolean,
) => {
  const user = await fetchEditableUser(currentUser, userId);
  await applyAccountStatusUpdate(currentUser, user, {
    permanentDeletionRequestedAt: requested ? new Date().toISOString() : null,
    deleted: requested || user.deleted,
  });
};
