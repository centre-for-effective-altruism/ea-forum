import "server-only";

import { inArray } from "drizzle-orm";
import { db, DbOrTransaction } from "../db";
import { digestPosts, posts, type InsertDigestPost } from "../schema";
import { randomId } from "../utils/random";
import { viewablePostFilter } from "../posts/postLists";

/**
 * Feature the given posts on the homepage by stamping `posts.onsiteDigestAt`
 * (which the homepage Featured list reads). Only posts that are still
 * genuinely featurable are stamped, so a stale client can't feature a post
 * that has since been withdrawn. Returns the number of posts featured.
 */
export const featurePosts = async (
  postIds: string[],
  dbOrTxn: DbOrTransaction = db,
): Promise<number> => {
  if (postIds.length === 0) {
    return 0;
  }
  const featurable = await dbOrTxn.query.posts.findMany({
    columns: { _id: true },
    where: {
      ...viewablePostFilter,
      _id: { in: postIds },
    },
  });
  const featurableIds = featurable.map((post) => post._id);
  if (featurableIds.length > 0) {
    await dbOrTxn
      .update(posts)
      .set({ onsiteDigestAt: new Date().toISOString() })
      .where(inArray(posts._id, featurableIds));
  }
  return featurableIds.length;
};

/**
 * Dismiss the given posts from the queue by recording the digest tool's "X"
 * decision (`DigestPosts.onsiteDigestStatus = "no"`) on each post's digest row.
 * This is the same signal the digest tool uses, so a dismissal here shows up as
 * an "X" there and vice versa, and the post stops reappearing in the queue.
 *
 * A post's digest row belongs to the digest whose date range covers its
 * `postedAt` (digests partition time into `[startDate, endDate)` ranges). If a
 * row already exists for that digest we update it; otherwise we insert one,
 * mirroring how the digest tool creates rows lazily. Returns the number of
 * posts dismissed.
 */
export const dismissPosts = async (
  postIds: string[],
  dbOrTxn: DbOrTransaction = db,
): Promise<number> => {
  if (postIds.length === 0) {
    return 0;
  }

  // Only act on real posts, and grab postedAt so we can find each post's digest.
  const dismissable = await dbOrTxn.query.posts.findMany({
    columns: { _id: true, postedAt: true },
    where: { _id: { in: postIds } },
  });
  if (dismissable.length === 0) {
    return 0;
  }

  // Sorted newest-first, so the first digest whose start is at or before a
  // post's postedAt is the one that covers it.
  const digests = await dbOrTxn.query.digests.findMany({
    columns: { _id: true, startDate: true },
    orderBy: { startDate: "desc" },
  });
  const coveringDigestId = (postedAt: string | null): string | null => {
    if (!postedAt) {
      return null;
    }
    const postedMs = new Date(postedAt).getTime();
    const digest = digests.find(
      (d) => d.startDate !== null && new Date(d.startDate).getTime() <= postedMs,
    );
    return digest?._id ?? null;
  };

  const existingRows = await dbOrTxn.query.digestPosts.findMany({
    columns: { _id: true, postId: true, digestId: true },
    where: { postId: { in: dismissable.map((post) => post._id) } },
  });

  const now = new Date().toISOString();
  const rowIdsToUpdate: string[] = [];
  const rowsToInsert: InsertDigestPost[] = [];
  for (const post of dismissable) {
    const digestId = coveringDigestId(post.postedAt);
    if (!digestId) {
      // No digest covers this post (e.g. it predates every digest); skip it
      // rather than fabricating a digest.
      continue;
    }
    const existing = existingRows.find(
      (row) => row.postId === post._id && row.digestId === digestId,
    );
    if (existing) {
      rowIdsToUpdate.push(existing._id);
    } else {
      rowsToInsert.push({
        _id: randomId(),
        digestId,
        postId: post._id,
        onsiteDigestStatus: "no",
        createdAt: now,
      });
    }
  }

  if (rowIdsToUpdate.length > 0) {
    // Clear onsiteDigestAt too: a dismissed post must not stay featured.
    await dbOrTxn
      .update(digestPosts)
      .set({ onsiteDigestStatus: "no", onsiteDigestAt: null })
      .where(inArray(digestPosts._id, rowIdsToUpdate));
  }
  if (rowsToInsert.length > 0) {
    await dbOrTxn.insert(digestPosts).values(rowsToInsert);
  }

  return rowIdsToUpdate.length + rowsToInsert.length;
};
