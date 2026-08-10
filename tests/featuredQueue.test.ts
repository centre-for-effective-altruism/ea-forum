import { beforeEach, expect, suite, test, vi } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { digestPosts, digests, posts, type InsertDigestPost } from "@/lib/schema";
import { randomId } from "@/lib/utils/random";
import { nHoursAgo } from "@/lib/timeUtils";
import { createTestPost } from "./testHelpers";
import {
  FEATURED_QUEUE_LAUNCH_DATE,
  fetchFeaturedQueue,
} from "@/lib/featuredQueue/featuredQueueQueries";
import {
  dismissPosts,
  featurePosts,
} from "@/lib/featuredQueue/featuredQueueMutations";
import { fetchFeaturedFrontpagePosts } from "@/lib/posts/postLists";

vi.stubEnv("NEXT_PUBLIC_COMMUNITY_TAG_ID", "community-test");

// Dates relative to the launch cutoff, so these tests don't depend on the
// wall clock or the exact value of the constant.
const afterLaunch = new Date(
  FEATURED_QUEUE_LAUNCH_DATE.getTime() + 60 * 60 * 1000,
).toISOString();
const beforeLaunch = new Date(
  FEATURED_QUEUE_LAUNCH_DATE.getTime() - 24 * 60 * 60 * 1000,
).toISOString();

/** A post that qualifies for the queue: on the frontpage, published since launch. */
const queueEligible = {
  postedAt: afterLaunch,
  frontpageDate: afterLaunch,
};

const queueIds = async () => (await fetchFeaturedQueue()).map((post) => post._id);

/** A digest whose range covers `afterLaunch`. */
const createCoveringDigest = async (): Promise<string> => {
  const digestId = randomId();
  await db.insert(digests).values({
    _id: digestId,
    num: 1,
    startDate: FEATURED_QUEUE_LAUNCH_DATE.toISOString(),
  });
  return digestId;
};

/**
 * What the legacy digest tool does to a post whenever any of its digest rows
 * change (ForumMagnum's `PostsRepo.updateOnsiteDigestAt`): it recomputes the
 * post's featured stamp from that post's "yes" rows, nulling it when there are
 * none. This is what used to wipe featurings made from this queue.
 */
const runDigestToolRecompute = async (postId: string) => {
  await db.execute(sql`
    UPDATE "Posts"
    SET "onsiteDigestAt" = (
      SELECT MAX("onsiteDigestAt")
      FROM "DigestPosts"
      WHERE "postId" = ${postId} AND "onsiteDigestStatus" = 'yes'
    )
    WHERE "_id" = ${postId}
  `);
};

/** A digest row for `postId`, in a digest of its own unless one is given. */
const createTestDigestPost = async (
  postId: string,
  fields: Partial<InsertDigestPost> = {},
): Promise<string> => {
  const values: InsertDigestPost = {
    _id: randomId(),
    digestId: randomId(),
    postId,
    ...fields,
  };
  await db.insert(digestPosts).values(values);
  return values._id;
};

suite("Featured queue", () => {
  beforeEach(async () => {
    await Promise.all([
      db.delete(posts),
      db.delete(digestPosts),
      db.delete(digests),
    ]);
  });

  test("queue shows since-launch, viewable, undecided posts", async () => {
    const undecided = await createTestPost({ ...queueEligible });
    const preLaunch = await createTestPost({
      ...queueEligible,
      postedAt: beforeLaunch,
    });
    const draft = await createTestPost({ ...queueEligible, draft: true });
    const featuredViaQueue = await createTestPost({
      ...queueEligible,
      onsiteDigestAt: afterLaunch,
    });

    const featuredViaDigestTool = await createTestPost({ ...queueEligible });
    await createTestDigestPost(featuredViaDigestTool._id, {
      onsiteDigestAt: afterLaunch,
    });

    const dismissed = await createTestPost({ ...queueEligible });
    await createTestDigestPost(dismissed._id, { onsiteDigestStatus: "no" });

    const ids = await queueIds();

    expect(ids).toContain(undecided._id);
    expect(ids).not.toContain(preLaunch._id);
    expect(ids).not.toContain(draft._id);
    expect(ids).not.toContain(featuredViaQueue._id);
    expect(ids).not.toContain(featuredViaDigestTool._id);
    expect(ids).not.toContain(dismissed._id);
  });

  test("the digest tool's onsite statuses keep a post out, except 'maybe'", async () => {
    // `DigestPosts` shipped with only the status columns and gained
    // `onsiteDigestAt` later, so a post the digest tool featured can carry
    // `onsiteDigestStatus: "yes"` and no timestamp at all.
    const withStatus = async (onsiteDigestStatus: string | null) => {
      const post = await createTestPost({ ...queueEligible });
      await createTestDigestPost(post._id, { onsiteDigestStatus });
      return post._id;
    };
    const featuredNoTimestamp = await withStatus("yes");
    const passedOver = await withStatus("no");
    const shortlisted = await withStatus("maybe");
    const noStatus = await withStatus(null);

    const ids = await queueIds();
    expect(ids).not.toContain(featuredNoTimestamp);
    expect(ids).not.toContain(passedOver);
    // Not yet a decision, so these stay up for review.
    expect(ids).toContain(shortlisted);
    expect(ids).toContain(noStatus);
  });

  test("dismissing a karma-featured post keeps it featured and out of the queue", async () => {
    await createCoveringDigest();
    // Reaching the karma threshold isn't a decision anyone made, so the post
    // still comes up for review even though it's already on the Featured list.
    const highKarma = await createTestPost({
      ...queueEligible,
      baseScore: 150,
      maxBaseScore: 150,
    });
    const onFeaturedList = async () =>
      (await fetchFeaturedFrontpagePosts({ currentUser: null })).map(
        (post) => post._id,
      );

    expect(await onFeaturedList()).toContain(highKarma._id);
    expect(await queueIds()).toContain(highKarma._id);

    const { count } = await dismissPosts([highKarma._id]);
    expect(count).toBe(1);

    // Dismissal is only "stop showing me this": it stays on the Featured list.
    expect(await onFeaturedList()).toContain(highKarma._id);
    expect(await queueIds()).not.toContain(highKarma._id);
  });

  test("dismissing a featured post leaves it alone entirely", async () => {
    const digestId = await createCoveringDigest();
    const viaQueue = await createTestPost({
      ...queueEligible,
      onsiteDigestAt: afterLaunch,
    });
    const viaDigestTool = await createTestPost({ ...queueEligible });
    await createTestDigestPost(viaDigestTool._id, {
      digestId,
      onsiteDigestStatus: "yes",
      onsiteDigestAt: afterLaunch,
    });

    const { count } = await dismissPosts([viaQueue._id, viaDigestTool._id]);
    expect(count).toBe(2);

    // Being featured already keeps them out of the queue, so there is nothing
    // to record — and writing "no" over the "yes" would un-feature them.
    const queueStamp = await db.query.posts.findFirst({
      columns: { onsiteDigestAt: true },
      where: { _id: viaQueue._id },
    });
    expect(queueStamp?.onsiteDigestAt).not.toBeNull();

    const digestRow = await db.query.digestPosts.findFirst({
      where: { postId: viaDigestTool._id },
    });
    expect(digestRow?.onsiteDigestStatus).toBe("yes");
    expect(digestRow?.onsiteDigestAt).not.toBeNull();

    const featuredIds = (
      await fetchFeaturedFrontpagePosts({ currentUser: null })
    ).map((post) => post._id);
    expect(featuredIds).toContain(viaQueue._id);
    expect(featuredIds).toContain(viaDigestTool._id);

    const ids = await queueIds();
    expect(ids).not.toContain(viaQueue._id);
    expect(ids).not.toContain(viaDigestTool._id);
  });

  test("featuring marks the post 'yes' in the digest tool", async () => {
    const digestId = await createCoveringDigest();
    const post = await createTestPost({ ...queueEligible });

    await featurePosts([post._id]);

    const row = await db.query.digestPosts.findFirst({
      where: { postId: post._id },
    });
    expect(row?.digestId).toBe(digestId);
    expect(row?.onsiteDigestStatus).toBe("yes");
    expect(row?.onsiteDigestAt).not.toBeNull();
  });

  test("a featured post survives the digest tool's recompute", async () => {
    await createCoveringDigest();
    const post = await createTestPost({ ...queueEligible });
    await featurePosts([post._id]);

    // Anyone touching this post in the digest tool triggers the recompute —
    // including editing only its email digest status.
    await runDigestToolRecompute(post._id);

    const stamped = await db.query.posts.findFirst({
      columns: { onsiteDigestAt: true },
      where: { _id: post._id },
    });
    expect(stamped?.onsiteDigestAt).not.toBeNull();

    expect(
      (await fetchFeaturedFrontpagePosts({ currentUser: null })).map((p) => p._id),
    ).toContain(post._id);
    expect(await queueIds()).not.toContain(post._id);
  });

  test("dismissal falls back to the newest digest for a post no digest covers", async () => {
    // Otherwise the dismissal is silently dropped and the post returns forever.
    const digestId = await createCoveringDigest();
    const oldPost = await createTestPost({
      createdAt: beforeLaunch,
      postedAt: beforeLaunch,
      frontpageDate: beforeLaunch,
    });

    const { count, skippedPostIds } = await dismissPosts([oldPost._id]);
    expect(count).toBe(1);
    expect(skippedPostIds).toEqual([]);

    const row = await db.query.digestPosts.findFirst({
      where: { postId: oldPost._id },
    });
    expect(row?.digestId).toBe(digestId);
    expect(row?.onsiteDigestStatus).toBe("no");
  });

  test("writes report anything they could not record", async () => {
    const draft = await createTestPost({ ...queueEligible, draft: true });
    const featured = await featurePosts([draft._id]);
    expect(featured.count).toBe(0);
    expect(featured.skippedPostIds).toEqual([draft._id]);

    // No digests exist at all, so there's nowhere to record a dismissal.
    const post = await createTestPost({ ...queueEligible });
    const dismissed = await dismissPosts([post._id]);
    expect(dismissed.count).toBe(0);
    expect(dismissed.skippedPostIds).toEqual([post._id]);
    expect(await queueIds()).toContain(post._id);
  });

  test("personal blogposts are excluded from the queue", async () => {
    const personalBlog = await createTestPost({
      ...queueEligible,
      frontpageDate: null,
    });
    const frontpage = await createTestPost({ ...queueEligible });

    const ids = await queueIds();
    expect(ids).not.toContain(personalBlog._id);
    expect(ids).toContain(frontpage._id);
  });

  test("featurePosts stamps onsiteDigestAt and skips non-viewable posts", async () => {
    const toFeature = await createTestPost({ ...queueEligible });
    const draft = await createTestPost({ ...queueEligible, draft: true });

    const { count, skippedPostIds } = await featurePosts([toFeature._id, draft._id]);
    expect(count).toBe(1);
    expect(skippedPostIds).toEqual([draft._id]);

    const stamped = await db.query.posts.findFirst({
      columns: { onsiteDigestAt: true },
      where: { _id: toFeature._id },
    });
    expect(stamped?.onsiteDigestAt).not.toBeNull();

    const draftRow = await db.query.posts.findFirst({
      columns: { onsiteDigestAt: true },
      where: { _id: draft._id },
    });
    expect(draftRow?.onsiteDigestAt ?? null).toBeNull();

    // Featured posts drop out of the queue.
    expect(await queueIds()).not.toContain(toFeature._id);
  });

  test("dismissPosts records the digest 'no' status and drops the post from the queue", async () => {
    const digestId = await createCoveringDigest();
    const toDismiss = await createTestPost({ ...queueEligible });

    expect(await queueIds()).toContain(toDismiss._id);

    const { count } = await dismissPosts([toDismiss._id]);
    expect(count).toBe(1);

    const row = await db.query.digestPosts.findFirst({
      where: { postId: toDismiss._id },
    });
    expect(row?.digestId).toBe(digestId);
    expect(row?.onsiteDigestStatus).toBe("no");

    expect(await queueIds()).not.toContain(toDismiss._id);
  });

  test("dismissPosts updates an existing digest row without duplicating it", async () => {
    const digestId = await createCoveringDigest();
    const post = await createTestPost({ ...queueEligible });
    const rowId = await createTestDigestPost(post._id, {
      digestId,
      emailDigestStatus: "yes",
    });

    const { count } = await dismissPosts([post._id]);
    expect(count).toBe(1);

    const rows = await db.query.digestPosts.findMany({
      where: { postId: post._id },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]._id).toBe(rowId);
    expect(rows[0].onsiteDigestStatus).toBe("no");
    // Unrelated fields on the row are left alone.
    expect(rows[0].emailDigestStatus).toBe("yes");
  });

  test("homepage Featured list surfaces both queue and digest-tool picks", async () => {
    const viaQueue = await createTestPost({
      baseScore: 1,
      postedAt: nHoursAgo(1).toISOString(),
      onsiteDigestAt: nHoursAgo(1).toISOString(),
    });
    const viaDigestTool = await createTestPost({
      baseScore: 1,
      postedAt: nHoursAgo(2).toISOString(),
    });
    await db.insert(digestPosts).values({
      _id: randomId(),
      digestId: randomId(),
      postId: viaDigestTool._id,
      onsiteDigestAt: nHoursAgo(1).toISOString(),
    });
    const notFeatured = await createTestPost({
      baseScore: 1,
      postedAt: nHoursAgo(1).toISOString(),
    });

    const ids = (await fetchFeaturedFrontpagePosts({ currentUser: null })).map(
      (post) => post._id,
    );

    expect(ids).toContain(viaQueue._id);
    expect(ids).toContain(viaDigestTool._id);
    expect(ids).not.toContain(notFeatured._id);
  });
});
