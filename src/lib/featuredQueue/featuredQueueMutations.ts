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
 * Dismiss the given posts by recording the digest tool's "X"
 * (`DigestPosts.onsiteDigestStatus = "no"`) on each post's digest row — the same
 * signal the digest tool uses, so the decision is shared both ways and the post
 * stops reappearing in the queue. The row belongs to the digest whose date range
 * covers the post's `postedAt`; we update it if present, else insert one (as the
 * digest tool does lazily). Returns the number of posts dismissed.
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
  const coveringDigestId = (postedAt: string | null): string | null => {
    if (!postedAt) {
      return null;
    }
    const postedMs = new Date(postedAt).getTime();
    return digestBounds.find((d) => d.startMs <= postedMs)?._id ?? null;
  };

  const existingRows = await dbOrTxn.query.digestPosts.findMany({
    columns: { _id: true, postId: true, digestId: true },
    where: { postId: { in: dismissable.map((post) => post._id) } },
  });
  const existingRowId = new Map(
    existingRows.map((row) => [`${row.postId}:${row.digestId}`, row._id]),
  );

  const now = new Date().toISOString();
  const rowIdsToUpdate: string[] = [];
  const rowsToInsert: InsertDigestPost[] = [];
  for (const post of dismissable) {
    const digestId = coveringDigestId(post.postedAt);
    // Skip posts no digest covers rather than fabricating one.
    if (!digestId) {
      continue;
    }
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
