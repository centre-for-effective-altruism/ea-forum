import { expect, suite, test } from "vitest";
import { createTestPost, createTestUser } from "./testHelpers";
import { createPostComment } from "@/lib/comments/commentMutations";
import { userSmallVotePower } from "@/lib/votes/voteHelpers";
import { db } from "@/lib/db";

suite("Comments", () => {
  suite("New comment on post", () => {
    test("Can leave a new top-level comment on a post", async () => {
      const post = await createTestPost();
      expect(post.lastCommentedAt).toBe(null);
      expect(post.lastCommentReplyAt).toBe(null);

      const commenter = await createTestUser();
      const editorData = {
        originalContents: {
          type: "ckEditorMarkup",
          data: "<p>Hello world</p>",
        },
        updateType: "minor",
        commitMessage: "",
      } as const;
      const commentId = await createPostComment({
        user: commenter,
        postId: post._id,
        parentCommentId: null,
        data: editorData,
        userAgent: "user-agent",
        referrer: "referrer",
      });

      const power = userSmallVotePower(commenter.karma, 1);
      expect(power).toBeGreaterThan(0);

      const [comment, updatedPost, vote] = await Promise.all([
        db.query.comments.findFirst({
          where: {
            _id: commentId,
          },
        }),
        db.query.posts.findFirst({
          where: {
            _id: post._id,
          },
        }),
        db.query.votes.findFirst({
          where: {
            documentId: commentId,
            userId: commenter._id,
          },
        }),
      ]);
      expect(comment!.parentCommentId).toBe(null);
      expect(comment!.descendentCount).toBe(0);
      expect(comment!.baseScore).toBe(power);
      expect(updatedPost!.lastCommentedAt).toBeTruthy();
      expect(updatedPost!.lastCommentReplyAt).toBe(null);
      expect(vote!.power).toBe(power);
      expect(vote!.voteType).toBe("smallUpvote");
    });
  });
});
