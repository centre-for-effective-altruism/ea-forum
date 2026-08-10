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

/**
 * The digest tool's onsite statuses that amount to a decision. It cycles a post
 * through "yes", "maybe", "no" and back to no status at all; "maybe" is a
 * shortlist and no status means untouched, so neither takes a post out of the
 * queue.
 */
const DECIDED_ONSITE_DIGEST_STATUSES = ["yes", "no"];

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
 * Frontpage posts (published since launch) that you haven't ruled on yet.
 * There's no time window beyond the launch cutoff, so the queue is simply
 * everything since last review.
 *
 * A post leaves the queue for good once it carries a decision — featured or
 * dismissed.
 *
 * Featured means someone deliberately put it on the homepage Featured list,
 * from this queue (`posts.onsiteDigestAt`) or from the digest tool
 * (`DigestPosts.onsiteDigestAt`, or a "yes" status on rows old enough to predate
 * that column). Dismissed is the digest tool's "X"; see `dismissPosts` for what
 * it does and doesn't change.
 *
 * Reaching the karma threshold is not a decision, so posts the homepage features
 * on karma alone (see `fetchFeaturedFrontpagePosts`) keep appearing here until
 * they're ruled on. Personal blogposts (no `frontpageDate`) never appear: a
 * moderator has already assessed them as not frontpage material.
 *
 * Re-serving a post that was already featured is worse than missing one:
 * featuring it again re-stamps `onsiteDigestAt` with the current time, which
 * jumps it above posts featured more recently.
 */
export const fetchFeaturedQueue = async (): Promise<FeaturedQueueItem[]> => {
  return db.query.posts.findMany({
    ...featuredQueueProjection,
    where: {
      ...viewablePostFilter,
      postedAt: { gte: FEATURED_QUEUE_LAUNCH_DATE.toISOString() },
      // Personal blogposts have already been judged off the frontpage.
      frontpageDate: { isNotNull: true },
      // Not yet featured from this queue.
      onsiteDigestAt: { isNull: true },
      NOT: {
        digestPost: {
          OR: [
            // Featured via the digest tool, which stamps a time...
            { onsiteDigestAt: { isNotNull: true } },
            // ...though the status is where it records the decision, and rows
            // predating that column carry only the status.
            { onsiteDigestStatus: { in: DECIDED_ONSITE_DIGEST_STATUSES } },
          ],
        },
      },
    },
    orderBy: { postedAt: "desc" },
    limit: QUEUE_LIMIT,
  });
};
