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
 * Frontpage posts (published since launch) that you haven't ruled on yet.
 * There's no time window beyond the launch cutoff, so the queue is simply
 * everything since last review.
 *
 * A post leaves the queue for good once it carries a decision, and a decision is
 * exactly one of two things:
 *
 *  - Featured, meaning someone deliberately put it on the homepage Featured
 *    list: this queue (`posts.onsiteDigestAt`) or the digest tool
 *    (`DigestPosts.onsiteDigestAt`, or an `onsiteDigestStatus` of "yes"). Note
 *    `DigestPosts` shipped with only the status columns and gained
 *    `onsiteDigestAt` later, so a post the digest tool featured can carry the
 *    status and no timestamp at all.
 *  - Dismissed (`onsiteDigestStatus = "no"`), meaning "never show me this
 *    again". Dismissal is deliberately independent of whether the post is
 *    featured: dismissing never un-features anything, and a post that is
 *    featured by some other route — reaching the karma threshold on its own, say
 *    — stays on the Featured list once dismissed. It just stops appearing here.
 *
 * Reaching the karma threshold is not a decision, so those posts do keep
 * appearing until you feature or dismiss them. That's deliberate: they're on the
 * Featured list without anyone choosing to put them there, so you still get the
 * chance to rule on them, and dismissing one leaves it featured.
 *
 * Both signals are durable — neither is reset by an author editing or
 * re-publishing a post, nor by karma moving — which is what stops a post you've
 * already ruled on coming back. Re-serving a post you already featured is worse
 * than missing one: featuring it again re-stamps `onsiteDigestAt` with the
 * current time, which jumps it above posts featured more recently.
 *
 * Personal blogposts (no `frontpageDate`) never appear: a moderator has already
 * assessed them as not frontpage material, let alone featured.
 */
export const fetchFeaturedQueue = async (): Promise<FeaturedQueueItem[]> => {
  return db.query.posts.findMany({
    ...featuredQueueProjection,
    where: {
      ...viewablePostFilter,
      postedAt: { gte: FEATURED_QUEUE_LAUNCH_DATE.toISOString() },
      // Personal blogposts have already been judged off the frontpage.
      frontpageDate: { isNotNull: true },
      // Featured via this queue.
      onsiteDigestAt: { isNull: true },
      NOT: {
        digestPost: {
          OR: [
            // Featured via the digest tool, which stamps a time...
            { onsiteDigestAt: { isNotNull: true } },
            // ...but the status is where it has always recorded the decision.
            // Any decided status counts, "yes" (featured) as much as "no"
            // (dismissed). "maybe" is a shortlist rather than a decision, so
            // those posts stay in the queue — as do posts with no status at
            // all, since `notIn` never matches NULL.
            { onsiteDigestStatus: { notIn: ["maybe"] } },
          ],
        },
      },
    },
    orderBy: { postedAt: "desc" },
    limit: QUEUE_LIMIT,
  });
};
