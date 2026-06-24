import { beforeEach, expect, suite, test, vi } from "vitest";
import { createTestComment, createTestPost, createTestUser } from "./testHelpers";
import type { DenormalizedRevision } from "@/lib/revisions/revisionHelpers";
import {
  createPostComment,
  deleteComment,
  undeleteComment,
  updateComment,
} from "@/lib/comments/commentMutations";
import { userSmallVotePower } from "@/lib/votes/voteHelpers";
import { sleep } from "@/lib/utils/asyncUtils";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

const MOCK_ADMIN_EMAIL = "mock-admin-email";

const mockAkismetCheckComment = vi.hoisted(() => vi.fn());

vi.mock(import("@/lib/akismet"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    akismetCheckComment: mockAkismetCheckComment,
  };
});

suite("Comments", () => {
  vi.stubEnv("ADMIN_ACCOUNT_EMAIL", MOCK_ADMIN_EMAIL);

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
      expect(comment!.draft).toBe(false);
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
    test("Can create draft comments", async () => {
      const post = await createTestPost();
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
        draft: true,
      });
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
      expect(comment!.baseScore).toBe(0);
      expect(comment!.draft).toBe(true);
      expect(updatedPost!.commentCount).toBe(0);
      expect(updatedPost!.topLevelCommentCount).toBe(0);
      expect(updatedPost!.lastCommentedAt).toBeNull();
      expect(updatedPost!.lastCommentReplyAt).toBeNull();
      expect(vote).toBeUndefined();
      expect(author!.commentCount).toBe(0);
      expect(author!.maxCommentCount).toBe(0);
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
  test("Edit comments", async () => {
    const [post, commenter] = await Promise.all([
      createTestPost(),
      createTestUser(),
    ]);
    const commentId = await createPostComment({
      user: commenter,
      postId: post._id,
      parentCommentId: null,
      editorData: {
        originalContents: {
          type: "ckEditorMarkup",
          data: "<p>Original comment</p>",
        },
        updateType: "initial",
        commitMessage: "",
      },
    });
    const originalComment = await db.query.comments.findFirst({
      where: {
        _id: commentId,
      },
    });
    expect(originalComment).not.toBeNull();
    expect(originalComment?.contents?.html).toContain("Original comment");
    expect(originalComment?.contents?.version).toBe("1.0.0");
    await updateComment({
      user: commenter,
      commentId,
      editorData: {
        originalContents: {
          type: "ckEditorMarkup",
          data: "<p>Updated comment</p>",
        },
        updateType: "minor",
        commitMessage: "",
      },
    });
    const updatedComment = await db.query.comments.findFirst({
      where: {
        _id: commentId,
      },
    });
    expect(updatedComment).not.toBeNull();
    expect(updatedComment?.contents?.html).toContain("Updated comment");
    expect(updatedComment?.contents?.html).not.toContain("Original comment");
    expect(updatedComment?.contents?.version).toBe("1.1.0");
  });
  test("Delete and undelete comments", async () => {
    const post = await createTestPost({ commentCount: 1 });
    expect(post.commentCount).toBe(1);

    const user = await createTestUser({ commentCount: 1 });
    expect(user.commentCount).toBe(1);

    const comment = await createTestComment({ userId: user._id, postId: post._id });
    expect(comment.deleted).toBe(false);
    expect(comment.deletedPublic).toBe(false);
    expect(comment.deletedReason).toBeNull();
    expect(comment.deletedDate).toBeNull();
    expect(comment.deletedByUserId).toBeNull();

    {
      await deleteComment({ user, commentId: comment._id, reason: "Test reason" });
      const [updatedComment, updatedUser, updatedPost] = await Promise.all([
        db.query.comments.findFirst({
          where: {
            _id: comment._id,
          },
        }),
        db.query.users.findFirst({
          where: {
            _id: user._id,
          },
        }),
        db.query.posts.findFirst({
          where: {
            _id: post._id,
          },
        }),
      ]);
      expect(updatedComment).not.toBeNull();
      expect(updatedComment!.deleted).toBe(true);
      expect(updatedComment!.deletedPublic).toBe(true);
      expect(updatedComment!.deletedReason).toBe("Test reason");
      expect(updatedComment!.deletedDate).toBeTruthy();
      expect(updatedComment!.deletedByUserId).toBe(user._id);
      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.commentCount).toBe(0);
      expect(updatedPost).not.toBeNull();
      expect(updatedPost!.commentCount).toBe(0);
      expect(updatedPost!.lastCommentedAt).toBe(post.postedAt);
    }

    {
      await undeleteComment({ user, commentId: comment._id });
      const [updatedComment, updatedUser, updatedPost] = await Promise.all([
        db.query.comments.findFirst({
          where: {
            _id: comment._id,
          },
        }),
        db.query.users.findFirst({
          where: {
            _id: user._id,
          },
        }),
        db.query.posts.findFirst({
          where: {
            _id: post._id,
          },
        }),
      ]);
      expect(updatedComment).not.toBeNull();
      expect(updatedComment!.deleted).toBe(false);
      expect(updatedComment!.deletedPublic).toBe(false);
      expect(updatedComment!.deletedReason).toBeNull();
      expect(updatedComment!.deletedDate).toBeNull();
      expect(updatedComment!.deletedByUserId).toBeNull();
      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.commentCount).toBe(1);
      expect(updatedPost).not.toBeNull();
      expect(updatedPost!.commentCount).toBe(1);
      expect(updatedPost!.lastCommentedAt).toBe(comment.postedAt);
    }
  });
  test("Admin comment deletion sends a private message", async () => {
    const [post, user, admin] = await Promise.all([
      createTestPost(),
      createTestUser(),
      createTestUser({ isAdmin: true, email: MOCK_ADMIN_EMAIL }),
    ]);
    const comment = await createTestComment({
      userId: user._id,
      postId: post._id,
      contents: { html: "<div>Test comment</div>" } as DenormalizedRevision,
    });
    await deleteComment({
      user: admin,
      commentId: comment._id,
      reason: "Test reason",
    });
    // Send the PM happens asynchronously - wait a bit for it to happen
    await sleep(200);
    const conversation = await db.query.conversations.findFirst({
      where: {
        RAW: (table) => sql`${table.participantIds} @> ARRAY[${user._id}::VARCHAR]`,
      },
    });
    expect(conversation).toBeTruthy();
    expect(conversation!.participantIds.toSorted()).toStrictEqual(
      [user._id, admin._id].toSorted(),
    );
  });
});
