import { not, sql } from "drizzle-orm";
import type { CurrentUser } from "../users/currentUser";
import { db } from "../db";
import { posts, users } from "../schema";
import { randomId } from "../utils/random";
import { postStatuses, userCanSuggestPostForCurated } from "./postsHelpers";
import { createRevision } from "../revisions/revisionMutations";
import { logFieldChanges, updateWithFieldChanges } from "../fieldChanges";
import { MINIMUM_APPROVAL_KARMA, userCanDo } from "../users/userHelpers";
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

export const toggleSuggestedForCuration = async (
  currentUser: CurrentUser,
  postId: string,
) => {
  await db.transaction(async (txn) => {
    const post = await db.query.posts.findFirst({
      columns: {
        frontpageDate: true,
        curatedDate: true,
        suggestForCuratedUserIds: true,
      },
      where: {
        _id: postId,
      },
    });
    if (!post) {
      throw new Error("Post not found");
    }
    if (!userCanSuggestPostForCurated(currentUser, post)) {
      throw new Error(
        "You do not have permission to suggest this post for curation",
      );
    }
    const userId = currentUser._id;
    const result = await db.execute<{ suggestForCuratedUserIds: string[] }>(sql`
      UPDATE ${posts}
      SET "suggestForCuratedUserIds" =
        CASE WHEN ${userId} = ANY(COALESCE("suggestForCuratedUserIds", '{}'))
          THEN ARRAY_REMOVE(COALESCE("suggestForCuratedUserIds", '{}'), ${userId})
          ELSE ARRAY_APPEND(COALESCE("suggestForCuratedUserIds", '{}'), ${userId})
        END
      WHERE ${posts._id} = ${postId}
      RETURNING "suggestForCuratedUserIds"
    `);
    await logFieldChanges(txn, currentUser._id, {
      documentId: postId,
      fieldName: "suggestForCuratedUserIds",
      oldValue: post.suggestForCuratedUserIds,
      newValue: result.rows[0].suggestForCuratedUserIds,
    });
  });
};

export const setAsQuickTakesPost = async (
  currentUser: CurrentUser,
  postId: string,
) => {
  if (!userCanDo(currentUser, "posts.edit.all")) {
    throw new Error("Permission denied");
  }
  await db.transaction(async (txn) => {
    const post = await txn.query.posts.findFirst({
      columns: {
        userId: true,
      },
      where: {
        _id: postId,
      },
    });
    if (!post) {
      throw new Error("Post not found");
    }
    await Promise.all([
      updateWithFieldChanges(txn, currentUser, posts, postId, {
        shortform: true,
      }),
      updateWithFieldChanges(txn, currentUser, users, post.userId, {
        shortformFeedId: postId,
      }),
    ]);
  });
};

export const toggleEnableRecommendation = async (
  currentUser: CurrentUser,
  postId: string,
) => {
  if (!userCanDo(currentUser, "posts.edit.all")) {
    throw new Error("Permission denied");
  }
  await updateWithFieldChanges(db, currentUser, posts, postId, {
    disableRecommendation: not(posts.disableRecommendation),
  });
};

export const toggleFrontpage = async (currentUser: CurrentUser, postId: string) => {
  if (!userCanDo(currentUser, "posts.edit.all")) {
    throw new Error("Permission denied");
  }
  await db.transaction(async (txn) => {
    const post = await txn.query.posts.findFirst({
      columns: {
        frontpageDate: true,
      },
      where: {
        _id: postId,
      },
    });
    if (!post) {
      throw new Error("Post not found");
    }
    await updateWithFieldChanges(db, currentUser, posts, postId, {
      frontpageDate: post.frontpageDate ? null : new Date().toISOString(),
      meta: false,
      draft: false,
      reviewedByUserId: currentUser._id,
    });
  });
};
