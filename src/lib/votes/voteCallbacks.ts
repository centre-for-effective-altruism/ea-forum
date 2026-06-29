import { eq, sql } from "drizzle-orm";
import { createNotification } from "../notifications/notificationMutations";
import { userSmallVotePower, VoteType } from "./voteHelpers";
import { Post, posts, TagRel, users } from "../schema";
import { userIsInGroup } from "../users/userHelpers";
import { isAnyInArray } from "../utils/queryHelpers";
import { nDaysAgo } from "../timeUtils";
import type { DbOrTransaction } from "../db";
import type {
  VoteableCollectionName,
  VoteableDocument,
  VoteableDocumentAuthor,
} from "./voteableDocument";
import {
  commentModeratorActionType,
  isDownvotedBelowBar,
} from "../commentModeratorActions/commentModeratorActionsHelpers";
import { createCommentModeratorAction } from "../commentModeratorActions/commentModeratorActionMutations";

const userVoteGroups = [
  {
    group: "trustLevel1",
    karmaThreshold: 2000,
  },
  {
    group: "canModeratePersonal",
    karmaThreshold: 50,
  },
] satisfies { group: string; karmaThreshold: number }[];

const collectionsThatAffectKarma = ["Posts", "Comments", "Revisions"];

const sendKarmaThresholdNotification = async (
  db: DbOrTransaction,
  user: VoteableDocumentAuthor,
) => {
  const existingNotifications = await db.query.notifications.findMany({
    columns: {
      _id: true,
    },
    where: {
      userId: user._id,
      type: "karmaPowersGained",
      createdAt: { gt: nDaysAgo(1).toISOString() },
    },
  });
  if (existingNotifications.length === 0) {
    await createNotification({
      userId: user._id,
      type: "karmaPowersGained",
      documentType: null,
      documentId: null,
    });
  }
};

export const updateUserKarma = async (
  db: DbOrTransaction,
  collectionName: VoteableCollectionName,
  authors: VoteableDocumentAuthor[],
  votingUserId: string,
  /**
   * User-specific power of this vote. This will be positive for an upvote or
   * negative for a downvote, or, if this is an unvote, the signs will be
   * reversed.
   */
  votePower: number,
) => {
  if (!collectionsThatAffectKarma.includes(collectionName)) {
    return;
  }

  // Only update user karma if the operation isn't done by one of the item's
  // current authors. We don't want to let any of the authors give themselves
  // or another author karma for this item.
  const authorIds = authors.map(({ _id }) => _id);
  if (!authorIds.includes(votingUserId)) {
    // Update `karma` for all authors
    await db
      .update(users)
      .set({
        karma: sql`${users.karma} + ${votePower}`,
      })
      .where(isAnyInArray(users._id, authorIds, "text"));

    await Promise.all(
      authors.map(async (author) => {
        const oldKarma = author.karma;
        const newKarma = oldKarma + votePower;

        // Send notification if crossing a vote power threshold
        if (userSmallVotePower(oldKarma, 1) < userSmallVotePower(newKarma, 1)) {
          void sendKarmaThresholdNotification(db, author);
        }

        // Update the user groups if crossing a group threshold
        const newGroups: string[] = [];
        for (const { group, karmaThreshold } of userVoteGroups) {
          if (newKarma >= karmaThreshold && !userIsInGroup(author, group)) {
            newGroups.push(group);
          }
        }
        if (newGroups.length) {
          const separatedGroups = newGroups.map((g) => `'${g}'`).join(",");
          const arrayLiteral = `ARRAY[${separatedGroups}]::TEXT[]`;
          await db
            .update(users)
            .set({
              groups: sql`${users.groups} || ${sql.raw(arrayLiteral)}`,
            })
            .where(eq(users._id, author._id));
        }
      }),
    );
  }
};

export const updateUserVoteCounts = async (
  db: DbOrTransaction,
  authors: VoteableDocumentAuthor[],
  userId: string,
  voteType: VoteType,
  amount: 1 | -1,
) => {
  if (voteType === "neutral") {
    return;
  }
  const authorIds = authors.map(({ _id }) => _id);
  if (!authorIds.includes(userId)) {
    const casterField = `${voteType}Count` as keyof typeof users;
    const receiverField = `${voteType}ReceivedCount` as keyof typeof users;
    await Promise.all([
      // Increment the counts for the person casting the vote
      db
        .update(users)
        .set({
          voteCount: sql`COALESCE(${users.voteCount}, 0) + ${amount}`,
          [casterField]: sql`COALESCE(${users[casterField]}, 0) + ${amount}`,
        })
        .where(eq(users._id, userId)),
      // Increment the counts for the people receiving the vote
      db
        .update(users)
        .set({
          voteReceivedCount: sql`COALESCE(${users.voteReceivedCount}, 0) + ${amount}`,
          [receiverField]: sql`COALESCE(${users[receiverField]}, 0) + ${amount}`,
        })
        .where(isAnyInArray(users._id, authorIds, "text")),
    ]);
  }
};

export const increasePostMaxBaseScore = async (
  db: DbOrTransaction,
  collectionName: VoteableCollectionName,
  document: VoteableDocument,
) => {
  if (collectionName !== "Posts") {
    return;
  }

  const post = document as Post;
  if (post.baseScore > (post.maxBaseScore || 0)) {
    const updates: Partial<Post> = {
      maxBaseScore: post.baseScore,
    };

    const now = new Date().toISOString();
    if (!post.scoreExceeded2Date && post.baseScore >= 2) {
      updates.scoreExceeded2Date = now;
    }
    if (!post.scoreExceeded30Date && post.baseScore >= 30) {
      updates.scoreExceeded30Date = now;
    }
    if (!post.scoreExceeded45Date && post.baseScore >= 45) {
      updates.scoreExceeded45Date = now;
    }
    if (!post.scoreExceeded75Date && post.baseScore >= 75) {
      updates.scoreExceeded75Date = now;
    }
    if (!post.scoreExceeded125Date && post.baseScore >= 125) {
      updates.scoreExceeded125Date = now;
    }
    if (!post.scoreExceeded200Date && post.baseScore >= 200) {
      updates.scoreExceeded200Date = now;
    }

    await db.update(posts).set(updates).where(eq(posts._id, document._id));
  }
};

export const triggerCommentAutomod = async (
  db: DbOrTransaction,
  collectionName: VoteableCollectionName,
  document: VoteableDocument,
) => {
  if (collectionName !== "Comments") {
    return;
  }
  const commentId = document._id;
  const previousCommentModeratorActions =
    await db.query.commentModeratorActions.findMany({
      columns: {
        _id: true,
      },
      where: {
        commentId,
        type: commentModeratorActionType("downvotedCommentAlert"),
      },
      orderBy: { createdAt: "desc" },
    });
  const needsModeration = isDownvotedBelowBar(document, -10);
  if (previousCommentModeratorActions.length < 1 && needsModeration) {
    void createCommentModeratorAction(db, commentId, "downvotedCommentAlert");
  }
};

export const updatePostDenormalizedTags = async (
  txn: DbOrTransaction,
  collectionName: VoteableCollectionName,
  document: VoteableDocument,
) => {
  if (collectionName !== "TagRels") {
    return;
  }

  const postId = (document as TagRel).postId;
  const tagRels = await txn.query.tagRels.findMany({
    columns: {
      tagId: true,
      baseScore: true,
    },
    where: {
      postId,
      deleted: false,
    },
  });

  const tagRelevance: Record<string, number> = {};
  for (const tagRel of tagRels) {
    if (tagRel.baseScore > 0) {
      tagRelevance[tagRel.tagId] = tagRel.baseScore;
    }
  }

  await txn.update(posts).set({ tagRelevance }).where(eq(posts._id, postId));
};
