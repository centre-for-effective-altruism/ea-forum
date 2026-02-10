import { suite, test, beforeAll, expect } from "vitest";
import { createTestComment, createTestPost, createTestUser } from "./testHelpers";
import {
  createCommentReport,
  createPostReport,
} from "@/lib/reports/reportMutations";
import { db } from "@/lib/db";
import { reports } from "@/lib/schema";
import { nDaysAgo } from "@/lib/timeUtils";
import { randomId } from "@/lib/utils/random";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import { commentGetPageUrlFromIds } from "@/lib/comments/commentHelpers";

suite("Reports", () => {
  suite("Post reports", () => {
    beforeAll(async () => {
      await db.delete(reports).execute();
    });
    test("Throws if user lacks permission", async () => {
      const [user, post] = await Promise.all([
        createTestUser({ banned: nDaysAgo(-100).toISOString() }),
        createTestPost(),
      ]);
      await expect(
        createPostReport(user, post._id, "Inappropriate content"),
      ).rejects.toThrow("You don't have permission to create reports");
    });
    test("Throws if post does not exist", async () => {
      const user = await createTestUser();
      await expect(
        createPostReport(user, randomId(), "Nonexistent post"),
      ).rejects.toThrow("Post not found");
    });
    test("Creates a report successfully", async () => {
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

  suite("Comment reports", () => {
    beforeAll(async () => {
      await db.delete(reports).execute();
    });
    test("Throws if user lacks permission", async () => {
      const [user, comment] = await Promise.all([
        createTestUser({ banned: nDaysAgo(-100).toISOString() }),
        createTestComment(),
      ]);
      await expect(
        createCommentReport(user, comment._id, "Inappropriate content"),
      ).rejects.toThrow("You don't have permission to create reports");
    });
    test("Throws if post does not exist", async () => {
      const user = await createTestUser();
      await expect(
        createCommentReport(user, randomId(), "Nonexistent comment"),
      ).rejects.toThrow("Comment not found");
    });
    test("Creates a report successfully", async () => {
      const [user, post] = await Promise.all([createTestUser(), createTestPost()]);
      const comment = await createTestComment({ postId: post._id });
      const description = "This is a test report";
      await createCommentReport(user, comment._id, description);
      const inserted = await db.query.reports.findMany({
        where: {
          commentId: comment._id,
        },
      });
      expect(inserted.length).toBe(1);
      expect(inserted[0].userId).toBe(user._id);
      expect(inserted[0].postId).toBe(post._id);
      expect(inserted[0].commentId).toBe(comment._id);
      expect(inserted[0].description).toBe(description);
      expect(inserted[0].link).toBe(
        commentGetPageUrlFromIds({
          commentId: comment._id,
          postId: post._id,
          postSlug: post.slug,
        }),
      );
    });
  });
});
