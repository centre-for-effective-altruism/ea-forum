import keyBy from "lodash/keyBy";
import union from "lodash/union";
import { db } from "../db";
import type { User } from "../schema";
import type { SubscribableCollection } from "./subscriptionTypes";

type SubscriptionUser = Pick<
  User,
  "_id" | "auto_subscribe_to_my_posts" | "auto_subscribe_to_my_comments"
>;

/**
 * Return a list of users subscribed to a given document. This is the union of
 * users who have subscribed to it explicitly, and users who were subscribed to
 * it by default and didn't suppress the subscription.
 *
 * documentId: The document to look for subscriptions to.
 * collectionName: The collection the document to look for subscriptions to is in.
 * type: The type of subscription to check for.
 * potentiallyDefaultSubscribedUserIds: (Optional) An array of user IDs for
 *   users who are potentially subscribed to this document by default, eg
 *   because they wrote the post being replied to or are an organizer of the
 *   group posted in.
 * userIsDefaultSubscribed: (Optional. User=>bool) If
 *   potentiallyDefaultSubscribedUserIds is given, takes a user and returns
 *   whether they would be default-subscribed to this document.
 */
export const fetchSubscribedUsers = async ({
  documentId,
  collectionName,
  type,
  potentiallyDefaultSubscribedUserIds = null,
  userIsDefaultSubscribed = null,
}: {
  documentId: string | null;
  collectionName: SubscribableCollection;
  type: string;
  potentiallyDefaultSubscribedUserIds?: null | string[];
  userIsDefaultSubscribed?: null | ((u: SubscriptionUser) => boolean);
}) => {
  if (!documentId) {
    return [];
  }

  const subscriptions = await db.query.subscriptions.findMany({
    columns: {
      userId: true,
    },
    where: {
      documentId,
      type,
      collectionName,
      deleted: false,
      state: "subscribed",
    },
  });

  const explicitlySubscribedUsers = await db.query.users.findMany({
    columns: {
      _id: true,
    },
    where: {
      _id: { in: subscriptions.map(({ userId }) => userId) },
    },
  });
  const explicitlySubscribedUsersDict = keyBy(explicitlySubscribedUsers, "_id");

  // Handle implicitly subscribed users
  if ((potentiallyDefaultSubscribedUserIds?.length ?? 0) > 0) {
    // Filter explicitly-subscribed users out of the potentially implicitly
    // subscribed users list, since their subscription status is already known
    potentiallyDefaultSubscribedUserIds =
      potentiallyDefaultSubscribedUserIds!.filter(
        (id) => !(id in explicitlySubscribedUsersDict),
      );

    // Fetch and filter potentially-subscribed users
    const potentiallyDefaultSubscribedUsers = await db.query.users.findMany({
      columns: {
        _id: true,
        auto_subscribe_to_my_posts: true,
        auto_subscribe_to_my_comments: true,
      },
      where: {
        _id: { in: potentiallyDefaultSubscribedUserIds },
      },
    });
    const defaultSubscribedUsers = userIsDefaultSubscribed
      ? potentiallyDefaultSubscribedUsers.filter(userIsDefaultSubscribed)
      : potentiallyDefaultSubscribedUsers;

    // Check for suppression in the subscriptions table
    const suppressions = await db.query.subscriptions.findMany({
      columns: {
        userId: true,
      },
      where: {
        documentId,
        type,
        collectionName,
        deleted: false,
        state: "suppressed",
      },
    });
    const suppressionsByUserId = keyBy(suppressions, "userId");
    const defaultSubscribedUsersNotSuppressed = defaultSubscribedUsers.filter(
      (u) => !(u._id in suppressionsByUserId),
    );

    return union(explicitlySubscribedUsers, defaultSubscribedUsersNotSuppressed);
  }

  return explicitlySubscribedUsers;
};
