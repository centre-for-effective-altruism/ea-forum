import "server-only";

import { inArray } from "drizzle-orm";
import { db } from "../db";
import { posts } from "../schema";
import { viewablePostFilter } from "../posts/postLists";

/**
 * Feature the given posts on the homepage by stamping `posts.onsiteDigestAt`
 * (which the homepage Featured list reads). Only posts that are still
 * genuinely featurable are stamped, so a stale client can't feature a post
 * that has since been withdrawn. Returns the number of posts featured.
 */
export const featurePosts = async (postIds: string[]): Promise<number> => {
  const featurable = await db.query.posts.findMany({
    columns: { _id: true },
    where: {
      ...viewablePostFilter,
      _id: { in: postIds },
    },
  });
  const featurableIds = featurable.map((post) => post._id);
  if (featurableIds.length > 0) {
    await db
      .update(posts)
      .set({ onsiteDigestAt: new Date().toISOString() })
      .where(inArray(posts._id, featurableIds));
  }
  return featurableIds.length;
};
