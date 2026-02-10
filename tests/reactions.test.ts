import { expect, suite, test } from "vitest";
import {
  createTestComment,
  createTestPost,
  createTestUser,
  createTestVote,
} from "./testHelpers";
import { db } from "@/lib/db";
import { performVote } from "@/lib/votes/voteMutations";
import { fetchPostDisplay } from "@/lib/posts/postQueries";
import { fetchCommentsListItem } from "@/lib/comments/commentLists";

suite("Reactions", () => {
  test("Can fetch post reactors", async () => {
    const [post, publicReactor1, publicReactor2, privateReactor] = await Promise.all(
      [
        createTestPost(),
        createTestUser({ displayName: "publicReactor1" }),
        createTestUser({ displayName: "publicReactor2" }),
        createTestUser({ displayName: "privateReactor" }),
      ],
    );
    await Promise.all([
      createTestVote({
        collectionName: "Posts",
        documentId: post._id,
        userId: publicReactor1._id,
        voteType: "neutral",
        power: 0,
        extendedVoteType: { helpful: true, laugh: true, insightful: false },
      }),
      createTestVote({
        collectionName: "Posts",
        documentId: post._id,
        userId: publicReactor2._id,
        voteType: "neutral",
        power: 0,
        extendedVoteType: { helpful: true, love: true, laugh: false },
      }),
      createTestVote({
        collectionName: "Posts",
        documentId: post._id,
        userId: privateReactor._id,
        voteType: "neutral",
        power: 0,
        extendedVoteType: { agree: true, disagree: false },
      }),
    ]);
    const fetchedPost = await fetchPostDisplay(null, post._id);
    expect(fetchedPost).not.toBeNull();
    const { reactors } = fetchedPost!;
    const expectedKeys = ["helpful", "laugh", "love"];
    expect(Object.keys(reactors!).sort()).toEqual(expectedKeys.sort());
    expect(reactors?.helpful.sort()).toEqual(["publicReactor1", "publicReactor2"]);
    expect(reactors?.laugh).toEqual(["publicReactor1"]);
    expect(reactors?.love).toEqual(["publicReactor2"]);
  });
  test("Can fetch comment reactors", async () => {
    const post = await createTestPost();
    const [comment1, comment2] = await Promise.all([
      createTestComment({ postId: post._id }),
      createTestComment({ postId: post._id }),
    ]);
    const [publicReactor1, publicReactor2, privateReactor] = await Promise.all([
      createTestUser({ displayName: "publicReactor1" }),
      createTestUser({ displayName: "publicReactor2" }),
      createTestUser({ displayName: "privateReactor" }),
    ]);
    await Promise.all([
      createTestVote({
        collectionName: "Comments",
        documentId: comment1._id,
        userId: publicReactor1._id,
        voteType: "neutral",
        power: 0,
        extendedVoteType: { helpful: true, laugh: true, insightful: false },
      }),
      createTestVote({
        collectionName: "Comments",
        documentId: comment2._id,
        userId: publicReactor2._id,
        voteType: "neutral",
        power: 0,
        extendedVoteType: { helpful: true, love: true, laugh: false },
      }),
      createTestVote({
        collectionName: "Comments",
        documentId: comment1._id,
        userId: privateReactor._id,
        voteType: "neutral",
        power: 0,
        extendedVoteType: { agree: true, disagree: false },
      }),
    ]);
    const fetchedComment1 = await fetchCommentsListItem({
      currentUser: null,
      commentId: comment1._id,
    });
    expect(fetchedComment1).not.toBeNull();
    const { reactors: reactors1 } = fetchedComment1;
    expect(Object.keys(reactors1!).sort()).toEqual(["helpful", "laugh"].sort());
    expect(reactors1?.helpful).toEqual(["publicReactor1"]);
    expect(reactors1?.laugh).toEqual(["publicReactor1"]);
    const fetchedComment2 = await fetchCommentsListItem({
      currentUser: null,
      commentId: comment2._id,
    });
    expect(fetchedComment2).not.toBeNull();
    const { reactors: reactors2 } = fetchedComment2;
    expect(Object.keys(reactors2!).sort()).toEqual(["helpful", "love"].sort());
    expect(reactors2?.helpful).toEqual(["publicReactor2"]);
    expect(reactors2?.helpful).toEqual(["publicReactor2"]);
  });
  test("Can react to post", async () => {
    const [post, reactor1, reactor2] = await Promise.all([
      createTestPost(),
      createTestUser(),
      createTestUser(),
    ]);

    await performVote({
      txn: db,
      collectionName: "Posts",
      document: post,
      user: reactor1,
      voteType: "neutral",
      extendedVoteType: { agree: true },
    });
    {
      const [updatedPost, vote] = await Promise.all([
        db.query.posts.findFirst({
          where: {
            _id: post._id,
          },
        }),
        db.query.votes.findFirst({
          where: {
            documentId: post._id,
            userId: reactor1._id,
          },
        }),
      ]);
      expect(updatedPost!.extendedScore).toStrictEqual({ agree: 1 });
      expect(vote!.extendedVoteType).toStrictEqual({ agree: true });
    }

    await performVote({
      txn: db,
      collectionName: "Posts",
      document: post,
      user: reactor2,
      voteType: "neutral",
      extendedVoteType: { agree: true },
    });
    {
      const [updatedPost, vote] = await Promise.all([
        db.query.posts.findFirst({
          where: {
            _id: post._id,
          },
        }),
        db.query.votes.findFirst({
          where: {
            documentId: post._id,
            userId: reactor1._id,
          },
        }),
      ]);
      expect(updatedPost!.extendedScore).toStrictEqual({ agree: 2 });
      expect(vote!.extendedVoteType).toStrictEqual({ agree: true });
    }

    await performVote({
      txn: db,
      collectionName: "Posts",
      document: post,
      user: reactor1,
      voteType: "neutral",
      extendedVoteType: { helpful: true, disagree: true },
    });
    {
      const [updatedPost, vote] = await Promise.all([
        db.query.posts.findFirst({
          where: {
            _id: post._id,
          },
        }),
        db.query.votes.findFirst({
          where: {
            documentId: post._id,
            userId: reactor1._id,
          },
        }),
      ]);
      expect(updatedPost!.extendedScore).toStrictEqual({
        agree: 1,
        helpful: 1,
        disagree: 1,
      });
      expect(vote!.extendedVoteType).toStrictEqual({
        helpful: true,
        disagree: true,
      });
    }
  });
  test("Can react to comment", async () => {
    const [comment, reactor1, reactor2] = await Promise.all([
      createTestComment(),
      createTestUser(),
      createTestUser(),
    ]);

    await performVote({
      txn: db,
      collectionName: "Comments",
      document: comment,
      user: reactor1,
      voteType: "neutral",
      extendedVoteType: { agree: true },
    });
    {
      const [updatedComment, vote] = await Promise.all([
        db.query.comments.findFirst({
          where: {
            _id: comment._id,
          },
        }),
        db.query.votes.findFirst({
          where: {
            documentId: comment._id,
            userId: reactor1._id,
          },
        }),
      ]);
      expect(updatedComment!.extendedScore).toStrictEqual({ agree: 1 });
      expect(vote!.extendedVoteType).toStrictEqual({ agree: true });
    }

    await performVote({
      txn: db,
      collectionName: "Comments",
      document: comment,
      user: reactor2,
      voteType: "neutral",
      extendedVoteType: { agree: true },
    });
    {
      const [updatedComment, vote] = await Promise.all([
        db.query.comments.findFirst({
          where: {
            _id: comment._id,
          },
        }),
        db.query.votes.findFirst({
          where: {
            documentId: comment._id,
            userId: reactor1._id,
          },
        }),
      ]);
      expect(updatedComment!.extendedScore).toStrictEqual({ agree: 2 });
      expect(vote!.extendedVoteType).toStrictEqual({ agree: true });
    }

    await performVote({
      txn: db,
      collectionName: "Comments",
      document: comment,
      user: reactor1,
      voteType: "neutral",
      extendedVoteType: { helpful: true, disagree: true },
    });
    {
      const [updatedComment, vote] = await Promise.all([
        db.query.comments.findFirst({
          where: {
            _id: comment._id,
          },
        }),
        db.query.votes.findFirst({
          where: {
            documentId: comment._id,
            userId: reactor1._id,
          },
        }),
      ]);
      expect(updatedComment!.extendedScore).toStrictEqual({
        agree: 1,
        helpful: 1,
        disagree: 1,
      });
      expect(vote!.extendedVoteType).toStrictEqual({
        helpful: true,
        disagree: true,
      });
    }
  });
});
