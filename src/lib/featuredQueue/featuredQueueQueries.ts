import "server-only";

import { db } from "../db";
import { postTagsProjection } from "../tags/tagQueries";
import {
  excludeCommunityFilter,
  FEATURED_KARMA_THRESHOLD,
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
 * Frontpage posts (published since launch) that are still awaiting a decision:
 * neither already featured nor dismissed. There's no time window beyond the
 * launch cutoff, so the queue is simply everything since last review.
 *
 * A post leaves the queue permanently once it has been featured by any of the
 * three routes onto the homepage Featured list (see
 * `fetchFeaturedFrontpagePosts`): this queue (`posts.onsiteDigestAt`), the
 * digest tool (`DigestPosts.onsiteDigestAt`, or an `onsiteDigestStatus` of
 * "yes"), or reaching `FEATURED_KARMA_THRESHOLD` karma as a non-community post,
 * which features it with no admin action at all. It also leaves once dismissed,
 * which records the digest tool's "X" (`onsiteDigestStatus = "no"`).
 *
 * Each of those signals is durable: none of them is reset by an author editing
 * or re-publishing a post, and the karma one reads `maxBaseScore` (a
 * monotonic high-water mark) rather than the current `baseScore`, so a post
 * that has been featured stays featured for queue purposes even if it's since
 * been edited or voted back below the threshold. Re-serving an already-featured
 * post is worse than missing one: re-featuring it re-stamps `onsiteDigestAt`
 * with the current time, which jumps it above posts featured more recently.
 *
 * Personal blogposts (no `frontpageDate`) are excluded outright: a moderator has
 * already assessed them as not frontpage material, let alone featured.
 */
export const fetchFeaturedQueue = async (): Promise<FeaturedQueueItem[]> => {
  const excludeCommunity = excludeCommunityFilter();
  return db.query.posts.findMany({
    ...featuredQueueProjection,
    where: {
      ...viewablePostFilter,
      postedAt: { gte: FEATURED_QUEUE_LAUNCH_DATE.toISOString() },
      // Personal blogposts have already been judged off the frontpage.
      frontpageDate: { isNotNull: true },
      // Featured via this queue.
      onsiteDigestAt: { isNull: true },
      AND: [
        {
          NOT: {
            digestPost: {
              OR: [
                // Featured via the digest tool, which stamps a time...
                { onsiteDigestAt: { isNotNull: true } },
                // ...but the status is where the digest tool has always
                // recorded the decision: `DigestPosts` shipped with only the
                // status columns and gained `onsiteDigestAt` later, so a post
                // it featured can carry the status and no timestamp at all.
                // Any decided status counts, "yes" (featured) as much as "no"
                // (the digest tool's "X"). "maybe" is a shortlist rather than a
                // decision, so those posts stay in the queue — as do posts with
                // no status at all, since `notIn` never matches NULL.
                { onsiteDigestStatus: { notIn: ["maybe"] } },
              ],
            },
          },
        },
        {
          // Featured by karma alone, now or at any point in the past.
          NOT: {
            maxBaseScore: { gte: FEATURED_KARMA_THRESHOLD },
            RAW: (postsTable) => excludeCommunity(postsTable),
          },
        },
      ],
    },
    orderBy: { postedAt: "desc" },
    limit: QUEUE_LIMIT,
  });
};
