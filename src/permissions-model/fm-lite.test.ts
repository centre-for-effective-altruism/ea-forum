import { describe, it, expect } from "vitest";
import {
  createWorld,
  currentState,
  execute,
  createUser,
  editUser,
  createPost,
  editPost,
  viewPost,
  reviewUser,
  createComment,
  editComment,
  viewComment,
  undo,
  redo,
  initialState,
  deriveState,
  PostStatus,
  MINIMUM_APPROVAL_KARMA,
  SPAM_KARMA_THRESHOLD,
} from "./fm-lite";

describe("fm-lite", () => {
  describe("viewPost", () => {
    const setupState = () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
        // Make alice reviewed so her posts aren't flagged as authorIsUnreviewed
        {
          type: "USER_UPDATED" as const,
          userId: "alice",
          changes: { reviewedByUserId: "mod" },
          timestamp: new Date(),
        },
        { type: "USER_CREATED" as const, userId: "bob", timestamp: new Date() },
        // Make bob reviewed too
        {
          type: "USER_UPDATED" as const,
          userId: "bob",
          changes: { reviewedByUserId: "mod" },
          timestamp: new Date(),
        },
        { type: "USER_CREATED" as const, userId: "admin", timestamp: new Date() },
        {
          type: "USER_UPDATED" as const,
          userId: "admin",
          changes: { isAdmin: true },
          timestamp: new Date(),
        },
        { type: "USER_CREATED" as const, userId: "mod", timestamp: new Date() },
        {
          type: "USER_UPDATED" as const,
          userId: "mod",
          changes: { isMod: true },
          timestamp: new Date(),
        },
        // Create an unreviewed user for the "unreviewed" post test
        { type: "USER_CREATED" as const, userId: "newbie", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "draft",
          authorId: "alice",
          timestamp: new Date(),
        },
        {
          type: "POST_CREATED" as const,
          postId: "public",
          authorId: "alice",
          timestamp: new Date(),
        },
        {
          type: "POST_UPDATED" as const,
          postId: "public",
          changes: { draft: false, status: PostStatus.APPROVED },
          timestamp: new Date(),
        },
        // Note: No test for STATUS_PENDING - it's unused in ForumMagnum (0 examples in production)
        // Unreviewed post created by unreviewed user
        {
          type: "POST_CREATED" as const,
          postId: "unreviewed",
          authorId: "newbie",
          timestamp: new Date(),
        },
        {
          type: "POST_UPDATED" as const,
          postId: "unreviewed",
          changes: { draft: false, status: PostStatus.APPROVED },
          timestamp: new Date(),
        },
        {
          type: "POST_CREATED" as const,
          postId: "loggedInOnly",
          authorId: "alice",
          timestamp: new Date(),
        },
        {
          type: "POST_UPDATED" as const,
          postId: "loggedInOnly",
          changes: {
            draft: false,
            status: PostStatus.APPROVED,
            onlyVisibleToLoggedIn: true,
          },
          timestamp: new Date(),
        },
      ];
      return deriveState(events);
    };

    it("P1: non-author cannot see draft", () => {
      const state = setupState();
      const result = viewPost("bob", "draft", state);
      expect(result.canView).toBe(false);
      expect(result.reason).toContain("draft");
    });

    it("P1: logged-out cannot see draft", () => {
      const state = setupState();
      const result = viewPost(null, "draft", state);
      expect(result.canView).toBe(false);
    });

    it("P1: non-author cannot see authorIsUnreviewed post", () => {
      const state = setupState();
      const result = viewPost("bob", "unreviewed", state);
      expect(result.canView).toBe(false);
      expect(result.reason).toContain("unreviewed");
    });

    it("P1: user banned from post cannot view it", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
        // Make alice reviewed so post is viewable
        {
          type: "USER_UPDATED" as const,
          userId: "alice",
          changes: { reviewedByUserId: "mod" },
          timestamp: new Date(),
        },
        {
          type: "USER_CREATED" as const,
          userId: "banned-bob",
          timestamp: new Date(),
        },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "alice",
          timestamp: new Date(),
        },
        {
          type: "POST_UPDATED" as const,
          postId: "p1",
          changes: {
            draft: false,
            status: PostStatus.APPROVED,
            bannedUserIds: ["banned-bob"],
          },
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      expect(viewPost("banned-bob", "p1", state).canView).toBe(false);
      expect(viewPost("banned-bob", "p1", state).reason).toContain("banned");
      // Other users can still see it
      expect(viewPost("alice", "p1", state).canView).toBe(true);
      expect(viewPost(null, "p1", state).canView).toBe(true);
    });

    it("P1: cannot view rejected post", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
        { type: "USER_CREATED" as const, userId: "bob", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "alice",
          timestamp: new Date(),
        },
        {
          type: "POST_UPDATED" as const,
          postId: "p1",
          changes: { draft: false, rejected: true },
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      const result = viewPost("bob", "p1", state);
      expect(result.canView).toBe(false);
      expect(result.reason).toContain("rejected");
    });

    it("P1: cannot view post with non-approved status", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
        { type: "USER_CREATED" as const, userId: "bob", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "alice",
          timestamp: new Date(),
        },
        {
          type: "POST_UPDATED" as const,
          postId: "p1",
          changes: { draft: false, status: PostStatus.SPAM },
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      const result = viewPost("bob", "p1", state);
      expect(result.canView).toBe(false);
      expect(result.reason).toContain("not approved");
    });

    it("P2: author can see their own draft", () => {
      const state = setupState();
      const result = viewPost("alice", "draft", state);
      expect(result.canView).toBe(true);
    });

    it("P2: admin can see draft", () => {
      const state = setupState();
      const result = viewPost("admin", "draft", state);
      expect(result.canView).toBe(true);
    });

    it("P2: mod can see draft", () => {
      const state = setupState();
      const result = viewPost("mod", "draft", state);
      expect(result.canView).toBe(true);
    });

    it("P2: anyone can see public post", () => {
      const state = setupState();
      expect(viewPost(null, "public", state).canView).toBe(true);
      expect(viewPost("bob", "public", state).canView).toBe(true);
    });

    it("P2: author can see their own authorIsUnreviewed post", () => {
      const state = setupState();
      expect(viewPost("newbie", "unreviewed", state).canView).toBe(true);
    });

    it("P2: logged-out cannot see onlyVisibleToLoggedIn post", () => {
      const state = setupState();
      const result = viewPost(null, "loggedInOnly", state);
      expect(result.canView).toBe(false);
      expect(result.reason).toContain("logged-in");
    });

    it("P2: logged-in user can see onlyVisibleToLoggedIn post", () => {
      const state = setupState();
      expect(viewPost("bob", "loggedInOnly", state).canView).toBe(true);
    });

    it("P2: anyone can see unlisted post (via direct link)", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
        // Make alice reviewed so post is viewable
        {
          type: "USER_UPDATED" as const,
          userId: "alice",
          changes: { reviewedByUserId: "mod" },
          timestamp: new Date(),
        },
        { type: "USER_CREATED" as const, userId: "bob", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "unlisted",
          authorId: "alice",
          timestamp: new Date(),
        },
        {
          type: "POST_UPDATED" as const,
          postId: "unlisted",
          changes: { draft: false, status: PostStatus.APPROVED, unlisted: true },
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      expect(viewPost(null, "unlisted", state).canView).toBe(true);
      expect(viewPost("bob", "unlisted", state).canView).toBe(true);
    });

    it("P2: cannot view deleted draft", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
        { type: "USER_CREATED" as const, userId: "bob", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "alice",
          timestamp: new Date(),
        },
        {
          type: "POST_UPDATED" as const,
          postId: "p1",
          changes: { draft: false, deletedDraft: true },
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      const result = viewPost("bob", "p1", state);
      expect(result.canView).toBe(false);
      expect(result.reason).toContain("deleted draft");
    });

    it("P2: cannot view future post", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
        { type: "USER_CREATED" as const, userId: "bob", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "alice",
          timestamp: new Date(),
        },
        {
          type: "POST_UPDATED" as const,
          postId: "p1",
          changes: { draft: false, isFuture: true },
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      const result = viewPost("bob", "p1", state);
      expect(result.canView).toBe(false);
      expect(result.reason).toContain("future");
    });

    it("P3: returns not found for nonexistent post", () => {
      const state = initialState();
      const result = viewPost(null, "nonexistent", state);
      expect(result.canView).toBe(false);
      expect(result.reason).toContain("not found");
    });
  });

  describe("viewComment", () => {
    it("[P1] non-author cannot see draft comment", () => {
      const actions = [
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "alice" } },
        { type: "CREATE_USER" as const, actor: "god", params: { userId: "bob" } },
        { type: "CREATE_POST" as const, actor: "alice", params: { postId: "p1" } },
        {
          type: "CREATE_COMMENT" as const,
          actor: "alice",
          params: {
            commentId: "c1",
            authorId: "alice",
            postId: "p1",
            contents: "Test comment",
            akismetWouldFlagAsSpam: false,
            postedAt: new Date(),
          },
        },
        { type: "UPDATE_COMMENT" as const, actor: "god", params: { commentId: "c1", changes: { draft: true } } },
      ];
      const state = deriveState(actions);
      const result = viewComment("bob", state, { commentId: "c1" });
      expect(result.canView).toBe(false);
      expect(result.reason).toContain("draft");
    });

    it("P1: logged-out cannot see draft comment", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "alice",
          timestamp: new Date(),
        },
        {
          type: "COMMENT_CREATED" as const,
          commentId: "c1",
          authorId: "alice",
          postId: "p1",
          contents: "Test comment",
          akismetWouldFlagAsSpam: false,
          postedAt: new Date(),
          timestamp: new Date(),
        },
        {
          type: "COMMENT_UPDATED" as const,
          commentId: "c1",
          changes: { draft: true },
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      const result = viewComment(null, "c1", state);
      expect(result.canView).toBe(false);
    });

    it("P1: non-author cannot see rejected comment", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
        { type: "USER_CREATED" as const, userId: "bob", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "alice",
          timestamp: new Date(),
        },
        {
          type: "COMMENT_CREATED" as const,
          commentId: "c1",
          authorId: "alice",
          postId: "p1",
          contents: "Test comment",
          akismetWouldFlagAsSpam: false,
          postedAt: new Date(),
          timestamp: new Date(),
        },
        {
          type: "COMMENT_UPDATED" as const,
          commentId: "c1",
          changes: { rejected: true },
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      const result = viewComment("bob", "c1", state);
      expect(result.canView).toBe(false);
      expect(result.reason).toContain("rejected");
    });

    it("P1: non-author cannot see deleted comment (deletedPublic=false)", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
        { type: "USER_CREATED" as const, userId: "bob", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "alice",
          timestamp: new Date(),
        },
        {
          type: "COMMENT_CREATED" as const,
          commentId: "c1",
          authorId: "alice",
          postId: "p1",
          contents: "Test comment",
          akismetWouldFlagAsSpam: false,
          postedAt: new Date(),
          timestamp: new Date(),
        },
        {
          type: "COMMENT_UPDATED" as const,
          commentId: "c1",
          changes: { deleted: true, deletedPublic: false },
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      const result = viewComment("bob", "c1", state);
      expect(result.canView).toBe(false);
      expect(result.reason).toContain("deleted");
    });

    it("P1: deletedPublic comment: can see comment and metadata but not contents", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
        { type: "USER_CREATED" as const, userId: "bob", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "alice",
          timestamp: new Date(),
        },
        {
          type: "COMMENT_CREATED" as const,
          commentId: "c1",
          authorId: "alice",
          postId: "p1",
          contents: "Secret content that should be hidden",
          akismetWouldFlagAsSpam: false,
          postedAt: new Date(),
          timestamp: new Date(),
        },
        {
          type: "COMMENT_UPDATED" as const,
          commentId: "c1",
          changes: { deleted: true, deletedPublic: true },
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      const result = viewComment("bob", "c1", state);
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
      const events = [
        { type: "USER_CREATED" as const, userId: "spammer", timestamp: new Date() },
        { type: "USER_CREATED" as const, userId: "bob", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "spammer",
          timestamp: new Date(),
        },
        {
          type: "COMMENT_CREATED" as const,
          commentId: "c1",
          authorId: "spammer",
          postId: "p1",
          contents: "Buy cheap products now!",
          akismetWouldFlagAsSpam: true,
          postedAt: new Date(),
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      // Verify the comment has both spam=true AND deleted=true
      const comment = state.comments.get("c1");
      expect(comment?.spam).toBe(true);
      expect(comment?.deleted).toBe(true);
      // Regular users cannot see deleted comments
      const result = viewComment("bob", "c1", state);
      expect(result.canView).toBe(false);
      expect(result.reason).toContain("deleted");
    });

    it("P1: unreviewed author comment hidden when postedAt >= hideUnreviewedAuthorComments date", () => {
      const hideUnreviewedAuthorCommentsDate = new Date("2024-01-01");
      const commentDate = new Date("2024-06-01"); // After the setting date
      const events = [
        { type: "USER_CREATED" as const, userId: "newbie", timestamp: new Date() },
        { type: "USER_CREATED" as const, userId: "bob", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "newbie",
          timestamp: new Date(),
        },
        {
          type: "COMMENT_CREATED" as const,
          commentId: "c1",
          authorId: "newbie",
          postId: "p1",
          contents: "Test comment",
          akismetWouldFlagAsSpam: false,
          postedAt: commentDate,
          timestamp: commentDate,
        },
      ];
      const state = deriveState(events);
      const result = viewComment("bob", "c1", state, {
        hideUnreviewedAuthorComments: hideUnreviewedAuthorCommentsDate,
      });
      expect(result.canView).toBe(false);
      expect(result.reason).toContain("unreviewed");
    });

    it("P2: author can see their own draft comment", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "alice",
          timestamp: new Date(),
        },
        {
          type: "COMMENT_CREATED" as const,
          commentId: "c1",
          authorId: "alice",
          postId: "p1",
          contents: "Test comment",
          akismetWouldFlagAsSpam: false,
          postedAt: new Date(),
          timestamp: new Date(),
        },
        {
          type: "COMMENT_UPDATED" as const,
          commentId: "c1",
          changes: { draft: true },
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      const result = viewComment("alice", "c1", state);
      expect(result.canView).toBe(true);
    });

    it("P2: admin can see draft comment", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
        { type: "USER_CREATED" as const, userId: "admin", timestamp: new Date() },
        {
          type: "USER_UPDATED" as const,
          userId: "admin",
          changes: { isAdmin: true },
          timestamp: new Date(),
        },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "alice",
          timestamp: new Date(),
        },
        {
          type: "COMMENT_CREATED" as const,
          commentId: "c1",
          authorId: "alice",
          postId: "p1",
          contents: "Test comment",
          akismetWouldFlagAsSpam: false,
          postedAt: new Date(),
          timestamp: new Date(),
        },
        {
          type: "COMMENT_UPDATED" as const,
          commentId: "c1",
          changes: { draft: true },
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      const result = viewComment("admin", "c1", state);
      expect(result.canView).toBe(true);
    });

    it("P2: mod can see draft comment", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
        { type: "USER_CREATED" as const, userId: "mod", timestamp: new Date() },
        {
          type: "USER_UPDATED" as const,
          userId: "mod",
          changes: { isMod: true },
          timestamp: new Date(),
        },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "alice",
          timestamp: new Date(),
        },
        {
          type: "COMMENT_CREATED" as const,
          commentId: "c1",
          authorId: "alice",
          postId: "p1",
          contents: "Test comment",
          akismetWouldFlagAsSpam: false,
          postedAt: new Date(),
          timestamp: new Date(),
        },
        {
          type: "COMMENT_UPDATED" as const,
          commentId: "c1",
          changes: { draft: true },
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      const result = viewComment("mod", "c1", state);
      expect(result.canView).toBe(true);
    });

    it("P2: anyone can see non-draft comment", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
        { type: "USER_CREATED" as const, userId: "bob", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "alice",
          timestamp: new Date(),
        },
        {
          type: "COMMENT_CREATED" as const,
          commentId: "c1",
          authorId: "alice",
          postId: "p1",
          contents: "Test comment",
          akismetWouldFlagAsSpam: false,
          postedAt: new Date(),
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      // Comment is non-draft by default
      expect(viewComment(null, "c1", state).canView).toBe(true);
      expect(viewComment("bob", "c1", state).canView).toBe(true);
    });

    it("P2: author can see their own rejected comment: can read contents and see rejected flag", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "alice",
          timestamp: new Date(),
        },
        {
          type: "COMMENT_CREATED" as const,
          commentId: "c1",
          authorId: "alice",
          postId: "p1",
          contents: "Test comment",
          akismetWouldFlagAsSpam: false,
          postedAt: new Date(),
          timestamp: new Date(),
        },
        {
          type: "COMMENT_UPDATED" as const,
          commentId: "c1",
          changes: { rejected: true },
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      const result = viewComment("alice", "c1", state);
      expect(result.canView).toBe(true);
      expect(result.canReadContents).toBe(true);
      expect(result.comment?.rejected).toBe(true);
    });

    it("P2: admin can see rejected comment", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
        { type: "USER_CREATED" as const, userId: "admin", timestamp: new Date() },
        {
          type: "USER_UPDATED" as const,
          userId: "admin",
          changes: { isAdmin: true },
          timestamp: new Date(),
        },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "alice",
          timestamp: new Date(),
        },
        {
          type: "COMMENT_CREATED" as const,
          commentId: "c1",
          authorId: "alice",
          postId: "p1",
          contents: "Test comment",
          akismetWouldFlagAsSpam: false,
          postedAt: new Date(),
          timestamp: new Date(),
        },
        {
          type: "COMMENT_UPDATED" as const,
          commentId: "c1",
          changes: { rejected: true },
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      const result = viewComment("admin", "c1", state);
      expect(result.canView).toBe(true);
    });

    it("P2: author can see their own deleted comment AND read contents", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "alice",
          timestamp: new Date(),
        },
        {
          type: "COMMENT_CREATED" as const,
          commentId: "c1",
          authorId: "alice",
          postId: "p1",
          contents: "My deleted comment",
          akismetWouldFlagAsSpam: false,
          postedAt: new Date(),
          timestamp: new Date(),
        },
        {
          type: "COMMENT_UPDATED" as const,
          commentId: "c1",
          changes: { deleted: true, deletedPublic: false },
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      const result = viewComment("alice", "c1", state);
      expect(result.canView).toBe(true);
      // Author CAN read contents even when deleted
      expect(result.canReadContents).toBe(true);
    });

    it("P2: admin can see deleted comment AND read contents", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
        { type: "USER_CREATED" as const, userId: "admin", timestamp: new Date() },
        {
          type: "USER_UPDATED" as const,
          userId: "admin",
          changes: { isAdmin: true },
          timestamp: new Date(),
        },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "alice",
          timestamp: new Date(),
        },
        {
          type: "COMMENT_CREATED" as const,
          commentId: "c1",
          authorId: "alice",
          postId: "p1",
          contents: "Deleted content",
          akismetWouldFlagAsSpam: false,
          postedAt: new Date(),
          timestamp: new Date(),
        },
        {
          type: "COMMENT_UPDATED" as const,
          commentId: "c1",
          changes: { deleted: true, deletedPublic: false },
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      const result = viewComment("admin", "c1", state);
      expect(result.canView).toBe(true);
      // Admin CAN read contents even when deleted
      expect(result.canReadContents).toBe(true);
    });

    it("P2: author can see their own spam (deleted) comment AND read contents", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "spammer", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "spammer",
          timestamp: new Date(),
        },
        {
          type: "COMMENT_CREATED" as const,
          commentId: "c1",
          authorId: "spammer",
          postId: "p1",
          contents: "My spam comment",
          akismetWouldFlagAsSpam: true,
          postedAt: new Date(),
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      // Verify it's both spam and deleted
      expect(state.comments.get("c1")?.spam).toBe(true);
      expect(state.comments.get("c1")?.deleted).toBe(true);
      const result = viewComment("spammer", "c1", state);
      expect(result.canView).toBe(true);
      // Author CAN read contents even when deleted (spam)
      expect(result.canReadContents).toBe(true);
    });

    it("P2: admin can see spam (deleted) comment AND read contents", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "spammer", timestamp: new Date() },
        { type: "USER_CREATED" as const, userId: "admin", timestamp: new Date() },
        {
          type: "USER_UPDATED" as const,
          userId: "admin",
          changes: { isAdmin: true },
          timestamp: new Date(),
        },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "spammer",
          timestamp: new Date(),
        },
        {
          type: "COMMENT_CREATED" as const,
          commentId: "c1",
          authorId: "spammer",
          postId: "p1",
          contents: "Spam content",
          akismetWouldFlagAsSpam: true,
          postedAt: new Date(),
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      // Verify it's both spam and deleted
      expect(state.comments.get("c1")?.spam).toBe(true);
      expect(state.comments.get("c1")?.deleted).toBe(true);
      const result = viewComment("admin", "c1", state);
      expect(result.canView).toBe(true);
      // Admin CAN read contents even when deleted (spam)
      expect(result.canReadContents).toBe(true);
    });

    it("P2: normal comment: can read contents", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
        { type: "USER_CREATED" as const, userId: "bob", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "alice",
          timestamp: new Date(),
        },
        {
          type: "COMMENT_CREATED" as const,
          commentId: "c1",
          authorId: "alice",
          postId: "p1",
          contents: "Test comment",
          akismetWouldFlagAsSpam: false,
          postedAt: new Date(),
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      const result = viewComment("bob", "c1", state);
      expect(result.canView).toBe(true);
      expect(result.canReadContents).toBe(true);
    });

    it("P2: unreviewed author comment visible when postedAt < hideUnreviewedAuthorComments date (grandfather clause)", () => {
      const hideUnreviewedAuthorCommentsDate = new Date("2024-06-01");
      const commentDate = new Date("2024-01-01"); // Before the setting date - grandfathered in
      const events = [
        { type: "USER_CREATED" as const, userId: "newbie", timestamp: new Date() },
        { type: "USER_CREATED" as const, userId: "bob", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "newbie",
          timestamp: new Date(),
        },
        {
          type: "COMMENT_CREATED" as const,
          commentId: "c1",
          authorId: "newbie",
          postId: "p1",
          contents: "Test comment",
          akismetWouldFlagAsSpam: false,
          postedAt: commentDate,
          timestamp: commentDate,
        },
      ];
      const state = deriveState(events);
      const result = viewComment("bob", "c1", state, {
        hideUnreviewedAuthorComments: hideUnreviewedAuthorCommentsDate,
      });
      expect(result.canView).toBe(true);
    });

    it("P2: author can see their own unreviewed comment even after hideUnreviewedAuthorComments date", () => {
      const hideUnreviewedAuthorCommentsDate = new Date("2024-01-01");
      const commentDate = new Date("2024-06-01");
      const events = [
        { type: "USER_CREATED" as const, userId: "newbie", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "newbie",
          timestamp: new Date(),
        },
        {
          type: "COMMENT_CREATED" as const,
          commentId: "c1",
          authorId: "newbie",
          postId: "p1",
          contents: "Test comment",
          akismetWouldFlagAsSpam: false,
          postedAt: commentDate,
          timestamp: commentDate,
        },
      ];
      const state = deriveState(events);
      const result = viewComment("newbie", "c1", state, {
        hideUnreviewedAuthorComments: hideUnreviewedAuthorCommentsDate,
      });
      expect(result.canView).toBe(true);
    });

    it("P2: admin can see unreviewed author comment even after hideUnreviewedAuthorComments date", () => {
      const hideUnreviewedAuthorCommentsDate = new Date("2024-01-01");
      const commentDate = new Date("2024-06-01");
      const events = [
        { type: "USER_CREATED" as const, userId: "newbie", timestamp: new Date() },
        { type: "USER_CREATED" as const, userId: "admin", timestamp: new Date() },
        {
          type: "USER_UPDATED" as const,
          userId: "admin",
          changes: { isAdmin: true },
          timestamp: new Date(),
        },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "newbie",
          timestamp: new Date(),
        },
        {
          type: "COMMENT_CREATED" as const,
          commentId: "c1",
          authorId: "newbie",
          postId: "p1",
          contents: "Test comment",
          akismetWouldFlagAsSpam: false,
          postedAt: commentDate,
          timestamp: commentDate,
        },
      ];
      const state = deriveState(events);
      const result = viewComment("admin", "c1", state, {
        hideUnreviewedAuthorComments: hideUnreviewedAuthorCommentsDate,
      });
      expect(result.canView).toBe(true);
    });

    it("P2: unreviewed comment visible when hideUnreviewedAuthorComments option is not set", () => {
      const commentDate = new Date("2024-06-01");
      const events = [
        { type: "USER_CREATED" as const, userId: "newbie", timestamp: new Date() },
        { type: "USER_CREATED" as const, userId: "bob", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "newbie",
          timestamp: new Date(),
        },
        {
          type: "COMMENT_CREATED" as const,
          commentId: "c1",
          authorId: "newbie",
          postId: "p1",
          contents: "Test comment",
          akismetWouldFlagAsSpam: false,
          postedAt: commentDate,
          timestamp: commentDate,
        },
      ];
      const state = deriveState(events);
      // No hideUnreviewedAuthorComments option - comment should be visible
      const result = viewComment("bob", "c1", state);
      expect(result.canView).toBe(true);
    });

    it("P3: returns not found for nonexistent comment", () => {
      const state = initialState();
      const result = viewComment(null, "nonexistent", state);
      expect(result.canView).toBe(false);
      expect(result.reason).toContain("not found");
    });
  });

  describe("deriveState", () => {
    it("P3: handles USER_UPDATED for non-existent user gracefully", () => {
      const events = [
        {
          type: "USER_UPDATED" as const,
          userId: "nonexistent",
          changes: { isAdmin: true },
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      // Should not crash, user just doesn't exist
      expect(state.users.has("nonexistent")).toBe(false);
    });

    it("P3: handles POST_UPDATED for non-existent post gracefully", () => {
      const events = [
        {
          type: "POST_UPDATED" as const,
          postId: "nonexistent",
          changes: { draft: false },
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      // Should not crash, post just doesn't exist
      expect(state.posts.has("nonexistent")).toBe(false);
    });

    it("P3: handles COMMENT_UPDATED for non-existent comment gracefully", () => {
      const events = [
        {
          type: "COMMENT_UPDATED" as const,
          commentId: "nonexistent",
          changes: { draft: true },
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      // Should not crash, comment just doesn't exist
      expect(state.comments.has("nonexistent")).toBe(false);
    });

    it("P3: handles COMMENT_CREATED with non-existent author gracefully", () => {
      // This tests the edge case where a COMMENT_CREATED event references
      // an author that doesn't exist in state (malformed event)
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "alice",
          timestamp: new Date(),
        },
        {
          type: "COMMENT_CREATED" as const,
          commentId: "c1",
          authorId: "nonexistent", // Author doesn't exist
          postId: "p1",
          contents: "Test",
          akismetWouldFlagAsSpam: false,
          postedAt: new Date(),
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      // Should not crash, comment is created with defaults for missing author
      expect(state.comments.has("c1")).toBe(true);
      // With no author, defaults to unreviewed (karma=0, not reviewed)
      expect(state.comments.get("c1")?.authorIsUnreviewed).toBe(true);
    });

    it("P3: handles POST_CREATED with non-existent author gracefully", () => {
      // This tests the edge case where a POST_CREATED event references
      // an author that doesn't exist in state (malformed event)
      const events = [
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "nonexistent",
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      // Should not crash, post is created with defaults for missing author
      expect(state.posts.has("p1")).toBe(true);
      // With no author, defaults to unreviewed (karma=0, not reviewed)
      expect(state.posts.get("p1")?.authorIsUnreviewed).toBe(true);
    });
  });

  describe("world", () => {
    it("P3: undo/redo works", () => {
      const world = createWorld();
      execute(world, createUser("alice", currentState(world)));
      execute(world, createUser("bob", currentState(world)));

      expect(currentState(world).users.size).toBe(2);
      undo(world);
      expect(currentState(world).users.size).toBe(1);
      redo(world);
      expect(currentState(world).users.size).toBe(2);
    });

    it("P3: undo returns false when nothing to undo", () => {
      const world = createWorld();
      expect(undo(world)).toBe(false);
    });

    it("P3: redo returns false when nothing to redo", () => {
      const world = createWorld();
      expect(redo(world)).toBe(false);
    });

    it("P3: execute returns false for failed action", () => {
      const world = createWorld();
      const result = execute(world, createUser("", currentState(world))); // empty userId fails
      expect(result).toBe(false);
      expect(currentState(world).users.size).toBe(0);
    });
  });

  describe("[UNSTABLE] createUser", () => {
    it("P3: adds a user with default fields", () => {
      const state = initialState();
      const result = createUser("alice", state);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const newState = deriveState(result.events);
        expect(newState.users.get("alice")).toEqual({
          id: "alice",
          isAdmin: false,
          isMod: false,
          karma: 0,
          reviewedByUserId: null,
        });
      }
    });

    it("P3: fails with empty userId", () => {
      const state = initialState();
      const result = createUser("", state);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("empty");
    });

    it("P3: fails if user already exists", () => {
      const state = deriveState([
        { type: "USER_CREATED", userId: "alice", timestamp: new Date() },
      ]);
      const result = createUser("alice", state);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("already exists");
    });
  });

  describe("[UNSTABLE] editUser", () => {
    it("P3: updates a user", () => {
      const state = deriveState([
        { type: "USER_CREATED", userId: "alice", timestamp: new Date() },
      ]);
      const result = editUser("alice", { isAdmin: true }, state);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.events[0]).toMatchObject({
          type: "USER_UPDATED",
          userId: "alice",
          changes: { isAdmin: true },
        });
      }
    });

    it("P3: fails if user not found", () => {
      const state = initialState();
      const result = editUser("nonexistent", { isAdmin: true }, state);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("not found");
    });

    it("P3: fails with empty changes", () => {
      const state = deriveState([
        { type: "USER_CREATED", userId: "alice", timestamp: new Date() },
      ]);
      const result = editUser("alice", {}, state);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("No changes");
    });
  });

  describe("[UNSTABLE] createPost", () => {
    it("P3: adds a post with defaults", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
      ];
      const state = deriveState(events);
      const result = createPost("p1", "alice", state);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const newState = deriveState([...events, ...result.events]);
        const post = newState.posts.get("p1");
        expect(post).toBeDefined();
        expect(post?.authorId).toBe("alice");
        expect(post?.draft).toBe(true);
        expect(post?.status).toBe(PostStatus.APPROVED); // postGetDefaultStatus() always returns STATUS_APPROVED
      }
    });

    it("P3: sets authorIsUnreviewed=true for new user with karma < MINIMUM_APPROVAL_KARMA", () => {
      let state = initialState();
      const createUserResult = createUser("newbie", state);
      expect(createUserResult.ok).toBe(true);
      if (!createUserResult.ok) return;
      state = deriveState(createUserResult.events);

      // New user has karma=0, reviewedByUserId=null
      const user = state.users.get("newbie");
      expect(user?.karma).toBe(0);
      expect(user?.reviewedByUserId).toBeNull();

      // Post should be created with authorIsUnreviewed=true
      const createPostResult = createPost("p1", "newbie", state);
      expect(createPostResult.ok).toBe(true);
      if (!createPostResult.ok) return;
      state = deriveState([...createUserResult.events, ...createPostResult.events]);
      expect(state.posts.get("p1")?.authorIsUnreviewed).toBe(true);
    });

    it("P3: sets authorIsUnreviewed=false for user with karma >= MINIMUM_APPROVAL_KARMA", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "veteran", timestamp: new Date() },
        {
          type: "USER_UPDATED" as const,
          userId: "veteran",
          changes: { karma: MINIMUM_APPROVAL_KARMA },
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);

      const createPostResult = createPost("p1", "veteran", state);
      expect(createPostResult.ok).toBe(true);
      if (!createPostResult.ok) return;
      const newState = deriveState([...events, ...createPostResult.events]);
      expect(newState.posts.get("p1")?.authorIsUnreviewed).toBe(false);
    });

    it("P3: sets authorIsUnreviewed=false for reviewed user even with low karma", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "reviewed", timestamp: new Date() },
        {
          type: "USER_UPDATED" as const,
          userId: "reviewed",
          changes: { reviewedByUserId: "mod1" },
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);

      // User has karma=0 but is reviewed
      expect(state.users.get("reviewed")?.karma).toBe(0);
      expect(state.users.get("reviewed")?.reviewedByUserId).toBe("mod1");

      const createPostResult = createPost("p1", "reviewed", state);
      expect(createPostResult.ok).toBe(true);
      if (!createPostResult.ok) return;
      const newState = deriveState([...events, ...createPostResult.events]);
      expect(newState.posts.get("p1")?.authorIsUnreviewed).toBe(false);
    });

    it("P3: fails with empty postId", () => {
      const state = initialState();
      const result = createPost("", "alice", state);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("Post ID");
    });

    it("P3: fails with empty authorId", () => {
      const state = initialState();
      const result = createPost("p1", "", state);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("Author ID");
    });

    it("P3: fails if author not found", () => {
      const state = initialState();
      const result = createPost("p1", "nonexistent", state);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("not found");
    });

    it("P3: fails if post already exists", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "alice",
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      const result = createPost("p1", "alice", state);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("already exists");
    });
  });

  describe("[UNSTABLE] editPost", () => {
    it("P3: updates a post", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "alice",
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      const result = editPost(
        "p1",
        { draft: false, status: PostStatus.APPROVED },
        state,
      );
      expect(result.ok).toBe(true);
    });

    it("P3: fails if post not found", () => {
      const state = initialState();
      const result = editPost("nonexistent", { draft: false }, state);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("not found");
    });

    it("P3: fails with empty changes", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "alice",
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      const result = editPost("p1", {}, state);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("No changes");
    });
  });

  describe("[UNSTABLE] reviewUser", () => {
    it("P3: clears authorIsUnreviewed on existing posts", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "newbie", timestamp: new Date() },
        { type: "USER_CREATED" as const, userId: "mod1", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "newbie",
          timestamp: new Date(),
        },
        {
          type: "POST_CREATED" as const,
          postId: "p2",
          authorId: "newbie",
          timestamp: new Date(),
        },
      ];
      let state = deriveState(events);

      // Both posts are authorIsUnreviewed
      expect(state.posts.get("p1")?.authorIsUnreviewed).toBe(true);
      expect(state.posts.get("p2")?.authorIsUnreviewed).toBe(true);

      // Review the user
      const reviewResult = reviewUser("newbie", "mod1", state);
      expect(reviewResult.ok).toBe(true);
      if (!reviewResult.ok) return;

      // Should have 3 events: user update + 2 post updates
      expect(reviewResult.events.length).toBe(3);

      state = deriveState([...events, ...reviewResult.events]);
      expect(state.users.get("newbie")?.reviewedByUserId).toBe("mod1");
      expect(state.posts.get("p1")?.authorIsUnreviewed).toBe(false);
      expect(state.posts.get("p2")?.authorIsUnreviewed).toBe(false);
    });

    it("P3: fails if user not found", () => {
      const state = initialState();
      const result = reviewUser("nonexistent", "mod1", state);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("not found");
    });

    it("P3: fails if user already reviewed", () => {
      const events = [
        {
          type: "USER_CREATED" as const,
          userId: "already-reviewed",
          timestamp: new Date(),
        },
        {
          type: "USER_UPDATED" as const,
          userId: "already-reviewed",
          changes: { reviewedByUserId: "mod1" },
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);

      const result = reviewUser("already-reviewed", "mod2", state);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toContain("already reviewed");
      }
    });

    it("P3: does not update posts that are not authorIsUnreviewed", () => {
      const events = [
        {
          type: "USER_CREATED" as const,
          userId: "highkarma",
          timestamp: new Date(),
        },
        // Give highkarma user enough karma so their posts are NOT authorIsUnreviewed
        {
          type: "USER_UPDATED" as const,
          userId: "highkarma",
          changes: { karma: MINIMUM_APPROVAL_KARMA },
          timestamp: new Date(),
        },
        { type: "USER_CREATED" as const, userId: "mod1", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "highkarma",
          timestamp: new Date(),
        },
        {
          type: "POST_CREATED" as const,
          postId: "p2",
          authorId: "highkarma",
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);

      // Posts are NOT authorIsUnreviewed because author has high karma
      expect(state.posts.get("p1")?.authorIsUnreviewed).toBe(false);
      expect(state.posts.get("p2")?.authorIsUnreviewed).toBe(false);

      const reviewResult = reviewUser("highkarma", "mod1", state);
      expect(reviewResult.ok).toBe(true);
      if (!reviewResult.ok) return;

      // Should have only 1 event: user update (no post updates needed)
      expect(reviewResult.events.length).toBe(1);
    });
  });

  describe("[UNSTABLE] createComment", () => {
    it("P3: adds a comment with defaults", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "alice",
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      const result = createComment("c1", "alice", "p1", "Test comment", state);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const newState = deriveState([...events, ...result.events]);
        const comment = newState.comments.get("c1");
        expect(comment).toBeDefined();
        expect(comment?.authorId).toBe("alice");
        expect(comment?.postId).toBe("p1");
        expect(comment?.draft).toBe(false);
      }
    });

    it("P3: fails with empty commentId", () => {
      const state = initialState();
      const result = createComment("", "alice", "p1", "Test", state);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("Comment ID");
    });

    it("P3: fails with empty authorId", () => {
      const state = initialState();
      const result = createComment("c1", "", "p1", "Test", state);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("Author ID");
    });

    it("P3: fails with empty postId", () => {
      const state = initialState();
      const result = createComment("c1", "alice", "", "Test", state);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("Post ID");
    });

    it("P3: fails if author not found", () => {
      const state = initialState();
      const result = createComment("c1", "nonexistent", "p1", "Test", state);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("Author");
    });

    it("P3: fails if post not found", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
      ];
      const state = deriveState(events);
      const result = createComment("c1", "alice", "nonexistent", "Test", state);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("Post");
    });

    it("P3: fails if comment already exists", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "alice",
          timestamp: new Date(),
        },
        {
          type: "COMMENT_CREATED" as const,
          commentId: "c1",
          authorId: "alice",
          postId: "p1",
          contents: "Test comment",
          akismetWouldFlagAsSpam: false,
          postedAt: new Date(),
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      const result = createComment("c1", "alice", "p1", "Test comment", state);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("already exists");
    });

    it("P3: marks comment as spam when akismetWouldFlagAsSpam=true for unreviewed user with low karma", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "spammer", timestamp: new Date() },
        // New user has karma=0 and no reviewedByUserId
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "spammer",
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      const result = createComment("c1", "spammer", "p1", "Buy now!", state, {
        akismetWouldFlagAsSpam: true,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const newState = deriveState([...events, ...result.events]);
        expect(newState.comments.get("c1")?.spam).toBe(true);
      }
    });

    it("P3: does NOT mark comment as spam when user karma >= SPAM_KARMA_THRESHOLD even with akismetWouldFlagAsSpam", () => {
      const events = [
        {
          type: "USER_CREATED" as const,
          userId: "highkarma",
          timestamp: new Date(),
        },
        {
          type: "USER_UPDATED" as const,
          userId: "highkarma",
          changes: { karma: SPAM_KARMA_THRESHOLD }, // karma = 10
          timestamp: new Date(),
        },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "highkarma",
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      const result = createComment("c1", "highkarma", "p1", "Content", state, {
        akismetWouldFlagAsSpam: true,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const newState = deriveState([...events, ...result.events]);
        // User has karma >= 10, so spam detection doesn't apply
        expect(newState.comments.get("c1")?.spam).toBe(false);
      }
    });

    it("P3: does NOT mark comment as spam when user is reviewed even with akismetWouldFlagAsSpam", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "reviewed", timestamp: new Date() },
        {
          type: "USER_UPDATED" as const,
          userId: "reviewed",
          changes: { reviewedByUserId: "mod1" },
          timestamp: new Date(),
        },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "reviewed",
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      // User has karma=0 but is reviewed
      expect(state.users.get("reviewed")?.karma).toBe(0);
      expect(state.users.get("reviewed")?.reviewedByUserId).toBe("mod1");

      const result = createComment("c1", "reviewed", "p1", "Content", state, {
        akismetWouldFlagAsSpam: true,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const newState = deriveState([...events, ...result.events]);
        // Reviewed users skip Akismet entirely
        expect(newState.comments.get("c1")?.spam).toBe(false);
      }
    });

    it("P3: does NOT mark comment as spam when akismetWouldFlagAsSpam is not set", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "newbie", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "newbie",
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      const result = createComment("c1", "newbie", "p1", "Content", state);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const newState = deriveState([...events, ...result.events]);
        expect(newState.comments.get("c1")?.spam).toBe(false);
      }
    });
  });

  describe("[UNSTABLE] editComment", () => {
    it("P3: updates a comment", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "alice",
          timestamp: new Date(),
        },
        {
          type: "COMMENT_CREATED" as const,
          commentId: "c1",
          authorId: "alice",
          postId: "p1",
          contents: "Test comment",
          akismetWouldFlagAsSpam: false,
          postedAt: new Date(),
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      const result = editComment("c1", { draft: true }, state);
      expect(result.ok).toBe(true);
    });

    it("P3: fails if comment not found", () => {
      const state = initialState();
      const result = editComment("nonexistent", { draft: true }, state);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("not found");
    });

    it("P3: fails with empty changes", () => {
      const events = [
        { type: "USER_CREATED" as const, userId: "alice", timestamp: new Date() },
        {
          type: "POST_CREATED" as const,
          postId: "p1",
          authorId: "alice",
          timestamp: new Date(),
        },
        {
          type: "COMMENT_CREATED" as const,
          commentId: "c1",
          authorId: "alice",
          postId: "p1",
          contents: "Test comment",
          akismetWouldFlagAsSpam: false,
          postedAt: new Date(),
          timestamp: new Date(),
        },
      ];
      const state = deriveState(events);
      const result = editComment("c1", {}, state);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("No changes");
    });
  });
});
