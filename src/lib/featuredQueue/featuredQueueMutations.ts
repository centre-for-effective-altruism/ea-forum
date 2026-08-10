import "server-only";

import { inArray } from "drizzle-orm";
import difference from "lodash/difference";
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

interface DecidablePost {
  _id: string;
  postedAt: string | null;
}

type OnsiteDigestDecision = Pick<
  InsertDigestPost,
  "onsiteDigestStatus" | "onsiteDigestAt"
>;

/**
 * Record an onsite decision on each post's row in the digest tool. The row
 * belongs to the digest whose date range covers the post's `postedAt`, falling
 * back to the most recent digest for anything older than every digest; we update
 * it if present, else insert one (as the digest tool does lazily).
 *
 * Only the given fields are written, so a decision that omits `onsiteDigestAt`
 * leaves any existing timestamp alone. Returns the ids actually recorded, which
 * is every post passed in unless there are no digests at all and so nowhere to
 * put the decision.
 */
const recordOnsiteDigestDecision = async (
  decidable: DecidablePost[],
  decision: OnsiteDigestDecision,
  dbOrTxn: DbOrTransaction,
): Promise<string[]> => {
  if (decidable.length === 0) {
    return [];
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
  // would leave the post coming back forever. With no digests at all there's
  // nowhere to put it, so record nothing and let the caller report it.
  const newestDigestId = digestBounds[0]?._id;
  if (!newestDigestId) {
    return [];
  }
  const coveringDigestId = (postedAt: string | null): string => {
    // No postedAt matches no digest start, so it lands on the same fallback.
    const postedMs = postedAt ? new Date(postedAt).getTime() : -Infinity;
    return digestBounds.find((d) => d.startMs <= postedMs)?._id ?? newestDigestId;
  };

  const existingRows = await dbOrTxn.query.digestPosts.findMany({
    columns: { _id: true, postId: true, digestId: true },
    where: { postId: { in: decidable.map((post) => post._id) } },
  });
  const existingRowId = new Map(
    existingRows.map((row) => [`${row.postId}:${row.digestId}`, row._id]),
  );

  const now = new Date().toISOString();
  const rowIdsToUpdate: string[] = [];
  const rowsToInsert: InsertDigestPost[] = [];
  for (const post of decidable) {
    const digestId = coveringDigestId(post.postedAt);
    const existingId = existingRowId.get(`${post._id}:${digestId}`);
    if (existingId) {
      rowIdsToUpdate.push(existingId);
    } else {
      rowsToInsert.push({
        _id: randomId(),
        digestId,
        postId: post._id,
        createdAt: now,
        ...decision,
      });
    }
  }

  if (rowIdsToUpdate.length > 0) {
    await dbOrTxn
      .update(digestPosts)
      .set(decision)
      .where(inArray(digestPosts._id, rowIdsToUpdate));
  }
  if (rowsToInsert.length > 0) {
    await dbOrTxn.insert(digestPosts).values(rowsToInsert);
  }

  return decidable.map((post) => post._id);
};

/**
 * Feature the given posts on the homepage by stamping `posts.onsiteDigestAt`,
 * which the homepage Featured list reads. Only posts that are still genuinely
 * featurable are stamped, so a stale client can't feature a post that has since
 * been withdrawn; anything skipped is reported back.
 *
 * The post is also marked "yes" in the digest tool, which is what keeps the
 * featuring alive. That tool recomputes `posts.onsiteDigestAt` from its own rows
 * every time any of them changes — `MAX("onsiteDigestAt") WHERE
 * "onsiteDigestStatus" = 'yes'` — so a post it has no "yes" row for gets its
 * stamp nulled, and silently drops off the Featured list, the moment anyone
 * touches that post in the digest tool (even in the email column). Writing the
 * row here means the recompute finds our timestamp and preserves it.
 *
 * If there are no digests to hang the row on, the post is still featured; it
 * just doesn't get that protection.
 */
export const featurePosts = async (
  postIds: string[],
  dbOrTxn: DbOrTransaction = db,
): Promise<FeaturedQueueWriteResult> => {
  if (postIds.length === 0) {
    return { count: 0, skippedPostIds: [] };
  }
  const featurable = await dbOrTxn.query.posts.findMany({
    columns: { _id: true, postedAt: true },
    where: {
      ...viewablePostFilter,
      _id: { in: postIds },
    },
  });
  const featurableIds = featurable.map((post) => post._id);
  if (featurableIds.length > 0) {
    // The same timestamp on both, so the digest tool's recompute is a no-op
    // rather than something that shuffles the Featured list's order.
    const now = new Date().toISOString();
    await dbOrTxn
      .update(posts)
      .set({ onsiteDigestAt: now })
      .where(inArray(posts._id, featurableIds));
    await recordOnsiteDigestDecision(
      featurable,
      { onsiteDigestStatus: "yes", onsiteDigestAt: now },
      dbOrTxn,
    );
  }
  return {
    count: featurableIds.length,
    skippedPostIds: difference(postIds, featurableIds),
  };
};

/**
 * Dismiss the given posts, meaning "never show me this in the queue again".
 *
 * Dismissal says nothing about whether a post is featured. A post already on the
 * Featured list stays there: being featured is itself a decision that keeps it
 * out of the queue, so there's nothing to record and we leave its row alone —
 * writing "no" over a "yes" would un-feature it. Everything else, including a
 * post the homepage features on karma alone, gets the digest tool's "X"
 * (`onsiteDigestStatus = "no"`), which takes it out of the queue without
 * touching how the homepage treats it.
 *
 * Posts that couldn't be recorded at all are reported back rather than silently
 * dropped, since those would reappear in the queue.
 */
export const dismissPosts = async (
  postIds: string[],
  dbOrTxn: DbOrTransaction = db,
): Promise<FeaturedQueueWriteResult> => {
  if (postIds.length === 0) {
    return { count: 0, skippedPostIds: [] };
  }

  // Only act on real posts, and grab what we need to place the digest row and
  // to tell whether the post is already featured.
  const dismissable = await dbOrTxn.query.posts.findMany({
    columns: { _id: true, postedAt: true, onsiteDigestAt: true },
    where: { _id: { in: postIds } },
    with: {
      digestPost: {
        columns: { onsiteDigestStatus: true, onsiteDigestAt: true },
      },
    },
  });

  const featured = dismissable.filter(
    (post) =>
      post.onsiteDigestAt !== null ||
      post.digestPost.some(
        (row) => row.onsiteDigestAt !== null || row.onsiteDigestStatus === "yes",
      ),
  );
  const featuredIds = featured.map((post) => post._id);
  const recordedIds = await recordOnsiteDigestDecision(
    dismissable.filter((post) => !featuredIds.includes(post._id)),
    { onsiteDigestStatus: "no" },
    dbOrTxn,
  );

  const dismissedIds = [...featuredIds, ...recordedIds];
  return {
    count: dismissedIds.length,
    skippedPostIds: difference(postIds, dismissedIds),
  };
};
