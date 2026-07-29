import "server-only";

import { db } from "../db";
import { postTagsProjection } from "../tags/tagQueries";
import {
  viewablePostFilter,
  type PostFromProjection,
  type PostRelationalProjection,
} from "../posts/postLists";

/**
 * The queue only ever surfaces posts published on or after this date, so at
 * launch we start from "now" rather than every post ever written. After that
 * the queue is purely "since last review": a post drops out for good once it's
 * been featured or dismissed, so there's no rolling time window.
 *
 * Set this to the go-live date when shipping.
 */
export const FEATURED_QUEUE_LAUNCH_DATE = new Date("2026-07-28T00:00:00.000Z");

/** Cap on the number of posts loaded into the queue at once. */
const QUEUE_LIMIT = 100;

const featuredQueueProjection = {
  columns: {
    _id: true,
    slug: true,
    title: true,
    isEvent: true,
    groupId: true,
  },
  extras: {
    // Per-user tag vote state is irrelevant to admin triage, so pass a null
    // viewer to skip the vote join.
    tags: (postsTable) => postTagsProjection(postsTable, null),
  },
  with: {
    user: {
      columns: { displayName: true },
    },
  },
} as const satisfies PostRelationalProjection;

export type FeaturedQueueItem = PostFromProjection<typeof featuredQueueProjection>;

/**
 * Viewable posts (published since launch) that are still awaiting a decision:
 * neither featured nor dismissed. A post leaves the queue permanently once it's
 * been featured — via this queue (`posts.onsiteDigestAt`) or the digest tool
 * (`DigestPosts.onsiteDigestAt`) — or dismissed, which records the digest
 * tool's "X" (`DigestPosts.onsiteDigestStatus = "no"`). There's no time window
 * beyond the launch cutoff, so the queue is simply everything since last
 * review.
 */
export const fetchFeaturedQueue = async (): Promise<FeaturedQueueItem[]> => {
  return db.query.posts.findMany({
    ...featuredQueueProjection,
    where: {
      ...viewablePostFilter,
      postedAt: { gte: FEATURED_QUEUE_LAUNCH_DATE.toISOString() },
      onsiteDigestAt: { isNull: true },
      NOT: {
        digestPost: {
          OR: [
            // Featured via the digest tool.
            { onsiteDigestAt: { isNotNull: true } },
            // Dismissed: the digest tool's "X" / "no" onsite status.
            { onsiteDigestStatus: "no" },
          ],
        },
      },
    },
    orderBy: { postedAt: "desc" },
    limit: QUEUE_LIMIT,
  });
};
