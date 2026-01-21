import { describe, it, expect } from "vitest";
import {
  createUser,
  updateUser,
  createPost,
  updatePost,
  viewPost,
  createComment,
  updateComment,
  viewComment,
  parseAction,
  initialState,
  deriveState,
  PostStatus,
  MINIMUM_APPROVAL_KARMA,
  SPAM_KARMA_THRESHOLD,
} from "./fm-lite";

describe("fm-lite", () => {
  describe("viewPost", () => {
    const setupState = () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        // Make alice reviewed so her posts aren't flagged as authorIsUnreviewed
        {
          type: "UPDATE_USER" as const,
          actor: "god",
          params: { userId: "alice", changes: { reviewedByUserId: "mod" } },
        },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "bob" } },
        // Make bob reviewed too
        {
          type: "UPDATE_USER" as const,
          actor: "god",
          params: { userId: "bob", changes: { reviewedByUserId: "mod" } },
        },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "admin" } },
        {
          type: "UPDATE_USER" as const,
          actor: "god",
          params: { userId: "admin", changes: { isAdmin: true } },
        },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "mod" } },
        {
          type: "UPDATE_USER" as const,
          actor: "god",
          params: { userId: "mod", changes: { isMod: true } },
        },
        // Create an unreviewed user for the "unreviewed" post test
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "newbie" } },
        {
          type: "CREATE_POST" as const,
          actor: "alice",
          params: { postId: "draft" },
        },
        {
          type: "CREATE_POST" as const,
          actor: "alice",
          params: { postId: "public" },
        },
        {
          type: "UPDATE_POST" as const,
          actor: "god",
          params: {
            postId: "public",
            changes: { draft: false, status: PostStatus.APPROVED },
          },
        },
        // Note: No test for STATUS_PENDING - it's unused in ForumMagnum (0 examples in production)
        // Unreviewed post created by unreviewed user
        {
          type: "CREATE_POST" as const,
          actor: "newbie",
          params: { postId: "unreviewed" },
        },
        {
          type: "UPDATE_POST" as const,
          actor: "god",
          params: {
            postId: "unreviewed",
            changes: { draft: false, status: PostStatus.APPROVED },
          },
        },
        {
          type: "CREATE_POST" as const,
          actor: "alice",
          params: { postId: "loggedInOnly" },
        },
        {
          type: "UPDATE_POST" as const,
          actor: "god",
          params: {
            postId: "loggedInOnly",
            changes: {
              draft: false,
              status: PostStatus.APPROVED,
              onlyVisibleToLoggedIn: true,
            },
          },
        },
      ];
      return deriveState(actions);
    };

    it("P1: non-author cannot see draft", () => {
      const state = setupState();
      const result = viewPost("bob", state, { postId: "draft" });
      expect(result.canView).toBe(false);
      expect(result.reason).toContain("draft");
    });

    it("P1: logged-out cannot see draft", () => {
      const state = setupState();
      const result = viewPost(null, state, { postId: "draft" });
      expect(result.canView).toBe(false);
    });

    it("P1: non-author cannot see authorIsUnreviewed post", () => {
      const state = setupState();
      const result = viewPost("bob", state, { postId: "unreviewed" });
      expect(result.canView).toBe(false);
      expect(result.reason).toContain("unreviewed");
    });

    it("P1: user banned from post cannot view it", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        // Make alice reviewed so post is viewable
        {
          type: "UPDATE_USER" as const,
          actor: "god",
          params: { userId: "alice", changes: { reviewedByUserId: "mod" } },
        },
        {
          type: "CREATE_USER" as const,
          actor: "god",
          params: { userId: "banned-bob" },
        },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "UPDATE_POST" as const,
          actor: "god",
          params: {
            postId: "p1",
            parentCommentId: null,
            changes: {
              draft: false,
              status: PostStatus.APPROVED,
              bannedUserIds: ["banned-bob"],
            },
          },
        },
      ];
      const state = deriveState(actions);
      expect(viewPost("banned-bob", state, { postId: "p1" }).canView).toBe(false);
      expect(viewPost("banned-bob", state, { postId: "p1" }).reason).toContain(
        "banned",
      );
      // Other users can still see it
      expect(viewPost("alice", state, { postId: "p1" }).canView).toBe(true);
      expect(viewPost(null, state, { postId: "p1" }).canView).toBe(true);
    });

    it("P1: cannot view rejected post", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "bob" } },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "UPDATE_POST" as const,
          actor: "god",
          params: { postId: "p1", changes: { draft: false, rejected: true } },
        },
      ];
      const state = deriveState(actions);
      const result = viewPost("bob", state, { postId: "p1" });
      expect(result.canView).toBe(false);
      expect(result.reason).toContain("rejected");
    });

    it("P1: cannot view post with non-approved status", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "bob" } },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "UPDATE_POST" as const,
          actor: "god",
          params: {
            postId: "p1",
            parentCommentId: null,
            changes: { draft: false, status: PostStatus.SPAM },
          },
        },
      ];
      const state = deriveState(actions);
      const result = viewPost("bob", state, { postId: "p1" });
      expect(result.canView).toBe(false);
      expect(result.reason).toContain("not approved");
    });

    it("P2: author can see their own draft", () => {
      const state = setupState();
      const result = viewPost("alice", state, { postId: "draft" });
      expect(result.canView).toBe(true);
    });

    it("P2: admin can see draft", () => {
      const state = setupState();
      const result = viewPost("admin", state, { postId: "draft" });
      expect(result.canView).toBe(true);
    });

    it("P2: mod can see draft", () => {
      const state = setupState();
      const result = viewPost("mod", state, { postId: "draft" });
      expect(result.canView).toBe(true);
    });

    it("P2: anyone can see public post", () => {
      const state = setupState();
      expect(viewPost(null, state, { postId: "public" }).canView).toBe(true);
      expect(viewPost("bob", state, { postId: "public" }).canView).toBe(true);
    });

    it("P2: author can see their own authorIsUnreviewed post", () => {
      const state = setupState();
      expect(viewPost("newbie", state, { postId: "unreviewed" }).canView).toBe(true);
    });

    it("P2: logged-out cannot see onlyVisibleToLoggedIn post", () => {
      const state = setupState();
      const result = viewPost(null, state, { postId: "loggedInOnly" });
      expect(result.canView).toBe(false);
      expect(result.reason).toContain("logged-in");
    });

    it("P2: logged-in user can see onlyVisibleToLoggedIn post", () => {
      const state = setupState();
      expect(viewPost("bob", state, { postId: "loggedInOnly" }).canView).toBe(true);
    });

    it("P2: anyone can see unlisted post (via direct link)", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        // Make alice reviewed so post is viewable
        {
          type: "UPDATE_USER" as const,
          actor: "god",
          params: { userId: "alice", changes: { reviewedByUserId: "mod" } },
        },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "bob" } },
        {
          type: "CREATE_POST" as const,
          actor: "alice",
          params: { postId: "unlisted" },
        },
        {
          type: "UPDATE_POST" as const,
          actor: "god",
          params: {
            postId: "unlisted",
            changes: { draft: false, status: PostStatus.APPROVED, unlisted: true },
          },
        },
      ];
      const state = deriveState(actions);
      expect(viewPost(null, state, { postId: "unlisted" }).canView).toBe(true);
      expect(viewPost("bob", state, { postId: "unlisted" }).canView).toBe(true);
    });

    it("P2: cannot view deleted draft", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "bob" } },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "UPDATE_POST" as const,
          actor: "god",
          params: { postId: "p1", changes: { draft: false, deletedDraft: true } },
        },
      ];
      const state = deriveState(actions);
      const result = viewPost("bob", state, { postId: "p1" });
      expect(result.canView).toBe(false);
      expect(result.reason).toContain("deleted draft");
    });

    it("P2: cannot view future post", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "bob" } },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "UPDATE_POST" as const,
          actor: "god",
          params: { postId: "p1", changes: { draft: false, isFuture: true } },
        },
      ];
      const state = deriveState(actions);
      const result = viewPost("bob", state, { postId: "p1" });
      expect(result.canView).toBe(false);
      expect(result.reason).toContain("future");
    });

    it("P3: returns not found for nonexistent post", () => {
      const state = initialState();
      const result = viewPost(null, state, { postId: "nonexistent" });
      expect(result.canView).toBe(false);
      expect(result.reason).toContain("not found");
    });
  });

  describe("viewComment", () => {
    it("P1: non-author cannot see draft comment", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "bob" } },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "CREATE_COMMENT" as const,
          actor: "alice",
          params: {
            commentId: "c1",
            postId: "p1",
            parentCommentId: null,
            contents: "Test comment",
            akismetWouldFlagAsSpam: false,
            postedAt: new Date(),
          },
        },
        {
          type: "UPDATE_COMMENT" as const,
          actor: "god",
          params: { commentId: "c1", changes: { draft: true } },
        },
      ];
      const state = deriveState(actions);
      const result = viewComment("bob", state, { commentId: "c1" });
      expect(result.canView).toBe(false);
      expect(result.reason).toContain("draft");
    });

    it("P1: logged-out cannot see draft comment", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } }, // TODO this can just be logged-out
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "CREATE_COMMENT" as const,
          actor: "alice",
          params: {
            commentId: "c1",
            postId: "p1",
            parentCommentId: null,
            contents: "Test comment",
            akismetWouldFlagAsSpam: false,
            postedAt: new Date(),
          },
        },
        {
          type: "UPDATE_COMMENT" as const,
          actor: "god",
          params: { commentId: "c1", changes: { draft: true } },
        },
      ];
      const state = deriveState(actions);
      const result = viewComment(null, state, { commentId: "c1" });
      expect(result.canView).toBe(false);
    });

    it("P1: non-author cannot see rejected comment", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "bob" } },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "CREATE_COMMENT" as const,
          actor: "alice",
          params: {
            commentId: "c1",
            postId: "p1",
            parentCommentId: null,
            contents: "Test comment",
            akismetWouldFlagAsSpam: false,
            postedAt: new Date(),
          },
        },
        {
          type: "UPDATE_COMMENT" as const,
          actor: "god",
          params: { commentId: "c1", changes: { rejected: true } },
        },
      ];
      const state = deriveState(actions);
      const result = viewComment("bob", state, { commentId: "c1" });
      expect(result.canView).toBe(false);
      expect(result.reason).toContain("rejected");
    });

    it("P1: non-author cannot see deleted comment (deletedPublic=false)", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "bob" } },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "CREATE_COMMENT" as const,
          actor: "alice",
          params: {
            commentId: "c1",
            postId: "p1",
            parentCommentId: null,
            contents: "Test comment",
            akismetWouldFlagAsSpam: false,
            postedAt: new Date(),
          },
        },
        {
          type: "UPDATE_COMMENT" as const,
          actor: "god",
          params: {
            commentId: "c1",
            changes: { deleted: true, deletedPublic: false },
          },
        },
      ];
      const state = deriveState(actions);
      const result = viewComment("bob", state, { commentId: "c1" });
      expect(result.canView).toBe(false);
      expect(result.reason).toContain("deleted");
    });

    it("P1: deletedPublic comment: can see comment and metadata but not contents", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "bob" } },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "CREATE_COMMENT" as const,
          actor: "alice",
          params: {
            commentId: "c1",
            postId: "p1",
            parentCommentId: null,
            contents: "Secret content that should be hidden",
            akismetWouldFlagAsSpam: false,
            postedAt: new Date(),
          },
        },
        {
          type: "UPDATE_COMMENT" as const,
          actor: "god",
          params: {
            commentId: "c1",
            changes: { deleted: true, deletedPublic: true },
          },
        },
      ];
      const state = deriveState(actions);
      const result = viewComment("bob", state, { commentId: "c1" });
      // Can see the comment exists
      expect(result.canView).toBe(true);
      expect(result.comment).toBeDefined();
      // But cannot read contents
      expect(result.canReadContents).toBe(false);
      // Can see metadata like authorId and deletion flags
      expect(result.comment?.authorId).toBe("alice");
      expect(result.comment?.deleted).toBe(true);
      expect(result.comment?.deletedPublic).toBe(true);
      expect(result.viewMode).toBe("deleted");
    });

    it("P1: spam comment is deleted (not visible to regular users)", () => {
      const actions = [
        {
          type: "CREATE_USER" as const,
          actor: "god",
          params: { userId: "spammer" },
        },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "bob" } },
        { type: "CREATE_POST" as const, actor: "spammer", params: { postId: "p1" } },
        {
          type: "CREATE_COMMENT" as const,
          actor: "spammer",
          params: {
            commentId: "c1",
            postId: "p1",
            parentCommentId: null,
            contents: "Buy cheap products now!",
            akismetWouldFlagAsSpam: true,
            postedAt: new Date(),
          },
        },
      ];
      const state = deriveState(actions);
      // Verify the comment has both spam=true AND deleted=true
      const comment = state.comments.get("c1");
      expect(comment?.spam).toBe(true);
      expect(comment?.deleted).toBe(true);
      // Regular users cannot see deleted comments
      const result = viewComment("bob", state, { commentId: "c1" });
      expect(result.canView).toBe(false);
      expect(result.reason).toContain("deleted");
    });

    it("P1: unreviewed author comment hidden when postedAt >= hideUnreviewedAuthorComments date", () => {
      const hideUnreviewedAuthorCommentsDate = new Date("2024-01-01");
      const commentDate = new Date("2024-06-01"); // After the setting date
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "newbie" } },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "bob" } },
        { type: "CREATE_POST" as const, actor: "newbie", params: { postId: "p1" } },
        {
          type: "CREATE_COMMENT" as const,
          actor: "newbie",
          params: {
            commentId: "c1",
            postId: "p1",
            parentCommentId: null,
            contents: "Test comment",
            akismetWouldFlagAsSpam: false,
            postedAt: commentDate,
          },
        },
      ];
      const state = deriveState(actions);
      const result = viewComment("bob", state, {
        commentId: "c1",
        hideUnreviewedAuthorComments: hideUnreviewedAuthorCommentsDate,
      });
      expect(result.canView).toBe(false);
      expect(result.reason).toContain("unreviewed");
    });

    it("P2: author can see their own draft comment", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "CREATE_COMMENT" as const,
          actor: "alice",
          params: {
            commentId: "c1",
            postId: "p1",
            parentCommentId: null,
            contents: "Test comment",
            akismetWouldFlagAsSpam: false,
            postedAt: new Date(),
          },
        },
        {
          type: "UPDATE_COMMENT" as const,
          actor: "god",
          params: { commentId: "c1", changes: { draft: true } },
        },
      ];
      const state = deriveState(actions);
      const result = viewComment("alice", state, { commentId: "c1" });
      expect(result.canView).toBe(true);
    });

    it("P2: admin can see draft comment", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "admin" } },
        {
          type: "UPDATE_USER" as const,
          actor: "god",
          params: { userId: "admin", changes: { isAdmin: true } },
        },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "CREATE_COMMENT" as const,
          actor: "alice",
          params: {
            commentId: "c1",
            postId: "p1",
            parentCommentId: null,
            contents: "Test comment",
            akismetWouldFlagAsSpam: false,
            postedAt: new Date(),
          },
        },
        {
          type: "UPDATE_COMMENT" as const,
          actor: "god",
          params: { commentId: "c1", changes: { draft: true } },
        },
      ];
      const state = deriveState(actions);
      const result = viewComment("admin", state, { commentId: "c1" });
      expect(result.canView).toBe(true);
    });

    it("P2: mod can see draft comment", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "mod" } },
        {
          type: "UPDATE_USER" as const,
          actor: "god",
          params: { userId: "mod", changes: { isMod: true } },
        },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "CREATE_COMMENT" as const,
          actor: "alice",
          params: {
            commentId: "c1",
            postId: "p1",
            parentCommentId: null,
            contents: "Test comment",
            akismetWouldFlagAsSpam: false,
            postedAt: new Date(),
          },
        },
        {
          type: "UPDATE_COMMENT" as const,
          actor: "god",
          params: { commentId: "c1", changes: { draft: true } },
        },
      ];
      const state = deriveState(actions);
      const result = viewComment("mod", state, { commentId: "c1" });
      expect(result.canView).toBe(true);
    });

    it("P2: anyone can see non-draft comment", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "bob" } },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "CREATE_COMMENT" as const,
          actor: "alice",
          params: {
            commentId: "c1",
            postId: "p1",
            parentCommentId: null,
            contents: "Test comment",
            akismetWouldFlagAsSpam: false,
            postedAt: new Date(),
          },
        },
      ];
      const state = deriveState(actions);
      // Comment is non-draft by default
      expect(viewComment(null, state, { commentId: "c1" }).canView).toBe(true);
      expect(viewComment("bob", state, { commentId: "c1" }).canView).toBe(true);
    });

    it("P2: author can see their own rejected comment: can read contents and see rejected flag", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "CREATE_COMMENT" as const,
          actor: "alice",
          params: {
            commentId: "c1",
            postId: "p1",
            parentCommentId: null,
            contents: "Test comment",
            akismetWouldFlagAsSpam: false,
            postedAt: new Date(),
          },
        },
        {
          type: "UPDATE_COMMENT" as const,
          actor: "god",
          params: { commentId: "c1", changes: { rejected: true } },
        },
      ];
      const state = deriveState(actions);
      const result = viewComment("alice", state, { commentId: "c1" });
      expect(result.canView).toBe(true);
      expect(result.canReadContents).toBe(true);
      expect(result.comment?.rejected).toBe(true);
    });

    it("P2: admin can see rejected comment", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "admin" } },
        {
          type: "UPDATE_USER" as const,
          actor: "god",
          params: { userId: "admin", changes: { isAdmin: true } },
        },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "CREATE_COMMENT" as const,
          actor: "alice",
          params: {
            commentId: "c1",
            postId: "p1",
            parentCommentId: null,
            contents: "Test comment",
            akismetWouldFlagAsSpam: false,
            postedAt: new Date(),
          },
        },
        {
          type: "UPDATE_COMMENT" as const,
          actor: "god",
          params: { commentId: "c1", changes: { rejected: true } },
        },
      ];
      const state = deriveState(actions);
      const result = viewComment("admin", state, { commentId: "c1" });
      expect(result.canView).toBe(true);
    });

    it("P2: author can see their own deleted comment AND read contents", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "CREATE_COMMENT" as const,
          actor: "alice",
          params: {
            commentId: "c1",
            postId: "p1",
            parentCommentId: null,
            contents: "My deleted comment",
            akismetWouldFlagAsSpam: false,
            postedAt: new Date(),
          },
        },
        {
          type: "UPDATE_COMMENT" as const,
          actor: "god",
          params: {
            commentId: "c1",
            changes: { deleted: true, deletedPublic: false },
          },
        },
      ];
      const state = deriveState(actions);
      const result = viewComment("alice", state, { commentId: "c1" });
      expect(result.canView).toBe(true);
      // Author CAN read contents even when deleted
      expect(result.canReadContents).toBe(true);
    });

    it("P2: admin can see deleted comment AND read contents", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "admin" } },
        {
          type: "UPDATE_USER" as const,
          actor: "god",
          params: { userId: "admin", changes: { isAdmin: true } },
        },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "CREATE_COMMENT" as const,
          actor: "alice",
          params: {
            commentId: "c1",
            postId: "p1",
            parentCommentId: null,
            contents: "Deleted content",
            akismetWouldFlagAsSpam: false,
            postedAt: new Date(),
          },
        },
        {
          type: "UPDATE_COMMENT" as const,
          actor: "god",
          params: {
            commentId: "c1",
            changes: { deleted: true, deletedPublic: false },
          },
        },
      ];
      const state = deriveState(actions);
      const result = viewComment("admin", state, { commentId: "c1" });
      expect(result.canView).toBe(true);
      // Admin CAN read contents even when deleted
      expect(result.canReadContents).toBe(true);
    });

    it("P2: author can see their own spam (deleted) comment AND read contents", () => {
      const actions = [
        {
          type: "CREATE_USER" as const,
          actor: "god",
          params: { userId: "spammer" },
        },
        { type: "CREATE_POST" as const, actor: "spammer", params: { postId: "p1" } },
        {
          type: "CREATE_COMMENT" as const,
          actor: "spammer",
          params: {
            commentId: "c1",
            postId: "p1",
            parentCommentId: null,
            contents: "My spam comment",
            akismetWouldFlagAsSpam: true,
            postedAt: new Date(),
          },
        },
      ];
      const state = deriveState(actions);
      // Verify it's both spam and deleted
      expect(state.comments.get("c1")?.spam).toBe(true);
      expect(state.comments.get("c1")?.deleted).toBe(true);
      const result = viewComment("spammer", state, { commentId: "c1" });
      expect(result.canView).toBe(true);
      // Author CAN read contents even when deleted (spam)
      expect(result.canReadContents).toBe(true);
    });

    it("P2: admin can see spam (deleted) comment AND read contents", () => {
      const actions = [
        {
          type: "CREATE_USER" as const,
          actor: "god",
          params: { userId: "spammer" },
        },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "admin" } },
        {
          type: "UPDATE_USER" as const,
          actor: "god",
          params: { userId: "admin", changes: { isAdmin: true } },
        },
        { type: "CREATE_POST" as const, actor: "spammer", params: { postId: "p1" } },
        {
          type: "CREATE_COMMENT" as const,
          actor: "spammer",
          params: {
            commentId: "c1",
            postId: "p1",
            parentCommentId: null,
            contents: "Spam content",
            akismetWouldFlagAsSpam: true,
            postedAt: new Date(),
          },
        },
      ];
      const state = deriveState(actions);
      // Verify it's both spam and deleted
      expect(state.comments.get("c1")?.spam).toBe(true);
      expect(state.comments.get("c1")?.deleted).toBe(true);
      const result = viewComment("admin", state, { commentId: "c1" });
      expect(result.canView).toBe(true);
      // Admin CAN read contents even when deleted (spam)
      expect(result.canReadContents).toBe(true);
    });

    it("P2: normal comment: can read contents", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "bob" } },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "CREATE_COMMENT" as const,
          actor: "alice",
          params: {
            commentId: "c1",
            postId: "p1",
            parentCommentId: null,
            contents: "Test comment",
            akismetWouldFlagAsSpam: false,
            postedAt: new Date(),
          },
        },
      ];
      const state = deriveState(actions);
      const result = viewComment("bob", state, { commentId: "c1" });
      expect(result.canView).toBe(true);
      expect(result.canReadContents).toBe(true);
    });

    it("P2: unreviewed author comment visible when postedAt < hideUnreviewedAuthorComments date (grandfather clause)", () => {
      const hideUnreviewedAuthorCommentsDate = new Date("2024-06-01");
      const commentDate = new Date("2024-01-01"); // Before the setting date - grandfathered in
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "newbie" } },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "bob" } },
        { type: "CREATE_POST" as const, actor: "newbie", params: { postId: "p1" } },
        {
          type: "CREATE_COMMENT" as const,
          actor: "newbie",
          params: {
            commentId: "c1",
            postId: "p1",
            parentCommentId: null,
            contents: "Test comment",
            akismetWouldFlagAsSpam: false,
            postedAt: commentDate,
          },
        },
      ];
      const state = deriveState(actions);
      const result = viewComment("bob", state, {
        commentId: "c1",
        hideUnreviewedAuthorComments: hideUnreviewedAuthorCommentsDate,
      });
      expect(result.canView).toBe(true);
    });

    it("P2: author can see their own unreviewed comment even after hideUnreviewedAuthorComments date", () => {
      const hideUnreviewedAuthorCommentsDate = new Date("2024-01-01");
      const commentDate = new Date("2024-06-01");
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "newbie" } },
        { type: "CREATE_POST" as const, actor: "newbie", params: { postId: "p1" } },
        {
          type: "CREATE_COMMENT" as const,
          actor: "newbie",
          params: {
            commentId: "c1",
            postId: "p1",
            parentCommentId: null,
            contents: "Test comment",
            akismetWouldFlagAsSpam: false,
            postedAt: commentDate,
          },
        },
      ];
      const state = deriveState(actions);
      const result = viewComment("newbie", state, {
        commentId: "c1",
        hideUnreviewedAuthorComments: hideUnreviewedAuthorCommentsDate,
      });
      expect(result.canView).toBe(true);
    });

    it("P2: admin can see unreviewed author comment even after hideUnreviewedAuthorComments date", () => {
      const hideUnreviewedAuthorCommentsDate = new Date("2024-01-01");
      const commentDate = new Date("2024-06-01");
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "newbie" } },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "admin" } },
        {
          type: "UPDATE_USER" as const,
          actor: "god",
          params: { userId: "admin", changes: { isAdmin: true } },
        },
        { type: "CREATE_POST" as const, actor: "newbie", params: { postId: "p1" } },
        {
          type: "CREATE_COMMENT" as const,
          actor: "newbie",
          params: {
            commentId: "c1",
            postId: "p1",
            parentCommentId: null,
            contents: "Test comment",
            akismetWouldFlagAsSpam: false,
            postedAt: commentDate,
          },
        },
      ];
      const state = deriveState(actions);
      const result = viewComment("admin", state, {
        commentId: "c1",
        hideUnreviewedAuthorComments: hideUnreviewedAuthorCommentsDate,
      });
      expect(result.canView).toBe(true);
    });

    it("P2: unreviewed comment visible when hideUnreviewedAuthorComments option is not set", () => {
      const commentDate = new Date("2024-06-01");
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "newbie" } },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "bob" } },
        { type: "CREATE_POST" as const, actor: "newbie", params: { postId: "p1" } },
        {
          type: "CREATE_COMMENT" as const,
          actor: "newbie",
          params: {
            commentId: "c1",
            postId: "p1",
            parentCommentId: null,
            contents: "Test comment",
            akismetWouldFlagAsSpam: false,
            postedAt: commentDate,
          },
        },
      ];
      const state = deriveState(actions);
      // No hideUnreviewedAuthorComments option - comment should be visible
      const result = viewComment("bob", state, { commentId: "c1" });
      expect(result.canView).toBe(true);
    });

    it("P3: returns not found for nonexistent comment", () => {
      const state = initialState();
      const result = viewComment(null, state, { commentId: "nonexistent" });
      expect(result.canView).toBe(false);
      expect(result.reason).toContain("not found");
    });
  });

  describe("[UNSTABLE] deriveState", () => {
    it("P3: throws on UPDATE_USER for non-existent user", () => {
      const actions = [
        {
          type: "UPDATE_USER" as const,
          actor: "god",
          params: { userId: "nonexistent", changes: { isAdmin: true } },
        },
      ];
      expect(() => deriveState(actions)).toThrow("not found");
    });

    it("P3: throws on UPDATE_POST for non-existent post", () => {
      const actions = [
        {
          type: "UPDATE_POST" as const,
          actor: "god",
          params: { postId: "nonexistent", changes: { draft: false } },
        },
      ];
      expect(() => deriveState(actions)).toThrow("not found");
    });

    it("P3: throws on UPDATE_COMMENT for non-existent comment", () => {
      const actions = [
        {
          type: "UPDATE_COMMENT" as const,
          actor: "god",
          params: { commentId: "nonexistent", changes: { draft: true } },
        },
      ];
      expect(() => deriveState(actions)).toThrow("not found");
    });

    it("P3: throws on CREATE_COMMENT with non-existent author", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "CREATE_COMMENT" as const,
          actor: "nonexistent", // Actor (author) doesn't exist
          params: {
            commentId: "c1",
            postId: "p1",
            parentCommentId: null,
            contents: "Test",
            akismetWouldFlagAsSpam: false,
            postedAt: new Date(),
          },
        },
      ];
      expect(() => deriveState(actions)).toThrow("not found");
    });

    it("P3: throws on CREATE_POST with non-existent author", () => {
      const actions = [
        {
          type: "CREATE_POST" as const,
          actor: "nonexistent",
          params: { postId: "p1" },
        },
      ];
      expect(() => deriveState(actions)).toThrow("not found");
    });
  });

  describe("[UNSTABLE] createUser", () => {
    it("P3: adds a user with default fields", () => {
      const state = initialState();
      const result = createUser("god", state, { userId: "alice" });
      expect(result.ok).toBe(true);
      const user = result.state.users.get("alice");
      expect(user).toBeDefined();
      expect(user?.id).toBe("alice");
      expect(user?.isAdmin).toBe(false);
      expect(user?.isMod).toBe(false);
      expect(user?.karma).toBe(0);
      expect(user?.reviewedByUserId).toBeNull();
      expect(user?.deleted).toBe(false);
      expect(user?.allCommentingDisabled).toBe(false);
      expect(user?.commentingOnOtherUsersDisabled).toBe(false);
      expect(user?.bannedUserIds).toEqual([]);
      expect(user?.bannedPersonalUserIds).toEqual([]);
      expect(user?.canModerateOwnPost).toBe(false);
      expect(user?.canModerateOwnPersonalPost).toBe(false);
      expect(user?.createdAt).toBeInstanceOf(Date);
    });

    it("P3: fails if user already exists", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
      ];
      const state = deriveState(actions);
      const result = createUser("god", state, { userId: "alice" });
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("already exists");
    });
  });

  describe("[UNSTABLE] updateUser", () => {
    it("P3: updates a user", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
      ];
      const state = deriveState(actions);
      const result = updateUser("god", state, {
        userId: "alice",
        changes: { isAdmin: true },
      });
      expect(result.ok).toBe(true);
      expect(result.state.users.get("alice")?.isAdmin).toBe(true);
    });

    it("P3: fails if user not found", () => {
      const state = initialState();
      const result = updateUser("god", state, {
        userId: "nonexistent",
        changes: { isAdmin: true },
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("not found");
    });

    it("P3: fails with empty changes", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
      ];
      const state = deriveState(actions);
      const result = updateUser("god", state, { userId: "alice", changes: {} });
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("No changes");
    });
  });

  describe("[UNSTABLE] createPost", () => {
    it("P3: adds a post with defaults", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
      ];
      const state = deriveState(actions);
      const result = createPost("alice", state, { postId: "p1" });
      expect(result.ok).toBe(true);
      const post = result.state.posts.get("p1");
      expect(post).toBeDefined();
      expect(post?.authorId).toBe("alice");
      expect(post?.draft).toBe(true);
      expect(post?.status).toBe(PostStatus.APPROVED);
    });

    it("P3: sets authorIsUnreviewed=true for new user with karma < MINIMUM_APPROVAL_KARMA", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "newbie" } },
      ];
      const state = deriveState(actions);

      // New user has karma=0, reviewedByUserId=null
      const user = state.users.get("newbie");
      expect(user?.karma).toBe(0);
      expect(user?.reviewedByUserId).toBeNull();

      // Post should be created with authorIsUnreviewed=true
      const result = createPost("newbie", state, { postId: "p1" });
      expect(result.ok).toBe(true);
      expect(result.state.posts.get("p1")?.authorIsUnreviewed).toBe(true);
    });

    it("P3: sets authorIsUnreviewed=false for user with karma >= MINIMUM_APPROVAL_KARMA", () => {
      const actions = [
        {
          type: "CREATE_USER" as const,
          actor: "god",
          params: { userId: "veteran" },
        },
        {
          type: "UPDATE_USER" as const,
          actor: "god",
          params: { userId: "veteran", changes: { karma: MINIMUM_APPROVAL_KARMA } },
        },
      ];
      const state = deriveState(actions);

      const result = createPost("veteran", state, { postId: "p1" });
      expect(result.ok).toBe(true);
      expect(result.state.posts.get("p1")?.authorIsUnreviewed).toBe(false);
    });

    it("P3: sets authorIsUnreviewed=false for reviewed user even with low karma", () => {
      const actions = [
        {
          type: "CREATE_USER" as const,
          actor: "god",
          params: { userId: "reviewed" },
        },
        {
          type: "UPDATE_USER" as const,
          actor: "god",
          params: { userId: "reviewed", changes: { reviewedByUserId: "mod1" } },
        },
      ];
      const state = deriveState(actions);

      // User has karma=0 but is reviewed
      expect(state.users.get("reviewed")?.karma).toBe(0);
      expect(state.users.get("reviewed")?.reviewedByUserId).toBe("mod1");

      const result = createPost("reviewed", state, { postId: "p1" });
      expect(result.ok).toBe(true);
      expect(result.state.posts.get("p1")?.authorIsUnreviewed).toBe(false);
    });

    it("P3: fails if author not found", () => {
      const state = initialState();
      const result = createPost("nonexistent", state, { postId: "p1" });
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("not found");
    });

    it("P3: fails if post already exists", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
      ];
      const state = deriveState(actions);
      const result = createPost("alice", state, { postId: "p1" });
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("already exists");
    });
  });

  describe("[UNSTABLE] updatePost", () => {
    it("P3: updates a post", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
      ];
      const state = deriveState(actions);
      const result = updatePost("god", state, {
        postId: "p1",
        changes: { draft: false, status: PostStatus.APPROVED },
      });
      expect(result.ok).toBe(true);
      expect(result.state.posts.get("p1")?.draft).toBe(false);
    });

    it("P3: fails if post not found", () => {
      const state = initialState();
      const result = updatePost("god", state, {
        postId: "nonexistent",
        changes: { draft: false },
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("not found");
    });

    it("P3: fails with empty changes", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
      ];
      const state = deriveState(actions);
      const result = updatePost("god", state, { postId: "p1", changes: {} });
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("No changes");
    });
  });

  describe("[UNSTABLE] createComment", () => {
    // ==========================================================================
    // Permission check tests (P1 - access control)
    // ==========================================================================

    it("P1: deleted user cannot comment", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        {
          type: "CREATE_USER" as const,
          actor: "god",
          params: { userId: "deleted-user" },
        },
        {
          type: "UPDATE_USER" as const,
          actor: "god",
          params: { userId: "deleted-user", changes: { deleted: true } },
        },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
      ];
      const state = deriveState(actions);
      const result = createComment("deleted-user", state, {
        commentId: "c1",
        postId: "p1",
        parentCommentId: null,
        contents: "Test",
        akismetWouldFlagAsSpam: false,
        postedAt: new Date(),
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("deleted");
    });

    it("P1: user with allCommentingDisabled cannot comment", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        {
          type: "CREATE_USER" as const,
          actor: "god",
          params: { userId: "disabled-user" },
        },
        {
          type: "UPDATE_USER" as const,
          actor: "god",
          params: {
            userId: "disabled-user",
            changes: { allCommentingDisabled: true },
          },
        },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
      ];
      const state = deriveState(actions);
      const result = createComment("disabled-user", state, {
        commentId: "c1",
        postId: "p1",
        parentCommentId: null,
        contents: "Test",
        akismetWouldFlagAsSpam: false,
        postedAt: new Date(),
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("disabled");
    });

    it("P1: user with commentingOnOtherUsersDisabled cannot comment on others' posts", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        {
          type: "CREATE_USER" as const,
          actor: "god",
          params: { userId: "restricted-user" },
        },
        {
          type: "UPDATE_USER" as const,
          actor: "god",
          params: {
            userId: "restricted-user",
            changes: { commentingOnOtherUsersDisabled: true },
          },
        },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
      ];
      const state = deriveState(actions);
      const result = createComment("restricted-user", state, {
        commentId: "c1",
        postId: "p1",
        parentCommentId: null,
        contents: "Test",
        akismetWouldFlagAsSpam: false,
        postedAt: new Date(),
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("own posts");
    });

    it("P2: user with commentingOnOtherUsersDisabled CAN comment on their own posts", () => {
      const actions = [
        {
          type: "CREATE_USER" as const,
          actor: "god",
          params: { userId: "restricted-user" },
        },
        {
          type: "UPDATE_USER" as const,
          actor: "god",
          params: {
            userId: "restricted-user",
            changes: { commentingOnOtherUsersDisabled: true },
          },
        },
        {
          type: "CREATE_POST" as const,
          actor: "restricted-user",
          params: { postId: "p1" },
        },
      ];
      const state = deriveState(actions);
      const result = createComment("restricted-user", state, {
        commentId: "c1",
        postId: "p1",
        parentCommentId: null,
        contents: "Test",
        akismetWouldFlagAsSpam: false,
        postedAt: new Date(),
      });
      expect(result.ok).toBe(true);
    });

    it("P1: non-author cannot make top-level comment on shortform post", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "bob" } },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "UPDATE_POST" as const,
          actor: "god",
          params: { postId: "p1", changes: { shortform: true } },
        },
      ];
      const state = deriveState(actions);
      const result = createComment("bob", state, {
        commentId: "c1",
        postId: "p1",
        parentCommentId: null, // Top-level comment
        contents: "Test",
        akismetWouldFlagAsSpam: false,
        postedAt: new Date(),
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("shortform");
    });

    it("P2: author CAN make top-level comment on their own shortform post", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "UPDATE_POST" as const,
          actor: "god",
          params: { postId: "p1", changes: { shortform: true } },
        },
      ];
      const state = deriveState(actions);
      const result = createComment("alice", state, {
        commentId: "c1",
        postId: "p1",
        parentCommentId: null,
        contents: "Test",
        akismetWouldFlagAsSpam: false,
        postedAt: new Date(),
      });
      expect(result.ok).toBe(true);
    });

    it("P2: non-author CAN reply to comment on shortform post", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "bob" } },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "UPDATE_POST" as const,
          actor: "god",
          params: { postId: "p1", changes: { shortform: true } },
        },
        {
          type: "CREATE_COMMENT" as const,
          actor: "alice",
          params: {
            commentId: "c1",
            postId: "p1",
            parentCommentId: null,
            contents: "Original",
            akismetWouldFlagAsSpam: false,
            postedAt: new Date(),
          },
        },
      ];
      const state = deriveState(actions);
      const result = createComment("bob", state, {
        commentId: "c2",
        postId: "p1",
        parentCommentId: "c1", // Reply, not top-level
        contents: "Reply",
        akismetWouldFlagAsSpam: false,
        postedAt: new Date(),
      });
      expect(result.ok).toBe(true);
    });

    it("P1: cannot comment on post with commentsLocked", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "bob" } },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "UPDATE_POST" as const,
          actor: "god",
          params: { postId: "p1", changes: { commentsLocked: true } },
        },
      ];
      const state = deriveState(actions);
      const result = createComment("bob", state, {
        commentId: "c1",
        postId: "p1",
        parentCommentId: null,
        contents: "Test",
        akismetWouldFlagAsSpam: false,
        postedAt: new Date(),
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("locked");
    });

    it("P1: cannot comment on rejected post", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "bob" } },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "UPDATE_POST" as const,
          actor: "god",
          params: { postId: "p1", changes: { rejected: true } },
        },
      ];
      const state = deriveState(actions);
      const result = createComment("bob", state, {
        commentId: "c1",
        postId: "p1",
        parentCommentId: null,
        contents: "Test",
        akismetWouldFlagAsSpam: false,
        postedAt: new Date(),
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("rejected");
    });

    it("P1: account created after commentsLockedToAccountsCreatedAfter cannot comment", () => {
      const lockDate = new Date("2024-01-01");
      const newUserCreatedAt = new Date("2024-06-01"); // After lock date
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        {
          type: "CREATE_USER" as const,
          actor: "god",
          params: { userId: "newbie", createdAt: newUserCreatedAt },
        },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "UPDATE_POST" as const,
          actor: "god",
          params: {
            postId: "p1",
            changes: { commentsLockedToAccountsCreatedAfter: lockDate },
          },
        },
      ];
      const state = deriveState(actions);
      const result = createComment("newbie", state, {
        commentId: "c1",
        postId: "p1",
        parentCommentId: null,
        contents: "Test",
        akismetWouldFlagAsSpam: false,
        postedAt: new Date(),
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("new accounts");
    });

    it("P2: account created before commentsLockedToAccountsCreatedAfter CAN comment", () => {
      const lockDate = new Date("2024-06-01");
      const oldUserCreatedAt = new Date("2024-01-01"); // Before lock date
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        {
          type: "CREATE_USER" as const,
          actor: "god",
          params: { userId: "oldtimer", createdAt: oldUserCreatedAt },
        },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "UPDATE_POST" as const,
          actor: "god",
          params: {
            postId: "p1",
            changes: { commentsLockedToAccountsCreatedAfter: lockDate },
          },
        },
      ];
      const state = deriveState(actions);
      const result = createComment("oldtimer", state, {
        commentId: "c1",
        postId: "p1",
        parentCommentId: null,
        contents: "Test",
        akismetWouldFlagAsSpam: false,
        postedAt: new Date(),
      });
      expect(result.ok).toBe(true);
    });

    it("P1: user in post.bannedUserIds cannot comment", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        {
          type: "CREATE_USER" as const,
          actor: "god",
          params: { userId: "banned-bob" },
        },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "UPDATE_POST" as const,
          actor: "god",
          params: { postId: "p1", changes: { bannedUserIds: ["banned-bob"] } },
        },
      ];
      const state = deriveState(actions);
      const result = createComment("banned-bob", state, {
        commentId: "c1",
        postId: "p1",
        parentCommentId: null,
        contents: "Test",
        akismetWouldFlagAsSpam: false,
        postedAt: new Date(),
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("banned");
    });

    it("P1: user in author.bannedUserIds cannot comment when author has canModerateOwnPost", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        {
          type: "UPDATE_USER" as const,
          actor: "god",
          params: {
            userId: "alice",
            changes: { canModerateOwnPost: true, bannedUserIds: ["banned-bob"] },
          },
        },
        {
          type: "CREATE_USER" as const,
          actor: "god",
          params: { userId: "banned-bob" },
        },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
      ];
      const state = deriveState(actions);
      const result = createComment("banned-bob", state, {
        commentId: "c1",
        postId: "p1",
        parentCommentId: null,
        contents: "Test",
        akismetWouldFlagAsSpam: false,
        postedAt: new Date(),
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("banned");
    });

    it("P2: user in author.bannedUserIds CAN comment when author does NOT have canModerateOwnPost", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        {
          type: "UPDATE_USER" as const,
          actor: "god",
          params: { userId: "alice", changes: { bannedUserIds: ["banned-bob"] } }, // No canModerateOwnPost
        },
        {
          type: "CREATE_USER" as const,
          actor: "god",
          params: { userId: "banned-bob" },
        },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
      ];
      const state = deriveState(actions);
      const result = createComment("banned-bob", state, {
        commentId: "c1",
        postId: "p1",
        parentCommentId: null,
        contents: "Test",
        akismetWouldFlagAsSpam: false,
        postedAt: new Date(),
      });
      expect(result.ok).toBe(true); // Ban not enforced without permission
    });

    it("P1: user in author.bannedPersonalUserIds cannot comment on personal (non-frontpage) post", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        {
          type: "UPDATE_USER" as const,
          actor: "god",
          params: {
            userId: "alice",
            changes: {
              canModerateOwnPersonalPost: true,
              bannedPersonalUserIds: ["banned-bob"],
            },
          },
        },
        {
          type: "CREATE_USER" as const,
          actor: "god",
          params: { userId: "banned-bob" },
        },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        // Post is NOT on frontpage (frontpageDate: null is default)
      ];
      const state = deriveState(actions);
      const result = createComment("banned-bob", state, {
        commentId: "c1",
        postId: "p1",
        parentCommentId: null,
        contents: "Test",
        akismetWouldFlagAsSpam: false,
        postedAt: new Date(),
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("personal posts");
    });

    it("P2: user in author.bannedPersonalUserIds CAN comment on frontpage post", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        {
          type: "UPDATE_USER" as const,
          actor: "god",
          params: {
            userId: "alice",
            changes: {
              canModerateOwnPersonalPost: true,
              bannedPersonalUserIds: ["banned-bob"],
            },
          },
        },
        {
          type: "CREATE_USER" as const,
          actor: "god",
          params: { userId: "banned-bob" },
        },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "UPDATE_POST" as const,
          actor: "god",
          params: { postId: "p1", changes: { frontpageDate: new Date() } }, // Post IS on frontpage
        },
      ];
      const state = deriveState(actions);
      const result = createComment("banned-bob", state, {
        commentId: "c1",
        postId: "p1",
        parentCommentId: null,
        contents: "Test",
        akismetWouldFlagAsSpam: false,
        postedAt: new Date(),
      });
      expect(result.ok).toBe(true); // Frontpage exempts from personal ban
    });

    it("P3: fails if parentCommentId refers to non-existent comment", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
      ];
      const state = deriveState(actions);
      const result = createComment("alice", state, {
        commentId: "c1",
        postId: "p1",
        parentCommentId: "nonexistent",
        contents: "Test",
        akismetWouldFlagAsSpam: false,
        postedAt: new Date(),
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("Parent comment");
    });

    // ==========================================================================
    // Existing tests (P3 - validation and defaults)
    // ==========================================================================

    it("P3: adds a comment with defaults", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
      ];
      const state = deriveState(actions);
      const result = createComment("alice", state, {
        commentId: "c1",
        postId: "p1",
        parentCommentId: null,
        contents: "Test comment",
        akismetWouldFlagAsSpam: false,
        postedAt: new Date(),
      });
      expect(result.ok).toBe(true);
      const comment = result.state.comments.get("c1");
      expect(comment).toBeDefined();
      expect(comment?.authorId).toBe("alice");
      expect(comment?.postId).toBe("p1");
      expect(comment?.draft).toBe(false);
    });

    it("P3: fails if author not found", () => {
      const state = initialState();
      const result = createComment("nonexistent", state, {
        commentId: "c1",
        postId: "p1",
        parentCommentId: null,
        contents: "Test",
        akismetWouldFlagAsSpam: false,
        postedAt: new Date(),
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("Author");
    });

    it("P3: fails if post not found", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
      ];
      const state = deriveState(actions);
      const result = createComment("alice", state, {
        commentId: "c1",
        postId: "nonexistent",
        parentCommentId: null,
        contents: "Test",
        akismetWouldFlagAsSpam: false,
        postedAt: new Date(),
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("Post");
    });

    it("P3: fails if comment already exists", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "CREATE_COMMENT" as const,
          actor: "alice",
          params: {
            commentId: "c1",
            postId: "p1",
            parentCommentId: null,
            contents: "Test comment",
            akismetWouldFlagAsSpam: false,
            postedAt: new Date(),
          },
        },
      ];
      const state = deriveState(actions);
      const result = createComment("alice", state, {
        commentId: "c1",
        postId: "p1",
        parentCommentId: null,
        contents: "Test comment",
        akismetWouldFlagAsSpam: false,
        postedAt: new Date(),
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("already exists");
    });

    it("P3: marks comment as spam when akismetWouldFlagAsSpam=true for unreviewed user with low karma", () => {
      const actions = [
        {
          type: "CREATE_USER" as const,
          actor: "god",
          params: { userId: "spammer" },
        },
        { type: "CREATE_POST" as const, actor: "spammer", params: { postId: "p1" } },
      ];
      const state = deriveState(actions);
      const result = createComment("spammer", state, {
        commentId: "c1",
        postId: "p1",
        parentCommentId: null,
        contents: "Buy now!",
        akismetWouldFlagAsSpam: true,
        postedAt: new Date(),
      });
      expect(result.ok).toBe(true);
      expect(result.state.comments.get("c1")?.spam).toBe(true);
    });

    it("P3: does NOT mark comment as spam when user karma >= SPAM_KARMA_THRESHOLD even with akismetWouldFlagAsSpam", () => {
      const actions = [
        {
          type: "CREATE_USER" as const,
          actor: "god",
          params: { userId: "highkarma" },
        },
        {
          type: "UPDATE_USER" as const,
          actor: "god",
          params: { userId: "highkarma", changes: { karma: SPAM_KARMA_THRESHOLD } },
        },
        {
          type: "CREATE_POST" as const,
          actor: "highkarma",
          params: { postId: "p1" },
        },
      ];
      const state = deriveState(actions);
      const result = createComment("highkarma", state, {
        commentId: "c1",
        postId: "p1",
        parentCommentId: null,
        contents: "Content",
        akismetWouldFlagAsSpam: true,
        postedAt: new Date(),
      });
      expect(result.ok).toBe(true);
      // User has karma >= 10, so spam detection doesn't apply
      expect(result.state.comments.get("c1")?.spam).toBe(false);
    });

    it("P3: does NOT mark comment as spam when user is reviewed even with akismetWouldFlagAsSpam", () => {
      const actions = [
        {
          type: "CREATE_USER" as const,
          actor: "god",
          params: { userId: "reviewed" },
        },
        {
          type: "UPDATE_USER" as const,
          actor: "god",
          params: { userId: "reviewed", changes: { reviewedByUserId: "mod1" } },
        },
        {
          type: "CREATE_POST" as const,
          actor: "reviewed",
          params: { postId: "p1" },
        },
      ];
      const state = deriveState(actions);
      // User has karma=0 but is reviewed
      expect(state.users.get("reviewed")?.karma).toBe(0);
      expect(state.users.get("reviewed")?.reviewedByUserId).toBe("mod1");

      const result = createComment("reviewed", state, {
        commentId: "c1",
        postId: "p1",
        parentCommentId: null,
        contents: "Content",
        akismetWouldFlagAsSpam: true,
        postedAt: new Date(),
      });
      expect(result.ok).toBe(true);
      // Reviewed users skip Akismet entirely
      expect(result.state.comments.get("c1")?.spam).toBe(false);
    });

    it("P3: does NOT mark comment as spam when akismetWouldFlagAsSpam=false", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "newbie" } },
        { type: "CREATE_POST" as const, actor: "newbie", params: { postId: "p1" } },
      ];
      const state = deriveState(actions);
      const result = createComment("newbie", state, {
        commentId: "c1",
        postId: "p1",
        parentCommentId: null,
        contents: "Content",
        akismetWouldFlagAsSpam: false,
        postedAt: new Date(),
      });
      expect(result.ok).toBe(true);
      expect(result.state.comments.get("c1")?.spam).toBe(false);
    });
  });

  describe("[UNSTABLE] updateComment", () => {
    it("P3: updates a comment", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "CREATE_COMMENT" as const,
          actor: "alice",
          params: {
            commentId: "c1",
            postId: "p1",
            parentCommentId: null,
            contents: "Test comment",
            akismetWouldFlagAsSpam: false,
            postedAt: new Date(),
          },
        },
      ];
      const state = deriveState(actions);
      const result = updateComment("god", state, {
        commentId: "c1",
        changes: { draft: true },
      });
      expect(result.ok).toBe(true);
    });

    it("P3: fails if comment not found", () => {
      const state = initialState();
      const result = updateComment("god", state, {
        commentId: "nonexistent",
        changes: { draft: true },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("not found");
    });

    it("P3: fails with empty changes", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "CREATE_COMMENT" as const,
          actor: "alice",
          params: {
            commentId: "c1",
            postId: "p1",
            parentCommentId: null,
            contents: "Test comment",
            akismetWouldFlagAsSpam: false,
            postedAt: new Date(),
          },
        },
      ];
      const state = deriveState(actions);
      const result = updateComment("god", state, { commentId: "c1", changes: {} });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("No changes");
    });
  });

  describe("[UNSTABLE] parseAction", () => {
    it("P3: parses valid CREATE_USER action", () => {
      const result = parseAction("CREATE_USER", "god", { userId: "alice" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.action.type).toBe("CREATE_USER");
        expect(result.action.actor).toBe("god");
        expect(result.action.params).toEqual({ userId: "alice" });
      }
    });

    it("P3: converts lowercase action type", () => {
      const result = parseAction("create_user", "god", { userId: "alice" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.action.type).toBe("CREATE_USER");
      }
    });

    it("P3: returns error for unknown action type", () => {
      const result = parseAction("BOGUS_ACTION", "god", {});
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Unknown action type");
      }
    });

    it("P3: returns error for missing required params", () => {
      const result = parseAction("CREATE_USER", "god", {});
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("userId");
      }
    });

    it("P3: returns error for extra params (strict mode)", () => {
      const result = parseAction("CREATE_USER", "god", {
        userId: "alice",
        extraField: "bad",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("extraField");
      }
    });
  });
});
