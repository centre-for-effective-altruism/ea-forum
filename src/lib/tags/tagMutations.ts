import type { CurrentUser } from "../users/currentUser";
import { fetchPostDisplay } from "../posts/postQueries";
import { postTagsProjection } from "./tagQueries";
import { performVote } from "../votes/voteMutations";
import { randomId } from "../utils/random";
import { tagRels } from "../schema";
import { db } from "../db";

export const addOrUpvoteTag = async ({
  currentUser,
  postId,
  tagId,
}: {
  currentUser: CurrentUser;
  postId: string;
  tagId: string;
}) => {
  // eslint-disable-next-line prefer-const
  let [post, tag, tagRel] = await Promise.all([
    // fetchPostDisplay includes permission checks, so users can't add tags to
    // posts they can't access (but can, for instance, add tags to their own
    // drafts, or any posts if they're an admin)
    fetchPostDisplay(currentUser, postId),
    db.query.tags.findFirst({
      columns: {
        parentTagId: true,
      },
      where: {
        _id: tagId,
        deleted: false,
      },
    }),
    db.query.tagRels.findFirst({
      where: {
        postId,
        tagId,
        deleted: false,
      },
    }),
  ]);
  if (!post) {
    throw new Error("You don't have permission to tag this post");
  }
  if (!tag) {
    throw new Error("Tag not found");
  }

  if (!tagRel) {
    const results = await db
      .insert(tagRels)
      .values([
        {
          _id: randomId(),
          tagId,
          postId,
          userId: currentUser._id,
        },
      ])
      .returning();
    tagRel = results[0];

    if (tag.parentTagId) {
      const parentTagRel = await db.query.tagRels.findFirst({
        where: {
          tagId: tag.parentTagId,
          postId,
        },
      });
      if (!parentTagRel) {
        await addOrUpvoteTag({ currentUser, postId, tagId: tag.parentTagId });
      }
    }
  }

  await db.transaction((txn) =>
    performVote({
      txn,
      collectionName: "TagRels",
      document: tagRel,
      user: currentUser,
      voteType: "smallUpvote",
      toggleIfAlreadyVoted: false,
      skipRateLimits: true,
    }),
  );

  const updatedPostWithTags = await db.query.posts.findFirst({
    columns: {},
    extras: {
      tags: (postsTable) => postTagsProjection(postsTable, currentUser._id),
    },
    where: {
      _id: postId,
    },
  });
  if (!updatedPostWithTags) {
    throw new Error("Updated post not found");
  }
  return updatedPostWithTags.tags ?? [];
};
