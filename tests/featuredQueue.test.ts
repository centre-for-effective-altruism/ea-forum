import { beforeEach, expect, suite, test, vi } from "vitest";
import { db } from "@/lib/db";
import { digestPosts, digests, posts } from "@/lib/schema";
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
import {
  FEATURED_KARMA_THRESHOLD,
  fetchFeaturedFrontpagePosts,
} from "@/lib/posts/postLists";

const COMMUNITY_TAG_ID = "community-test";
vi.stubEnv("NEXT_PUBLIC_COMMUNITY_TAG_ID", COMMUNITY_TAG_ID);

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
    await db.insert(digestPosts).values({
      _id: randomId(),
      digestId: randomId(),
      postId: featuredViaDigestTool._id,
      onsiteDigestAt: afterLaunch,
    });

    const dismissed = await createTestPost({ ...queueEligible });
    await db.insert(digestPosts).values({
      _id: randomId(),
      digestId: randomId(),
      postId: dismissed._id,
      onsiteDigestStatus: "no",
    });

    const ids = await queueIds();

    expect(ids).toContain(undecided._id);
    expect(ids).not.toContain(preLaunch._id);
    expect(ids).not.toContain(draft._id);
    expect(ids).not.toContain(featuredViaQueue._id);
    expect(ids).not.toContain(featuredViaDigestTool._id);
    expect(ids).not.toContain(dismissed._id);
  });

  test("posts already featured by karma alone never enter the queue", async () => {
    const highKarma = await createTestPost({
      ...queueEligible,
      baseScore: FEATURED_KARMA_THRESHOLD,
      maxBaseScore: FEATURED_KARMA_THRESHOLD,
    });
    const belowThreshold = await createTestPost({
      ...queueEligible,
      baseScore: FEATURED_KARMA_THRESHOLD - 1,
      maxBaseScore: FEATURED_KARMA_THRESHOLD - 1,
    });

    // The high-karma post reaches the homepage Featured list with no admin
    // action at all, so offering it up for featuring would re-feature it.
    const featuredIds = (
      await fetchFeaturedFrontpagePosts({ currentUser: null })
    ).map((post) => post._id);
    expect(featuredIds).toContain(highKarma._id);
    expect(featuredIds).not.toContain(belowThreshold._id);

    const ids = await queueIds();
    expect(ids).not.toContain(highKarma._id);
    expect(ids).toContain(belowThreshold._id);
  });

  test("a karma-featured post stays out of the queue once its score falls back", async () => {
    // `maxBaseScore` is a high-water mark, so being featured sticks even if the
    // post is later edited or voted back below the threshold.
    const dipped = await createTestPost({
      ...queueEligible,
      baseScore: 12,
      maxBaseScore: FEATURED_KARMA_THRESHOLD + 50,
    });

    expect(await queueIds()).not.toContain(dipped._id);
  });

  test("an old karma-featured post re-published after launch stays out", async () => {
    // Re-publishing can move `postedAt` forward, past the launch cutoff. The
    // post was already featured long before that, so it must not come back.
    const republished = await createTestPost({
      createdAt: beforeLaunch,
      postedAt: afterLaunch,
      frontpageDate: beforeLaunch,
      baseScore: FEATURED_KARMA_THRESHOLD + 50,
      maxBaseScore: FEATURED_KARMA_THRESHOLD + 50,
    });

    expect(await queueIds()).not.toContain(republished._id);
  });

  test("high-karma community posts are not karma-featured, so they stay queued", async () => {
    const community = await createTestPost({
      ...queueEligible,
      baseScore: FEATURED_KARMA_THRESHOLD + 50,
      maxBaseScore: FEATURED_KARMA_THRESHOLD + 50,
      tagRelevance: { [COMMUNITY_TAG_ID]: 1 },
    });

    const featuredIds = (
      await fetchFeaturedFrontpagePosts({ currentUser: null })
    ).map((post) => post._id);
    expect(featuredIds).not.toContain(community._id);

    expect(await queueIds()).toContain(community._id);
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

    const count = await featurePosts([toFeature._id, draft._id]);
    expect(count).toBe(1);

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

    const count = await dismissPosts([toDismiss._id]);
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
    const rowId = randomId();
    await db.insert(digestPosts).values({
      _id: rowId,
      digestId,
      postId: post._id,
      emailDigestStatus: "yes",
    });

    const count = await dismissPosts([post._id]);
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
