import { eq, inArray } from "drizzle-orm";
import difference from "lodash/difference";
import sortBy from "lodash/sortBy";
import xor from "lodash/xor";
import type { DbOrTransaction } from "../db";
import { posts, sequences } from "../schema";
import { fetchSubscribedUsers } from "../subscriptions/subscriptionQueries";
import { subscriptionTypes } from "../subscriptions/subscriptionTypes";
import { createNotifications } from "../notifications/notificationMutations";

type ChapterPostFields = {
  title: string | null;
  subtitle: string | null;
  postIds: string[];
};

export const bumpSequenceLastUpdated = (txn: DbOrTransaction, sequenceId: string) =>
  txn
    .update(sequences)
    .set({ lastUpdated: new Date().toISOString() })
    .where(eq(sequences._id, sequenceId));

export const updateSequenceLastUpdated = async (
  txn: DbOrTransaction,
  sequenceId: string,
  oldChapter: ChapterPostFields,
  newChapter: ChapterPostFields,
) => {
  if (
    oldChapter.title !== newChapter.title ||
    oldChapter.subtitle !== newChapter.subtitle ||
    xor(oldChapter.postIds, newChapter.postIds).length > 0
  ) {
    await bumpSequenceLastUpdated(txn, sequenceId);
  }
};

export const notifyUsersOfNewSequencePosts = async ({
  currentUserId,
  sequenceId,
  postIds,
}: {
  currentUserId: string;
  sequenceId: string;
  postIds: string[];
}) => {
  if (!postIds.length) {
    return;
  }
  const subscribedUsers = await fetchSubscribedUsers({
    documentId: sequenceId,
    collectionName: "Sequences",
    type: subscriptionTypes.newSequencePosts,
  });
  await createNotifications({
    userIds: difference(
      subscribedUsers.map(({ _id }) => _id),
      [currentUserId],
    ),
    notificationType: "newSequencePosts",
    documentType: "sequence",
    documentId: sequenceId,
    extraData: { postIds },
  });
};

export const canonizeChapterPostInfo = async (
  txn: DbOrTransaction,
  sequence: { _id: string; userId: string | null },
) => {
  const sequenceId = sequence._id;
  const sequenceChapters = await txn.query.chapters.findMany({
    columns: { number: true, postIds: true },
    where: { sequenceId },
  });
  const sequencePostIds = sortBy(sequenceChapters, "number")
    .flatMap(({ postIds }) => postIds)
    .filter(Boolean);
  const [sequencePostRows, previouslyCanonicalPosts] = await Promise.all([
    sequencePostIds.length
      ? txn.query.posts.findMany({
          columns: {
            _id: true,
            userId: true,
            slug: true,
            canonicalSequenceId: true,
            canonicalPrevPostSlug: true,
            canonicalNextPostSlug: true,
          },
          where: { _id: { in: sequencePostIds } },
        })
      : [],
    txn.query.posts.findMany({
      columns: { _id: true },
      where: { canonicalSequenceId: sequenceId },
    }),
  ]);
  const postsById = new Map(sequencePostRows.map((post) => [post._id, post]));
  const orderedPosts = sequencePostIds.flatMap(
    (postId) => postsById.get(postId) ?? [],
  );

  const removedPostIds = difference(
    previouslyCanonicalPosts.map(({ _id }) => _id),
    orderedPosts.map(({ _id }) => _id),
  );
  if (removedPostIds.length) {
    await txn
      .update(posts)
      .set({
        canonicalPrevPostSlug: null,
        canonicalNextPostSlug: null,
        canonicalSequenceId: null,
      })
      .where(inArray(posts._id, removedPostIds));
  }

  for (const [i, post] of orderedPosts.entries()) {
    const canBeCanonized =
      post.userId === sequence.userId &&
      (!post.canonicalSequenceId || post.canonicalSequenceId === sequenceId);
    const prev = orderedPosts[i - 1]?.slug ?? "";
    const next = orderedPosts[i + 1]?.slug ?? "";
    const unchanged =
      post.canonicalSequenceId === sequenceId &&
      post.canonicalPrevPostSlug === prev &&
      post.canonicalNextPostSlug === next;
    if (canBeCanonized && !unchanged) {
      await txn
        .update(posts)
        .set({
          canonicalPrevPostSlug: prev,
          canonicalNextPostSlug: next,
          canonicalSequenceId: sequenceId,
        })
        .where(eq(posts._id, post._id));
    }
  }
};
