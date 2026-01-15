"use server";

import type { EditorData } from "../ckeditor/editorHelpers";
import type { CurrentUser } from "../users/currentUser";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { randomId } from "../utils/random";
import { comments } from "../schema";
import { createRevision } from "../revisions/revisionMutations";
import { denormalizeRevision } from "../revisions/revisionHelpers";
import { htmlToPingbacks } from "../pingbacks";
import { elasticSyncDocument } from "../search/elastic/elasticSync";
import { getPostForCommentCreation } from "./commentQueries";
import { convertImagesInObject } from "../cloudinary/convertImagesToCloudinary";
import { triggerReviewIfNeededById } from "../users/userReview";
import { performVote } from "../votes/voteMutations";
import {
  addForumEventSticker,
  checkCommentForSpam,
  checkCommentRateLimits,
  updateCommentAuthor,
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
    getPostForCommentCreation(db, postId),
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
  const revision = await db.transaction(async (txn) => {
    const revision = await createRevision(txn, user, data, {
      documentId: commentId,
      collectionName: "Comments",
      fieldName: "contents",
      draft,
    });
    const pingbacks = revision.html ? await htmlToPingbacks(revision.html) : null;

    // TODO: Create shortform post if needed
    // shortform, shortformFrontpage, relevantTagIds

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
        pingbacks,
        postVersion: post.contents?.version || "1.0.0",
        postedAt: now,
        createdAt: now,
        lastEditedAt: now,
        lastSubthreadActivity: now,
      })
      .returning();
    const comment = insert[0];

    // TODO: A lot of these callbacks shouldn't be run on draft comments
    await Promise.all([
      updateCommentPost(txn, comment),
      updateCommentTag(txn, comment),
      updateCommentAuthor(txn, comment),
      updateReadStatusAfterComment(txn, comment),
      updateDescendentCommentCounts(txn, comment),
      checkCommentRateLimits(txn, user, comment),
      addForumEventSticker(txn, comment),
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
    // upsertPolls

    return revision;
  });

  await checkCommentForSpam(db, user, commentId, revision, post);

  void triggerReviewIfNeededById(user._id);

  // TODO: Notifications:
  // commentsNewNotifications
  // notifyUsersOfPingbackMentions

  // This is potentially slow - do it outside of the transaction to avoid
  // keeping a lock
  const { newRevision } = await convertImagesInObject(db, revision);
  if (newRevision) {
    await db
      .update(comments)
      .set({
        contentsLatest: newRevision._id,
        contents: denormalizeRevision(newRevision),
      })
      .where(eq(comments._id, commentId));
  }

  void elasticSyncDocument("Comments", commentId);

  return commentId;
};
