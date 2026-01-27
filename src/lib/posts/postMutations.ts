import type { CurrentUser } from "../users/currentUser";
import { db } from "../db";
import { posts } from "../schema";
import { randomId } from "../utils/random";
import { postStatuses } from "./postsHelpers";
import { createRevision } from "../revisions/revisionMutations";
import { MINIMUM_APPROVAL_KARMA } from "../users/userHelpers";
import { updatePostUser } from "./postCallbacks";
import { getUniqueSlug } from "../slugs/uniqueSlug";
import { performVote } from "../votes/voteMutations";

export const createShortformPost = async (user: CurrentUser) => {
  const _id = randomId();
  const title = `${user.displayName}'s Quick Takes`;
  const now = new Date().toISOString();

  await db.transaction(async (txn) => {
    const [slug, revision] = await Promise.all([
      getUniqueSlug(txn, posts, title),
      createRevision(
        txn,
        user,
        {
          originalContents: {
            type: "ckEditorMarkup",
            data: "",
          },
          commitMessage: "",
          updateType: "initial",
        },
        {
          documentId: _id,
          collectionName: "Posts",
          fieldName: "contents",
        },
      ),
    ]);

    const authorIsUnreviewed =
      !user.reviewedByUserId && user.karma < MINIMUM_APPROVAL_KARMA;

    const [post] = await txn
      .insert(posts)
      .values({
        _id,
        userId: user._id,
        shortform: true,
        postedAt: now,
        modifiedAt: now,
        lastCommentedAt: now,
        frontpageDate: now,
        title,
        slug,
        status: postStatuses.STATUS_APPROVED,
        draft: false,
        isFuture: false,
        author: user.displayName,
        authorIsUnreviewed,
        votingSystem: "eaEmojis",
        contentsLatest: revision._id,
        maxBaseScore: 0, // TODO: This should have a DB-level default value
        wasEverUndrafted: true,
      })
      .returning();

    await Promise.all([
      updatePostUser(txn, post),
      performVote({
        txn,
        collectionName: "Posts",
        document: post,
        user,
        voteType: "smallUpvote",
        skipRateLimits: true,
      }),
    ]);
  });

  // TODO:
  // Posts rate limit
  // triggerReviewIfNeeded
  // New post notifications

  return _id;
};
