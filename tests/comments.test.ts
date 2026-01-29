import { beforeEach, expect, suite, test, vi } from "vitest";
import { createTestPost, createTestUser } from "./testHelpers";
import { createPostComment } from "@/lib/comments/commentMutations";
import { userSmallVotePower } from "@/lib/votes/voteHelpers";
import { db } from "@/lib/db";

const mockAkismetCheckComment = vi.hoisted(() => vi.fn());

vi.mock(import("@/lib/akismet"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    akismetCheckComment: mockAkismetCheckComment,
  };
});

suite("Comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAkismetCheckComment.mockResolvedValue(false);
  });

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
        updateType: "initial",
        commitMessage: "",
      } as const;
      const commentId = await createPostComment({
        user: commenter,
        postId: post._id,
        parentCommentId: null,
        editorData,
      });

      const power = userSmallVotePower(commenter.karma, 1);
      expect(power).toBeGreaterThan(0);

      const [comment, updatedPost, vote, author] = await Promise.all([
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
        db.query.users.findFirst({
          where: {
            _id: commenter._id,
          },
        }),
      ]);
      expect(comment!.parentCommentId).toBe(null);
      expect(comment!.descendentCount).toBe(0);
      expect(comment!.baseScore).toBe(power);
      expect(updatedPost!.commentCount).toBe(1);
      expect(updatedPost!.topLevelCommentCount).toBe(1);
      expect(updatedPost!.lastCommentedAt).toBeTruthy();
      expect(updatedPost!.lastCommentReplyAt).toBe(null);
      expect(vote!.power).toBe(power);
      expect(vote!.voteType).toBe("smallUpvote");
      expect(author!.commentCount).toBe(1);
      expect(author!.maxCommentCount).toBe(1);
      expect(author!.karma).toBe(0);
    });
    test("Can leave a reply to a comment on a post", async () => {
      const post = await createTestPost();
      expect(post.lastCommentedAt).toBe(null);
      expect(post.lastCommentReplyAt).toBe(null);

      const commenter1 = await createTestUser();
      const editorData = {
        originalContents: {
          type: "ckEditorMarkup",
          data: "<p>Hello world</p>",
        },
        updateType: "initial",
        commitMessage: "",
      } as const;
      const commentId1 = await createPostComment({
        user: commenter1,
        postId: post._id,
        parentCommentId: null,
        editorData,
      });

      const commenter2 = await createTestUser();
      const commentId2 = await createPostComment({
        user: commenter2,
        postId: post._id,
        parentCommentId: commentId1,
        editorData,
      });

      const [childComment, parentComment, updatedPost, author] = await Promise.all([
        db.query.comments.findFirst({
          where: {
            _id: commentId2,
          },
        }),
        db.query.comments.findFirst({
          where: {
            _id: commentId1,
          },
        }),
        db.query.posts.findFirst({
          where: {
            _id: post._id,
          },
        }),
        db.query.users.findFirst({
          where: {
            _id: commenter2._id,
          },
        }),
      ]);
      expect(childComment!.parentCommentId).toBe(parentComment!._id);
      expect(childComment!.descendentCount).toBe(0);
      expect(childComment!.directChildrenCount).toBe(0);
      expect(parentComment!.parentCommentId).toBe(null);
      expect(parentComment!.descendentCount).toBe(1);
      expect(parentComment!.directChildrenCount).toBe(1);
      expect(parentComment!.lastSubthreadActivity).toBe(childComment!.createdAt);
      expect(updatedPost!.commentCount).toBe(2);
      expect(updatedPost!.topLevelCommentCount).toBe(1);
      expect(updatedPost!.lastCommentedAt).toBeTruthy();
      expect(updatedPost!.lastCommentReplyAt).toBeTruthy();
      expect(author!.commentCount).toBe(1);
      expect(author!.maxCommentCount).toBe(1);
      expect(author!.karma).toBe(0);
    });
    test("Spam comments are deleted", async () => {
      mockAkismetCheckComment.mockResolvedValue(true);
      const post = await createTestPost();
      const commenter = await createTestUser({ reviewedByUserId: null });
      const editorData = {
        originalContents: {
          type: "ckEditorMarkup",
          data: "<p>Hello world</p>",
        },
        updateType: "initial",
        commitMessage: "",
      } as const;
      const commentId = await createPostComment({
        user: commenter,
        postId: post._id,
        parentCommentId: null,
        editorData,
      });
      const comment = await db.query.comments.findFirst({
        where: {
          _id: commentId,
        },
      });
      expect(comment!.deleted).toBe(true);
      expect(comment!.deletedDate).toBeTruthy();
      expect(comment!.deletedReason).toContain("marked as spam");
    });
  });
  test("New quick takes", async () => {
    const user = await createTestUser();
    const editorData = {
      originalContents: {
        type: "ckEditorMarkup",
        data: "<p>Hello world</p>",
      },
      updateType: "initial",
      commitMessage: "",
    } as const;
    const quickTakeId = await createPostComment({
      user: user,
      shortform: true,
      parentCommentId: null,
      editorData,
    });

    const power = userSmallVotePower(user.karma, 1);
    expect(power).toBeGreaterThan(0);

    const [quickTake, post, author] = await Promise.all([
      db.query.comments.findFirst({
        where: {
          _id: quickTakeId,
        },
      }),
      db.query.posts.findFirst({
        where: {
          userId: user._id,
          shortform: true,
        },
      }),
      db.query.users.findFirst({
        where: {
          _id: user._id,
        },
      }),
    ]);
    expect(quickTake!.userId).toBe(user._id);
    expect(quickTake!.shortform).toBe(true);
    expect(quickTake!.postId).toBe(post!._id);
    expect(post!.shortform).toBe(true);
    expect(post!.commentCount).toBe(1);
    expect(post!.voteCount).toBe(1);
    expect(post!.baseScore).toBe(power);
    expect(author!.postCount).toBe(1);
    expect(author!.maxPostCount).toBe(1);
    expect(author!.frontpagePostCount).toBe(1);
    expect(author!.shortformFeedId).toBe(post!._id);

    const quickTakeId2 = await createPostComment({
      user: user,
      shortform: true,
      parentCommentId: null,
      editorData,
    });

    const [quickTake2, post2, author2] = await Promise.all([
      db.query.comments.findFirst({
        where: {
          _id: quickTakeId2,
        },
      }),
      db.query.posts.findFirst({
        where: {
          userId: user._id,
          shortform: true,
        },
      }),
      db.query.users.findFirst({
        where: {
          _id: user._id,
        },
      }),
    ]);
    expect(quickTake2!.userId).toBe(user._id);
    expect(quickTake2!.shortform).toBe(true);
    expect(quickTake2!.postId).toBe(post2!._id);
    expect(post2!._id).toBe(post!._id);
    expect(post2!.commentCount).toBe(2);
    expect(author2!.postCount).toBe(1);
  });
});
