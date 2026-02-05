import { afterEach, expect, suite, test } from "vitest";
import {
  createTestComment,
  createTestGroup,
  createTestPost,
  createTestUser,
} from "./testHelpers";
import { db } from "@/lib/db";
import { posts } from "@/lib/schema";
import { postStatuses } from "@/lib/posts/postsHelpers";
import { fetchCommmentsForPost } from "@/lib/comments/commentLists";
import { fetchPostDisplay } from "@/lib/posts/postQueries";
import {
  fetchFrontpagePostsList,
  fetchPostsListById,
  fetchStickyPostsList,
} from "@/lib/posts/postLists";

suite("Permissions", () => {
  suite("Post display permissions", () => {
    test("Can't fetch draft post display", async () => {
      const post = await createTestPost({ draft: true });
      const loggedOutDisplay = await fetchPostDisplay(null, post._id);
      expect(loggedOutDisplay).toBe(null);
      const user = await createTestUser();
      const loggedInDisplay = await fetchPostDisplay(user, post._id);
      expect(loggedInDisplay).toBe(null);
    });
    test("Authors can view their own drafts", async () => {
      const user = await createTestUser();
      const post = await createTestPost({ userId: user._id, draft: true });
      const display = await fetchPostDisplay(user, post._id);
      expect(display).not.toBe(null);
      expect(display!._id).toBe(post._id);
    });
    test("Admins and moderators can view drafts", async () => {
      const post = await createTestPost({ draft: true });
      const admin = await createTestUser({ isAdmin: true });
      const adminDisplay = await fetchPostDisplay(admin, post._id);
      expect(adminDisplay).not.toBe(null);
      expect(adminDisplay!._id).toBe(post._id);
      const moderator = await createTestUser({ groups: ["sunshineRegiment"] });
      const moderatorDisplay = await fetchPostDisplay(moderator, post._id);
      expect(moderatorDisplay).not.toBe(null);
      expect(moderatorDisplay!._id).toBe(post._id);
    });
    test("Can't fetch deleted post display", async () => {
      const post = await createTestPost({ deletedDraft: true });
      const loggedOutDisplay = await fetchPostDisplay(null, post._id);
      expect(loggedOutDisplay).toBe(null);
      const user = await createTestUser();
      const loggedInDisplay = await fetchPostDisplay(user, post._id);
      expect(loggedInDisplay).toBe(null);
    });
    test("Authors can view their own deleted posts", async () => {
      const user = await createTestUser();
      const post = await createTestPost({ userId: user._id, deletedDraft: true });
      const display = await fetchPostDisplay(user, post._id);
      expect(display).not.toBe(null);
      expect(display!._id).toBe(post._id);
    });
    test("Admins and moderators can view deleted posts", async () => {
      const post = await createTestPost({ deletedDraft: true });
      const admin = await createTestUser({ isAdmin: true });
      const displayDisplay = await fetchPostDisplay(admin, post._id);
      expect(displayDisplay).not.toBe(null);
      expect(displayDisplay!._id).toBe(post._id);
      const moderator = await createTestUser({ groups: ["sunshineRegiment"] });
      const moderatorDisplay = await fetchPostDisplay(moderator, post._id);
      expect(moderatorDisplay).not.toBe(null);
      expect(moderatorDisplay!._id).toBe(post._id);
    });
    test("Can't fetch rejected post display", async () => {
      const post = await createTestPost({ rejected: true });
      const loggedOutDisplay = await fetchPostDisplay(null, post._id);
      expect(loggedOutDisplay).toBe(null);
      const user = await createTestUser();
      const loggedInDisplay = await fetchPostDisplay(user, post._id);
      expect(loggedInDisplay).toBe(null);
    });
    test("Authors can view their own rejected posts", async () => {
      const user = await createTestUser();
      const post = await createTestPost({ userId: user._id, rejected: true });
      const display = await fetchPostDisplay(user, post._id);
      expect(display).not.toBe(null);
      expect(display!._id).toBe(post._id);
    });
    test("Admins and moderators can view rejected posts", async () => {
      const post = await createTestPost({ rejected: true });
      const admin = await createTestUser({ isAdmin: true });
      const adminDisplay = await fetchPostDisplay(admin, post._id);
      expect(adminDisplay).not.toBe(null);
      expect(adminDisplay!._id).toBe(post._id);
      const moderator = await createTestUser({ groups: ["sunshineRegiment"] });
      const moderatorDisplay = await fetchPostDisplay(moderator, post._id);
      expect(moderatorDisplay).not.toBe(null);
      expect(moderatorDisplay!._id).toBe(post._id);
    });
    test("Can fetch unlisted post display", async () => {
      const post = await createTestPost({ unlisted: true });
      const display = await fetchPostDisplay(null, post._id);
      expect(display).not.toBe(null);
      expect(display!._id).toBe(post._id);
    });
    test("Public post with deleted author is fetched without author", async () => {
      const author = await createTestUser({ deleted: true });
      const post = await createTestPost({ userId: author._id });
      const display = await fetchPostDisplay(null, post._id);
      expect(display!._id).toBe(post._id);
      expect(display!.user).toBe(null);
    });
    test("Public post with deleted group is fetched without group", async () => {
      const group = await createTestGroup({ deleted: true });
      const post = await createTestPost({ groupId: group._id });
      const display = await fetchPostDisplay(null, post._id);
      expect(display!._id).toBe(post._id);
      expect(display!.group).toBe(null);
    });
  });
  suite("Post list permissions", () => {
    afterEach(async () => {
      await db.delete(posts);
    });
    test("Post lists don't include drafts", async () => {
      const now = new Date().toISOString();
      const [publicPost] = await Promise.all([
        createTestPost({ frontpageDate: now }),
        createTestPost({ frontpageDate: now, draft: true }),
      ]);
      const list = await fetchFrontpagePostsList({ currentUserId: null, limit: 10 });
      expect(list.length).toBe(1);
      expect(list[0]._id).toBe(publicPost._id);
    });
    test("Post lists don't include unlisted posts", async () => {
      const now = new Date().toISOString();
      const [publicPost] = await Promise.all([
        createTestPost({ frontpageDate: now }),
        createTestPost({ frontpageDate: now, unlisted: true }),
      ]);
      const list = await fetchFrontpagePostsList({ currentUserId: null, limit: 10 });
      expect(list.length).toBe(1);
      expect(list[0]._id).toBe(publicPost._id);
    });
    test("Post lists don't include rejected posts", async () => {
      const now = new Date().toISOString();
      const [publicPost] = await Promise.all([
        createTestPost({ frontpageDate: now }),
        createTestPost({ frontpageDate: now, rejected: true }),
      ]);
      const list = await fetchFrontpagePostsList({ currentUserId: null, limit: 10 });
      expect(list.length).toBe(1);
      expect(list[0]._id).toBe(publicPost._id);
    });
    test("Post lists don't include future posts", async () => {
      const now = new Date().toISOString();
      const [publicPost] = await Promise.all([
        createTestPost({ frontpageDate: now }),
        createTestPost({ frontpageDate: now, isFuture: true }),
      ]);
      const list = await fetchFrontpagePostsList({ currentUserId: null, limit: 10 });
      expect(list.length).toBe(1);
      expect(list[0]._id).toBe(publicPost._id);
    });
    test("Post lists don't include posts by unreviewed authors", async () => {
      const now = new Date().toISOString();
      const [publicPost] = await Promise.all([
        createTestPost({ frontpageDate: now }),
        createTestPost({ frontpageDate: now, authorIsUnreviewed: true }),
      ]);
      const list = await fetchFrontpagePostsList({ currentUserId: null, limit: 10 });
      expect(list.length).toBe(1);
      expect(list[0]._id).toBe(publicPost._id);
    });
    test("Post lists only include approved posts", async () => {
      const now = new Date().toISOString();
      const [publicPost] = await Promise.all([
        createTestPost({ frontpageDate: now }),
        createTestPost({ frontpageDate: now, status: postStatuses.STATUS_PENDING }),
      ]);
      const list = await fetchFrontpagePostsList({ currentUserId: null, limit: 10 });
      expect(list.length).toBe(1);
      expect(list[0]._id).toBe(publicPost._id);
    });
    test("Sticky post lists only include sticky posts", async () => {
      const now = new Date().toISOString();
      const [publicPost] = await Promise.all([
        createTestPost({ frontpageDate: now, sticky: true }),
        createTestPost({ frontpageDate: now }),
      ]);
      const list = await fetchStickyPostsList({ currentUserId: null, limit: 10 });
      expect(list.length).toBe(1);
      expect(list[0]._id).toBe(publicPost._id);
    });
    test("Public post with deleted author is fetched without author", async () => {
      const author = await createTestUser({ deleted: true });
      const post = await createTestPost({ userId: author._id });
      const list = await fetchPostsListById(null, post._id);
      expect(list!._id).toBe(post._id);
      expect(list!.user).toBe(null);
    });
    test("Public post with deleted group is fetched without group", async () => {
      const group = await createTestGroup({ deleted: true });
      const post = await createTestPost({ groupId: group._id });
      const list = await fetchPostsListById(null, post._id);
      expect(list!._id).toBe(post._id);
      expect(list!.group).toBe(null);
    });
    test("Post lists don't include deleted coauthors", async () => {
      const [coauthor1, coauthor2] = await Promise.all([
        createTestUser(),
        createTestUser({ deleted: true }),
      ]);
      const post = await createTestPost({
        coauthorUserIds: [coauthor1._id, coauthor2._id],
      });
      const list = await fetchPostsListById(null, post._id);
      expect(list!.coauthors).toHaveLength(1);
      expect(list!.coauthors[0]._id).toBe(coauthor1._id);
    });
  });
  suite("Comment list permissions", () => {
    test("Comment lists don't include draft comments", async () => {
      const post = await createTestPost();
      const [publicComment] = await Promise.all([
        createTestComment({ postId: post._id }),
        createTestComment({ postId: post._id, draft: true }),
      ]);
      const comments = await fetchCommmentsForPost({
        currentUser: null,
        postId: post._id,
      });
      expect(comments.length).toBe(1);
      expect(comments[0]._id).toBe(publicComment._id);
    });
    test("Comment lists do include a users own draft comments", async () => {
      const [post, commenter] = await Promise.all([
        createTestPost(),
        createTestUser(),
      ]);
      const comment = await createTestComment({
        postId: post._id,
        userId: commenter._id,
        draft: true,
      });
      const comments = await fetchCommmentsForPost({
        currentUser: commenter,
        postId: post._id,
      });
      expect(comments.length).toBe(1);
      expect(comments[0]._id).toBe(comment._id);
    });
    test("Admins and moderators can't see other users' draft comments", async () => {
      const post = await createTestPost();
      const [publicComment] = await Promise.all([
        createTestComment({ postId: post._id }),
        createTestComment({ postId: post._id, draft: true }),
      ]);
      const admin = await createTestUser({ isAdmin: true });
      const adminComments = await fetchCommmentsForPost({
        currentUser: admin,
        postId: post._id,
      });
      expect(adminComments.length).toBe(1);
      expect(adminComments[0]._id).toBe(publicComment._id);
      const moderator = await createTestUser({ groups: ["sunshineRegiment"] });
      const moderatorComments = await fetchCommmentsForPost({
        currentUser: moderator,
        postId: post._id,
      });
      expect(moderatorComments.length).toBe(1);
      expect(moderatorComments[0]._id).toBe(publicComment._id);
    });
    test("Comment lists don't include rejected comments", async () => {
      const post = await createTestPost();
      const [publicComment] = await Promise.all([
        createTestComment({ postId: post._id }),
        createTestComment({ postId: post._id, rejected: true }),
      ]);
      const comments = await fetchCommmentsForPost({
        currentUser: null,
        postId: post._id,
      });
      expect(comments.length).toBe(1);
      expect(comments[0]._id).toBe(publicComment._id);
    });
    test("Comment lists do include a users own rejected comments", async () => {
      const [post, commenter] = await Promise.all([
        createTestPost(),
        createTestUser(),
      ]);
      const comment = await createTestComment({
        postId: post._id,
        userId: commenter._id,
        rejected: true,
      });
      const comments = await fetchCommmentsForPost({
        currentUser: commenter,
        postId: post._id,
      });
      expect(comments.length).toBe(1);
      expect(comments[0]._id).toBe(comment._id);
    });
    test("Comment lists don't include deleted comments", async () => {
      const post = await createTestPost();
      const [publicComment] = await Promise.all([
        createTestComment({ postId: post._id }),
        createTestComment({ postId: post._id, deleted: true }),
      ]);
      const comments = await fetchCommmentsForPost({
        currentUser: null,
        postId: post._id,
      });
      expect(comments.length).toBe(1);
      expect(comments[0]._id).toBe(publicComment._id);
    });
    test("Comment lists do include publicly deleted comments", async () => {
      const post = await createTestPost();
      const [publicComment, deletedComment] = await Promise.all([
        createTestComment({ postId: post._id }),
        createTestComment({ postId: post._id, deletedPublic: true }),
      ]);
      const comments = await fetchCommmentsForPost({
        currentUser: null,
        postId: post._id,
      });
      expect(comments.length).toBe(2);
      const commentIds = comments.map(({ _id }) => _id);
      const expectedCommentIds = [publicComment._id, deletedComment._id];
      expect(commentIds.sort()).toEqual(expectedCommentIds.sort());
    });
    test("Public comment with deleted author is fetched without author", async () => {
      const [post, commenter] = await Promise.all([
        createTestPost(),
        createTestUser({ deleted: true }),
      ]);
      const comment = await createTestComment({
        postId: post._id,
        userId: commenter._id,
      });
      const comments = await fetchCommmentsForPost({
        currentUser: null,
        postId: post._id,
      });
      expect(comments.length).toBe(1);
      expect(comments[0]._id).toBe(comment._id);
      expect(comments[0].user).toBe(null);
    });
    test("Can't fetch comments for draft post", async () => {
      const post = await createTestPost({ draft: true });
      await createTestComment({ postId: post._id });
      const comments = await fetchCommmentsForPost({
        currentUser: null,
        postId: post._id,
      });
      expect(comments.length).toBe(0);
    });
    test("Can fetch comments for your own draft post", async () => {
      const user = await createTestUser();
      const post = await createTestPost({ userId: user._id, draft: true });
      const comment = await createTestComment({ postId: post._id });
      const comments = await fetchCommmentsForPost({
        currentUser: user,
        postId: post._id,
      });
      expect(comments.length).toBe(1);
      expect(comments[0]._id).toBe(comment._id);
    });
    test("Admins and moderators can fetch comments for draft post", async () => {
      const post = await createTestPost({ draft: true });
      const comment = await createTestComment({ postId: post._id });
      const admin = await createTestUser({ isAdmin: true });
      const comments = await fetchCommmentsForPost({
        currentUser: admin,
        postId: post._id,
      });
      expect(comments.length).toBe(1);
      expect(comments[0]._id).toBe(comment._id);
      const moderator = await createTestUser({ groups: ["sunshineRegiment"] });
      const moderatorComments = await fetchCommmentsForPost({
        currentUser: moderator,
        postId: post._id,
      });
      expect(moderatorComments.length).toBe(1);
      expect(moderatorComments[0]._id).toBe(comment._id);
    });
  });
});
