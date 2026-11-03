import { expect, suite, test, vi } from "vitest";
import { createTestPost, createTestUser } from "./testHelpers";
import RecommendationService from "@/lib/recommendations/RecommendationService";

// TODO: For now these tests just check that the queries are contstructed and
// executed without throwing errors - in the future it'd be nice to actually test
// their correctness.

vi.stubEnv("NEXT_PUBLIC_COMMUNITY_TAG_ID", "community-test");
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

  test("Can fetch posts with feature strategy using filters and subscriptions", async () => {
    const service = new RecommendationService();
    const [user, post] = await Promise.all([createTestUser(), createTestPost()]);
    const posts = await service.recommend(
      user,
      "client-id",
      3,
      {
        name: "feature",
        postId: post._id,
        features: [
          { feature: "frontpageFilterSettings", weight: 1 },
          { feature: "subscribedAuthorPosts", weight: 1 },
          { feature: "subscribedTagPosts", weight: 1 },
        ],
      },
      true,
    );
    expect(posts.length).toBe(0);
  });

  test("Can fetch posts with wrapped strategy", async () => {
    const service = new RecommendationService();
    const [user, post] = await Promise.all([createTestUser(), createTestPost()]);
    const posts = await service.recommend(
      user,
      "client-id",
      3,
      {
        name: "wrapped",
        postId: post._id,
        year: 2025,
      },
      true,
    );
    expect(posts.length).toBe(0);
  });
});
