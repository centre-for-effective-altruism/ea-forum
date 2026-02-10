import { beforeEach, expect, suite, test, vi } from "vitest";
import { db } from "@/lib/db";
import { comments, posts, tags } from "@/lib/schema";
import { nHoursAgo } from "@/lib/timeUtils";
import { createTestPost } from "./testHelpers";
import { fetchRecentDiscussions } from "@/lib/recentDiscussions/fetchRecentDiscussions";

vi.stubEnv("TRANSLATION_TAG_ID", "translation-test");
vi.stubEnv("COMMUNITY_TAG_ID", "community-test");

suite("Recent discussions permissions", () => {
  beforeEach(async () => {
    await Promise.all([db.delete(posts), db.delete(comments), db.delete(tags)]);
  });
  test("Draft posts are not included in recent discussions", async () => {
    const oneHourAgo = nHoursAgo(1).toISOString();
    const [publicPost] = await Promise.all([
      createTestPost({
        lastCommentedAt: oneHourAgo,
        commentCount: 1,
        baseScore: 1,
      }),
      createTestPost({
        lastCommentedAt: oneHourAgo,
        commentCount: 1,
        baseScore: 1,
        draft: true,
      }),
    ]);
    const { results } = await fetchRecentDiscussions({
      currentUser: null,
      limit: 3,
    });
    expect(results.length).toBe(1);
    expect(results[0].item?._id).toBe(publicPost._id);
  });
  test("Rejected posts are not included in recent discussions", async () => {
    const oneHourAgo = nHoursAgo(1).toISOString();
    const [publicPost] = await Promise.all([
      createTestPost({
        lastCommentedAt: oneHourAgo,
        commentCount: 1,
        baseScore: 1,
      }),
      createTestPost({
        lastCommentedAt: oneHourAgo,
        commentCount: 1,
        baseScore: 1,
        rejected: true,
      }),
    ]);
    const { results } = await fetchRecentDiscussions({
      currentUser: null,
      limit: 3,
    });
    expect(results.length).toBe(1);
    expect(results[0].item?._id).toBe(publicPost._id);
  });
});
