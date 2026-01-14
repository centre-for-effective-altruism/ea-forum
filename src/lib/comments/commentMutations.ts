"use server";

import type { EditorData } from "../ckeditor/editorHelpers";
import type { CurrentUser } from "../users/currentUser";
import { db } from "../db";
import { randomId } from "../utils/random";
import { comments } from "../schema";
import { createRevision } from "../revisions/revisionMutations";
import { denormalizeRevision } from "../revisions/revisionHelpers";
import { elasticSyncDocument } from "../search/elastic/elasticSync";
import { performVote } from "../votes/voteMutations";
import {
  updateCommentPost,
  updateCommentTag,
  updateDescendentCommentCounts,
  updateReadStatusAfterComment,
} from "./commentCallbacks";

const MINIMUM_APPROVAL_KARMA = 5;

export const createPostComment = async ({
  user,
  postId,
  parentCommentId,
  data,
  draft,
  userAgent,
  referrer,
}: {
  user: CurrentUser;
  postId: string;
  parentCommentId: string | null;
  data: EditorData;
  draft?: false;
  userAgent: string | null;
  referrer: string | null;
}) => {
  const { originalContents } = data;
  if (originalContents.type !== "ckEditorMarkup") {
    throw new Error("Invalid editor type");
  }
  if (!originalContents.data) {
    throw new Error("Comment is empty");
  }

  const [post, parentComment] = await Promise.all([
    db.query.posts.findFirst({
      columns: {
        _id: true,
      },
      with: {
        contents: {
          columns: {
            version: true,
          },
        },
      },
      where: {
        _id: postId,
      },
    }),
    parentCommentId
      ? db.query.comments.findFirst({
          columns: {
            _id: true,
            topLevelCommentId: true,
            answer: true,
            parentAnswerId: true,
            tagId: true,
            tagCommentType: true,
          },
          where: {
            _id: parentCommentId,
          },
        })
      : null,
  ]);
  if (!post) {
    throw new Error("Post not found");
  }
  if (parentCommentId && !parentComment) {
    throw new Error("Parent comment not found");
  }

  const commentId = randomId();
  await db.transaction(async (txn) => {
    const revision = await createRevision(txn, user, data, {
      documentId: commentId,
      collectionName: "Comments",
      fieldName: "contents",
      draft,
    });

    // TODO: Create shortform post if needed
    // TODO: shortform, shortformFrontpage, spam, needsReview, relevantTagIds

    const now = new Date().toISOString();
    const insert = await txn
      .insert(comments)
      .values({
        _id: commentId,
        postId: post._id,
        userId: user._id,
        author: user.displayName || user.username,
        userAgent,
        referrer,
        authorIsUnreviewed:
          !user?.reviewedByUserId && user.karma < MINIMUM_APPROVAL_KARMA,
        draft,
        parentCommentId,
        topLevelCommentId: parentComment?.topLevelCommentId ?? parentCommentId,
        parentAnswerId:
          parentComment?.parentAnswerId ??
          (parentComment?.answer ? parentCommentId : null),
        contents: denormalizeRevision(revision),
        contentsLatest: revision._id,
        postVersion: post.contents?.version || "1.0.0",
        postedAt: now,
        createdAt: now,
        lastEditedAt: now,
        lastSubthreadActivity: now,
      })
      .returning();
    const comment = insert[0];

    await Promise.all([
      updateCommentPost(txn, comment),
      updateCommentTag(txn, comment),
      updateReadStatusAfterComment(txn, comment),
      updateDescendentCommentCounts(txn, comment),
      performVote({
        txn,
        collectionName: "Comments",
        document: comment,
        user,
        voteType: "smallUpvote",
        skipRateLimits: true,
      }),
    ]);

    // TODO:
    // handleForumEventMetadataNew
    // notifyUsersOfPingbackMentions
    // upsertPolls
    // updateCountOfReferencesOnOtherCollectionsAfterCreate
    // lwCommentsNewUpvoteOwnComment
    // checkCommentForSpamWithAkismet
    // newCommentTriggerReview
    // trackCommentRateLimitHit
    // checkModGPTOnCommentCreate
    // commentsNewNotifications
    // uploadImagesInEditableFields
  });

  void elasticSyncDocument("Comments", commentId);

  return commentId;
};
