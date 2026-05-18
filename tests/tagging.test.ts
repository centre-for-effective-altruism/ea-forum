import { expect, suite, test } from "vitest";
import { addOrUpvoteTag } from "@/lib/tags/tagMutations";
import { createTestUser, createTestPost, createTestTag } from "./testHelpers";

suite("Tagging", () => {
  test("Can add a new tag to a post, upvoting doesn't increase score", async () => {
    const [user, post, tag] = await Promise.all([
      createTestUser(),
      createTestPost(),
      createTestTag(),
    ]);
    const postTags1 = await addOrUpvoteTag({
      currentUser: user,
      postId: post._id,
      tagId: tag._id,
    });
    expect(postTags1.length).toBe(1);
    expect(postTags1[0]._id).toBe(tag._id);
    expect(postTags1[0].tagRel.baseScore).toBe(1);
    const postTags2 = await addOrUpvoteTag({
      currentUser: user,
      postId: post._id,
      tagId: tag._id,
    });
    expect(postTags2.length).toBe(1);
    expect(postTags2[0]._id).toBe(tag._id);
    expect(postTags2[0].tagRel.baseScore).toBe(1);
  });
  test("Other users can upvote a post tag", async () => {
    const [user1, user2, post, tag] = await Promise.all([
      createTestUser(),
      createTestUser(),
      createTestPost(),
      createTestTag(),
    ]);
    const postTags1 = await addOrUpvoteTag({
      currentUser: user1,
      postId: post._id,
      tagId: tag._id,
    });
    expect(postTags1.length).toBe(1);
    expect(postTags1[0]._id).toBe(tag._id);
    expect(postTags1[0].tagRel.baseScore).toBe(1);
    const postTags2 = await addOrUpvoteTag({
      currentUser: user2,
      postId: post._id,
      tagId: tag._id,
    });
    expect(postTags2.length).toBe(1);
    expect(postTags2[0]._id).toBe(tag._id);
    expect(postTags2[0].tagRel.baseScore).toBe(2);
  });
  test("Posts can have multiple tags", async () => {
    const [user, post, tag1, tag2] = await Promise.all([
      createTestUser(),
      createTestPost(),
      createTestTag(),
      createTestTag(),
    ]);
    const postTags1 = await addOrUpvoteTag({
      currentUser: user,
      postId: post._id,
      tagId: tag1._id,
    });
    expect(postTags1.length).toBe(1);
    expect(postTags1[0]._id).toBe(tag1._id);
    expect(postTags1[0].tagRel.baseScore).toBe(1);
    const postTags2 = await addOrUpvoteTag({
      currentUser: user,
      postId: post._id,
      tagId: tag2._id,
    });
    expect(postTags2.length).toBe(2);
    expect(postTags2.map(({ _id }) => _id).sort()).toStrictEqual(
      [tag1._id, tag2._id].sort(),
    );
    expect(postTags2[0].tagRel.baseScore).toBe(1);
    expect(postTags2[1].tagRel.baseScore).toBe(1);
  });
  test("Adding a child tag automatically adds the parent tag", async () => {
    const parentTag = await createTestTag();
    const [user, post, childTag] = await Promise.all([
      createTestUser(),
      createTestPost(),
      createTestTag({ parentTagId: parentTag._id }),
    ]);
    const postTags = await addOrUpvoteTag({
      currentUser: user,
      postId: post._id,
      tagId: childTag._id,
    });
    expect(postTags.length).toBe(2);
    expect(postTags.map(({ _id }) => _id).sort()).toStrictEqual(
      [childTag._id, parentTag._id].sort(),
    );
    expect(postTags[0].tagRel.baseScore).toBe(1);
    expect(postTags[1].tagRel.baseScore).toBe(1);
  });
  test("Adding a child tag doesn't vote parent if it already exists", async () => {
    const parentTag = await createTestTag();
    const [user, post, childTag] = await Promise.all([
      createTestUser(),
      createTestPost(),
      createTestTag({ parentTagId: parentTag._id }),
    ]);
    const postTags1 = await addOrUpvoteTag({
      currentUser: user,
      postId: post._id,
      tagId: parentTag._id,
    });
    expect(postTags1.length).toBe(1);
    expect(postTags1[0]._id).toBe(parentTag._id);
    expect(postTags1[0].tagRel.baseScore).toBe(1);
    const postTags2 = await addOrUpvoteTag({
      currentUser: user,
      postId: post._id,
      tagId: childTag._id,
    });
    expect(postTags2.length).toBe(2);
    expect(postTags2.map(({ _id }) => _id).sort()).toStrictEqual(
      [childTag._id, parentTag._id].sort(),
    );
    expect(postTags2[0].tagRel.baseScore).toBe(1);
    expect(postTags2[1].tagRel.baseScore).toBe(1);
  });
  test("Adding a tag to an invalid post throws an error", async () => {
    const [user, tag] = await Promise.all([createTestUser(), createTestTag()]);
    await expect(
      addOrUpvoteTag({
        currentUser: user,
        postId: "invalid-post-id",
        tagId: tag._id,
      }),
    ).rejects.toThrow("You don't have permission");
  });
  test("Adding an invalid tag to a post throws an error", async () => {
    const [user, post] = await Promise.all([createTestUser(), createTestPost()]);
    await expect(
      addOrUpvoteTag({
        currentUser: user,
        postId: post._id,
        tagId: "invalid-tag-id",
      }),
    ).rejects.toThrow("Tag not found");
  });
  test("Users can add tags to their drafts", async () => {
    const user = await createTestUser();
    const [post, tag] = await Promise.all([
      createTestPost({ userId: user._id, draft: true }),
      createTestTag(),
    ]);
    const postTags = await addOrUpvoteTag({
      currentUser: user,
      postId: post._id,
      tagId: tag._id,
    });
    expect(postTags.length).toBe(1);
    expect(postTags[0]._id).toBe(tag._id);
    expect(postTags[0].tagRel.baseScore).toBe(1);
  });
  test("Admins can add tags to any drafts", async () => {
    const [user, post, tag] = await Promise.all([
      createTestUser({ isAdmin: true }),
      createTestPost({ draft: true }),
      createTestTag(),
    ]);
    const postTags = await addOrUpvoteTag({
      currentUser: user,
      postId: post._id,
      tagId: tag._id,
    });
    expect(postTags.length).toBe(1);
    expect(postTags[0]._id).toBe(tag._id);
    expect(postTags[0].tagRel.baseScore).toBe(1);
  });
});
