import "server-only";

import { db } from "../db";
import { nDaysAgo } from "../timeUtils";
import { postTagsProjection } from "../tags/tagQueries";
import {
  viewablePostFilter,
  type PostFromProjection,
  type PostRelationalProjection,
} from "../posts/postLists";

/** How far back the queue looks for posts awaiting a featuring decision. */
const RECENT_WINDOW_DAYS = 7;

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
 * Recently posted, viewable posts that haven't been featured yet — neither via
 * this queue (`posts.onsiteDigestAt`) nor via the digest tool
 * (`DigestPosts.onsiteDigestAt`), so already-featured posts don't reappear as
 * awaiting a decision.
 */
export const fetchFeaturedQueue = async (): Promise<FeaturedQueueItem[]> => {
  return db.query.posts.findMany({
    ...featuredQueueProjection,
    where: {
      ...viewablePostFilter,
      postedAt: { gt: nDaysAgo(RECENT_WINDOW_DAYS).toISOString() },
      onsiteDigestAt: { isNull: true },
      NOT: {
        digestPost: {
          onsiteDigestAt: { isNotNull: true },
        },
      },
    },
    orderBy: { postedAt: "desc" },
    limit: QUEUE_LIMIT,
  });
};
