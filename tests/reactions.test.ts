import { expect, suite, test } from "vitest";
import {
  createTestComment,
  createTestPost,
  createTestUser,
  createTestVote,
} from "./testHelpers";
import { fetchCommentReactors, fetchPostReactors } from "@/lib/votes/fetchReactors";

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
    const reactors = await fetchPostReactors(post._id);
    const expectedKeys = ["helpful", "laugh", "love"];
    expect(Object.keys(reactors).sort()).toEqual(expectedKeys.sort());
    expect(reactors.helpful.sort()).toEqual(["publicReactor1", "publicReactor2"]);
    expect(reactors.laugh).toEqual(["publicReactor1"]);
    expect(reactors.love).toEqual(["publicReactor2"]);
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
    const reactors = await fetchCommentReactors(post._id);
    expect(Object.keys(reactors).sort()).toEqual(
      [comment1._id, comment2._id].sort(),
    );
    const reactors1 = reactors[comment1._id];
    expect(Object.keys(reactors1).sort()).toEqual(["helpful", "laugh"].sort());
    expect(reactors1.helpful).toEqual(["publicReactor1"]);
    expect(reactors1.laugh).toEqual(["publicReactor1"]);
    const reactors2 = reactors[comment2._id];
    expect(Object.keys(reactors2).sort()).toEqual(["helpful", "love"].sort());
    expect(reactors2.helpful).toEqual(["publicReactor2"]);
    expect(reactors2.helpful).toEqual(["publicReactor2"]);
  });
});
