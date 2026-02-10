import { expect, suite, test, vi } from "vitest";
import { createTestPost, createTestUser } from "./testHelpers";
import RecommendationService from "@/lib/recommendations/RecommendationService";

// TODO: For now these tests just check that the queries are contstructed and
// executed without throwing errors - in the future it'd be nice to actually test
// their correctness.

vi.stubEnv("COMMUNITY_TAG_ID", "community-test");
vi.stubEnv("APRIL_FOOLS_TAG_ID", "april-fools-test");

suite("Recommendations", () => {
  test("Can fetch posts with tag-weighted collab filter strategy", async () => {
    const service = new RecommendationService();
    const [user, post] = await Promise.all([createTestUser(), createTestPost()]);
    const posts = await service.recommend(
      user,
      "client-id",
      3,
      {
        name: "tagWeightedCollabFilter",
        postId: post._id,
      },
      true,
    );
    expect(posts.length).toBe(0);
  });
});
