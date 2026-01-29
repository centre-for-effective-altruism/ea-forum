import { suite, test, beforeAll, expect } from "vitest";
import { createTestPost, createTestUser } from "./testHelpers";
import { db } from "@/lib/db";
import { reports } from "@/lib/schema";
import { nDaysAgo } from "@/lib/timeUtils";
import { randomId } from "@/lib/utils/random";
import { createPostReport } from "@/lib/reports/reportMutations";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";

suite("createPostReport", () => {
  beforeAll(async () => {
    await db.delete(reports).execute();
  });

  test("throws if user lacks permission", async () => {
    const [user, post] = await Promise.all([
      createTestUser({ banned: nDaysAgo(-100).toISOString() }),
      createTestPost(),
    ]);
    await expect(
      createPostReport(user, post._id, "Inappropriate content"),
    ).rejects.toThrow("You don't have permission to create reports");
  });
  test("throws if post does not exist", async () => {
    const user = await createTestUser();
    await expect(
      createPostReport(user, randomId(), "Nonexistent post"),
    ).rejects.toThrow("Post not found");
  });
  test("creates a report successfully", async () => {
    const [user, post] = await Promise.all([createTestUser(), createTestPost()]);
    const description = "This is a test report";
    await createPostReport(user, post._id, description);
    const inserted = await db.query.reports.findMany({
      where: {
        postId: post._id,
      },
    });
    expect(inserted.length).toBe(1);
    expect(inserted[0].userId).toBe(user._id);
    expect(inserted[0].postId).toBe(post._id);
    expect(inserted[0].description).toBe(description);
    expect(inserted[0].link).toBe(postGetPageUrl({ post }));
  });
});
