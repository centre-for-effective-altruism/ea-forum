import { eq, sql } from "drizzle-orm";
import { z } from "zod/v4";
import difference from "lodash/difference";
import union from "lodash/union";
import { users, Post } from "../schema";
import { db, type DbOrTransaction } from "../db";
import { postIsPublic } from "./postsHelpers";
import { fetchSubscribedUsers } from "../subscriptions/subscriptionQueries";
import { subscriptionTypes } from "../subscriptions/subscriptionTypes";
import { createNotifications } from "../notifications/notificationMutations";

export const updatePostUser = async (txn: DbOrTransaction, post: Post) => {
  if (!post.userId) {
    return;
  }
  await txn
    .update(users)
    .set({
      postCount: sql<number>`${users.postCount} + 1`,
      maxPostCount: sql<number>`GREATEST(${users.maxPostCount}, ${users.maxPostCount} + 1)`,
      ...(post.frontpageDate
        ? { frontpagePostCount: sql<number>`${users.frontpagePostCount} + 1` }
        : null),
      ...(post.shortform ? { shortformFeedId: post._id } : null),
    })
    .where(eq(users._id, post.userId));
};

const MILES_PER_METER = 0.000621371;

const mongoPointSchema = z.object({
  coordinates: z.tuple([z.number(), z.number()]),
});

const fetchUserIdsWithEventInNotificationRadius = async ({
  coordinates: [longitude, latitude],
}: z.infer<typeof mongoPointSchema>) => {
  const results = await db.query.users.findMany({
    columns: { _id: true },
    where: {
      RAW: (users) => sql`
        EARTH_DISTANCE(
          LL_TO_EARTH(
            (${users.nearbyEventsNotificationsMongoLocation}->'coordinates'->1)::FLOAT8,
            (${users.nearbyEventsNotificationsMongoLocation}->'coordinates'->0)::FLOAT8
          ),
          LL_TO_EARTH(${latitude}, ${longitude})
        ) * ${MILES_PER_METER} < ${users.nearbyEventsNotificationsRadius}
      `,
    },
  });
  return results.map(({ _id }) => _id);
};

export const newPostNotifications = async (postId: string) => {
  const post = await db.query.posts.findFirst({
    columns: {
      _id: true,
      userId: true,
      groupId: true,
      isEvent: true,
      mongoLocation: true,
      draft: true,
      status: true,
      rejected: true,
    },
    with: {
      group: { columns: { organizerIds: true } },
    },
    where: { _id: postId },
  });
  if (!post?.userId || !postIsPublic(post)) {
    return;
  }

  let notifiedUserIds = [post.userId];

  if (post.group) {
    const groupSubscribers = await fetchSubscribedUsers({
      documentId: post.groupId,
      collectionName: "Localgroups",
      type: subscriptionTypes.newEvents,
      potentiallyDefaultSubscribedUserIds: post.group.organizerIds,
      userIsDefaultSubscribed: (u) => u.autoSubscribeAsOrganizer,
    });
    const userIds = difference(
      groupSubscribers.map(({ _id }) => _id),
      notifiedUserIds,
    );
    await createNotifications({
      userIds,
      notificationType: post.isEvent ? "newEvent" : "newGroupPost",
      documentType: "post",
      documentId: post._id,
    });
    notifiedUserIds = union(notifiedUserIds, userIds);
  }

  const eventLocation = mongoPointSchema.safeParse(post.mongoLocation);
  if (post.isEvent && eventLocation.success) {
    const userIds = difference(
      await fetchUserIdsWithEventInNotificationRadius(eventLocation.data),
      notifiedUserIds,
    );
    await createNotifications({
      userIds,
      notificationType: "newEventInRadius",
      documentType: "post",
      documentId: post._id,
    });
    notifiedUserIds = union(notifiedUserIds, userIds);
  }

  const authorSubscribers = await fetchSubscribedUsers({
    documentId: post.userId,
    collectionName: "Users",
    type: subscriptionTypes.newPosts,
  });
  await createNotifications({
    userIds: difference(
      authorSubscribers.map(({ _id }) => _id),
      notifiedUserIds,
    ),
    notificationType: "newPost",
    documentType: "post",
    documentId: post._id,
  });
};
