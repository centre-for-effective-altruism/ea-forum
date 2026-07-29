import { beforeEach, expect, suite, test, vi } from "vitest";
import { db } from "@/lib/db";
import { digestPosts, posts } from "@/lib/schema";
import { randomId } from "@/lib/utils/random";
import { nDaysAgo, nHoursAgo } from "@/lib/timeUtils";
import { createTestPost } from "./testHelpers";
import { fetchFeaturedQueue } from "@/lib/featuredQueue/featuredQueueQueries";
import { featurePosts } from "@/lib/featuredQueue/featuredQueueMutations";
import { fetchFeaturedFrontpagePosts } from "@/lib/posts/postLists";

vi.stubEnv("NEXT_PUBLIC_COMMUNITY_TAG_ID", "community-test");

suite("Featured queue", () => {
  beforeEach(async () => {
    await Promise.all([db.delete(posts), db.delete(digestPosts)]);
  });

  test("queue shows recent, viewable, un-featured posts", async () => {
    const recent = await createTestPost({ postedAt: nHoursAgo(1).toISOString() });
    const old = await createTestPost({ postedAt: nDaysAgo(30).toISOString() });
    const draft = await createTestPost({
      postedAt: nHoursAgo(1).toISOString(),
      draft: true,
    });
    const alreadyFeatured = await createTestPost({
      postedAt: nHoursAgo(1).toISOString(),
      onsiteDigestAt: nHoursAgo(1).toISOString(),
    });

    const featuredByDigestTool = await createTestPost({
      postedAt: nHoursAgo(1).toISOString(),
    });
    await db.insert(digestPosts).values({
      _id: randomId(),
      digestId: randomId(),
      postId: featuredByDigestTool._id,
      onsiteDigestAt: nHoursAgo(1).toISOString(),
    });

    const ids = (await fetchFeaturedQueue()).map((post) => post._id);

    expect(ids).toContain(recent._id);
    expect(ids).not.toContain(old._id);
    expect(ids).not.toContain(draft._id);
    expect(ids).not.toContain(alreadyFeatured._id);
    expect(ids).not.toContain(featuredByDigestTool._id);
  });

  test("featurePosts stamps onsiteDigestAt and skips non-viewable posts", async () => {
    const toFeature = await createTestPost({ postedAt: nHoursAgo(1).toISOString() });
    const draft = await createTestPost({
      postedAt: nHoursAgo(1).toISOString(),
      draft: true,
    });

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
    expect((await fetchFeaturedQueue()).map((p) => p._id)).not.toContain(
      toFeature._id,
    );
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
