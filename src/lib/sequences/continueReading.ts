import { eq } from "drizzle-orm";
import sortBy from "lodash/sortBy";
import { db } from "../db";
import { users } from "../schema";
import type { CurrentUser } from "../users/currentUser";
import { fetchPostsListByIds } from "../posts/postLists";
import { fetchCollectionPosts } from "../collections/collectionQueries";
import {
  fetchSequencePosts,
  fetchSequencesByIds,
  SequencePost,
} from "./sequenceQueries";
import { collectionGetPageUrl } from "../collections/collectionHelpers";
import { sequenceGetPageUrl, sequenceReadPostCount } from "./sequenceHelpers";

/**
 * Stored in the user's `partiallyReadSequences`. Each entry is for either a
 * sequence or a collection (when the user has finished a sequence that has a
 * canonical collection, but not the whole collection).
 */
export type PartiallyReadSequence = {
  sequenceId?: string;
  collectionId?: string;
  lastReadPostId: string;
  nextPostId: string;
  numRead: number;
  numTotal: number;
  lastReadTime: string;
};

const fetchPartiallyReadSequences = async (userId: string) => {
  const user = await db.query.users.findFirst({
    columns: { partiallyReadSequences: true },
    where: { _id: userId },
  });
  return user?.partiallyReadSequences ?? [];
};

const setPartiallyReadSequences = (
  userId: string,
  partiallyReadSequences: PartiallyReadSequence[],
) => db.update(users).set({ partiallyReadSequences }).where(eq(users._id, userId));

const getReadingProgress = (posts: SequencePost[]) => {
  const nextPost = posts.find((post) => !post.readStatus?.[0]?.isRead);
  return nextPost
    ? {
        nextPostId: nextPost._id,
        numRead: sequenceReadPostCount(posts),
        numTotal: posts.length,
      }
    : null;
};

/**
 * Called when the user navigates to `postId` within `sequenceId`. Records the
 * next unread post in the sequence, or in its canonical collection if the
 * sequence is finished, so that it can be shown in "Continue reading".
 */
export const updateContinueReading = async ({
  currentUser,
  sequenceId,
  postId,
}: {
  currentUser: CurrentUser;
  sequenceId: string;
  postId: string;
}) => {
  const [partiallyRead, sequencePosts, sequence] = await Promise.all([
    fetchPartiallyReadSequences(currentUser._id),
    fetchSequencePosts({ currentUser, sequenceId }),
    db.query.sequences.findFirst({
      columns: { canonicalCollectionSlug: true },
      where: { _id: sequenceId },
    }),
  ]);
  const collection = sequence?.canonicalCollectionSlug
    ? await db.query.collections.findFirst({
        columns: { _id: true },
        where: { slug: sequence.canonicalCollectionSlug },
      })
    : null;

  const otherEntries = partiallyRead.filter(
    (entry) =>
      entry.sequenceId !== sequenceId &&
      (!collection || entry.collectionId !== collection._id),
  );
  const lastReadTime = new Date().toISOString();

  const sequenceProgress = getReadingProgress(sequencePosts);
  if (sequenceProgress) {
    await setPartiallyReadSequences(currentUser._id, [
      ...otherEntries,
      { sequenceId, lastReadPostId: postId, ...sequenceProgress, lastReadTime },
    ]);
    return;
  }

  if (collection) {
    const collectionPosts = await fetchCollectionPosts({
      currentUser,
      collectionId: collection._id,
    });
    const collectionProgress = getReadingProgress(collectionPosts);
    if (collectionProgress) {
      await setPartiallyReadSequences(currentUser._id, [
        ...otherEntries,
        {
          collectionId: collection._id,
          lastReadPostId: postId,
          ...collectionProgress,
          lastReadTime,
        },
      ]);
      return;
    }
  }

  if (partiallyRead.some((entry) => entry.sequenceId === sequenceId)) {
    await setPartiallyReadSequences(currentUser._id, otherEntries);
  }
};

export const dismissContinueReading = async ({
  currentUser,
  postId,
}: {
  currentUser: CurrentUser;
  postId: string;
}) => {
  const partiallyRead = await fetchPartiallyReadSequences(currentUser._id);
  if (partiallyRead.some((entry) => entry.nextPostId === postId)) {
    await setPartiallyReadSequences(
      currentUser._id,
      partiallyRead.filter((entry) => entry.nextPostId !== postId),
    );
  }
};

export const fetchContinueReading = async (currentUser: CurrentUser) => {
  const partiallyRead = sortBy(
    await fetchPartiallyReadSequences(currentUser._id),
    "lastReadTime",
  ).reverse();
  if (!partiallyRead.length) {
    return [];
  }
  const [posts, sequences, collections] = await Promise.all([
    fetchPostsListByIds(
      currentUser._id,
      partiallyRead.map(({ nextPostId }) => nextPostId),
    ),
    fetchSequencesByIds({
      currentUser,
      sequenceIds: partiallyRead.flatMap(({ sequenceId }) =>
        sequenceId ? [sequenceId] : [],
      ),
    }),
    db.query.collections.findMany({
      columns: { _id: true, slug: true, title: true },
      where: {
        _id: {
          in: partiallyRead.flatMap(({ collectionId }) =>
            collectionId ? [collectionId] : [],
          ),
        },
      },
    }),
  ]);
  return partiallyRead.flatMap(
    ({ sequenceId, collectionId, nextPostId, numRead, numTotal }) => {
      const nextPost = posts.find(({ _id }) => _id === nextPostId);
      const sequence = sequenceId
        ? sequences.find(({ _id }) => _id === sequenceId)
        : null;
      const collection = collectionId
        ? collections.find(({ _id }) => _id === collectionId)
        : null;
      const source: {
        sequenceId: string | null;
        title: string;
        url: string;
      } | null = sequence
        ? {
            sequenceId: sequence._id,
            title: sequence.title,
            url: sequenceGetPageUrl({ sequence }),
          }
        : collection
          ? {
              sequenceId: null,
              title: collection.title,
              url: collectionGetPageUrl({ collection }),
            }
          : null;
      return nextPost && source ? [{ nextPost, numRead, numTotal, ...source }] : [];
    },
  );
};

export type ContinueReadingItem = Awaited<
  ReturnType<typeof fetchContinueReading>
>[number];
