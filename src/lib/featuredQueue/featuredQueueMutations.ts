import "server-only";

import { inArray } from "drizzle-orm";
import { db, DbOrTransaction } from "../db";
import { digestPosts, posts, type InsertDigestPost } from "../schema";
import { randomId } from "../utils/random";
import { viewablePostFilter } from "../posts/postLists";

/**
 * The outcome of a queue write. `skippedPostIds` are posts the write could not
 * record, which stay in the queue and so would come back next time. They're
 * reported rather than swallowed: a silent no-op here looks exactly like a post
 * re-appearing for no reason.
 */
export interface FeaturedQueueWriteResult {
  count: number;
  skippedPostIds: string[];
}

const skipped = (postIds: string[], handledIds: string[]): string[] => {
  const handled = new Set(handledIds);
  return postIds.filter((id) => !handled.has(id));
};

/**
 * Feature the given posts on the homepage by stamping `posts.onsiteDigestAt`
 * (which the homepage Featured list reads). Only posts that are still
 * genuinely featurable are stamped, so a stale client can't feature a post
 * that has since been withdrawn; anything skipped is reported back.
 */
export const featurePosts = async (
  postIds: string[],
  dbOrTxn: DbOrTransaction = db,
): Promise<FeaturedQueueWriteResult> => {
  if (postIds.length === 0) {
    return { count: 0, skippedPostIds: [] };
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
  return {
    count: featurableIds.length,
    skippedPostIds: skipped(postIds, featurableIds),
  };
};

/**
 * Dismiss the given posts, meaning "never show me this in the queue again".
 *
 * Dismissal says nothing about whether a post is featured, and deliberately
 * leaves every featured signal untouched: a post that is on the Featured list —
 * because it was featured from here, from the digest tool, or because it reached
 * the karma threshold on its own — stays there once dismissed. It just stops
 * coming back for review.
 *
 * It's recorded as the digest tool's "X" (`DigestPosts.onsiteDigestStatus =
 * "no"`), the same signal that tool uses, so the decision is shared both ways.
 * The row belongs to the digest whose date range covers the post's `postedAt`,
 * falling back to the most recent digest for anything older than every digest;
 * we update the row if present, else insert one (as the digest tool does
 * lazily). Posts that couldn't be recorded at all are reported back rather than
 * silently dropped, since those would reappear in the queue.
 */
export const dismissPosts = async (
  postIds: string[],
  dbOrTxn: DbOrTransaction = db,
): Promise<FeaturedQueueWriteResult> => {
  if (postIds.length === 0) {
    return { count: 0, skippedPostIds: [] };
  }

  // Only act on real posts, and grab postedAt so we can find each post's digest.
  const dismissable = await dbOrTxn.query.posts.findMany({
    columns: { _id: true, postedAt: true },
    where: { _id: { in: postIds } },
  });
  if (dismissable.length === 0) {
    return { count: 0, skippedPostIds: postIds };
  }

  // Precompute each digest's start as a timestamp, newest-first, so the first
  // digest whose start is at or before a post's postedAt is the one that covers
  // it. Parsing happens once per digest here rather than once per (post,digest).
  const digestBounds = (
    await dbOrTxn.query.digests.findMany({
      columns: { _id: true, startDate: true },
      orderBy: { startDate: "desc" },
    })
  ).flatMap((d) =>
    d.startDate ? [{ _id: d._id, startMs: new Date(d.startDate).getTime() }] : [],
  );
  // The newest digest is the fallback for a post older than every digest: the
  // row is only somewhere to keep the decision, and refusing to record one
  // would leave the post coming back forever.
  const newestDigestId = digestBounds[0]?._id ?? null;
  const coveringDigestId = (postedAt: string | null): string | null => {
    if (!postedAt) {
      return newestDigestId;
    }
    const postedMs = new Date(postedAt).getTime();
    return digestBounds.find((d) => d.startMs <= postedMs)?._id ?? newestDigestId;
  };

  const existingRows = await dbOrTxn.query.digestPosts.findMany({
    columns: { _id: true, postId: true, digestId: true },
    where: { postId: { in: dismissable.map((post) => post._id) } },
  });
  const existingRowId = new Map(
    existingRows.map((row) => [`${row.postId}:${row.digestId}`, row._id]),
  );

  const now = new Date().toISOString();
  const dismissedIds: string[] = [];
  const rowIdsToUpdate: string[] = [];
  const rowsToInsert: InsertDigestPost[] = [];
  for (const post of dismissable) {
    const digestId = coveringDigestId(post.postedAt);
    // Only reachable when no digest exists at all, so there's nowhere to keep
    // the decision. Reported back rather than silently dropped.
    if (!digestId) {
      continue;
    }
    dismissedIds.push(post._id);
    const existingId = existingRowId.get(`${post._id}:${digestId}`);
    if (existingId) {
      rowIdsToUpdate.push(existingId);
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
    // Only the status changes. `onsiteDigestAt` is left exactly as it was, so
    // dismissing a featured post keeps it on the Featured list.
    await dbOrTxn
      .update(digestPosts)
      .set({ onsiteDigestStatus: "no" })
      .where(inArray(digestPosts._id, rowIdsToUpdate));
  }
  if (rowsToInsert.length > 0) {
    await dbOrTxn.insert(digestPosts).values(rowsToInsert);
  }

  return {
    count: dismissedIds.length,
    skippedPostIds: skipped(postIds, dismissedIds),
  };
};
