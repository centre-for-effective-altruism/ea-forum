import "server-only";
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
import { upsertPolls } from "../forumEvents/forumEventMutations";
import { performVote } from "../votes/voteMutations";
import { createShortformPost } from "../posts/postMutations";
import { MINIMUM_APPROVAL_KARMA } from "../users/userHelpers";
import {
  updateCommentForumEvent,
  checkCommentForSpam,
  checkCommentRateLimits,
  updateCommentAuthor,
  updateCommentPost,
  updateCommentTag,
  updateDescendentCommentCounts,
  updateReadStatusAfterComment,
} from "./commentCallbacks";

export const createPostComment = async ({
  user,
  postId,
  shortform = false,
  parentCommentId,
  editorData,
  draft,
}: {
  user: CurrentUser;
  postId?: string;
  shortform?: boolean;
  parentCommentId: string | null;
  editorData: EditorData;
  draft?: boolean;
}) => {
  if (user.banned) {
    throw new Error("Banned");
  }

  const { originalContents } = editorData;
  if (originalContents.type !== "ckEditorMarkup") {
    throw new Error("Invalid editor type");
  }
  if (!originalContents.data) {
    throw new Error(shortform ? "Quick take is empty" : "Comment is empty");
  }
  if (!postId && !shortform) {
    throw new Error("No post provided");
  }

  // eslint-disable-next-line prefer-const
  let [post, parentComment] = await Promise.all([
    getPostForCommentCreation({ txn: db, postId, shortform, userId: user._id }),
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
    if (!shortform) {
      throw new Error("Post not found");
    }
    await createShortformPost(user);
    post = await getPostForCommentCreation({
      txn: db,
      postId,
      shortform,
      userId: user._id,
    });
    if (!post) {
      throw new Error("Failed to create quick takes post");
    }
  }

  if (parentCommentId && !parentComment) {
    throw new Error("Parent comment not found");
  }

  const commentId = randomId();
  const revision = await db.transaction(async (txn) => {
    const revision = await createRevision(txn, user, editorData, {
      documentId: commentId,
      collectionName: "Comments",
      fieldName: "contents",
      draft,
    });
    const pingbacks = revision.html ? await htmlToPingbacks(revision.html) : null;

    const now = new Date().toISOString();
    const [comment] = await txn
      .insert(comments)
      .values({
        _id: commentId,
        postId: post._id,
        userId: user._id,
        author: user.displayName || user.username,
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
        shortform,
        // TODO: shortformFrontpage, relevantTagIds
        shortformFrontpage: true,
        postedAt: now,
        createdAt: now,
        lastEditedAt: now,
        lastSubthreadActivity: now,
      })
      .returning();

    // TODO: A lot of these callbacks shouldn't be run on draft comments
    await Promise.all([
      updateCommentPost(txn, comment),
      updateCommentTag(txn, comment),
      updateCommentAuthor(txn, comment),
      updateReadStatusAfterComment(txn, comment),
      updateDescendentCommentCounts(txn, comment),
      checkCommentRateLimits(txn, user, comment),
      updateCommentForumEvent(txn, comment),
      upsertPolls({ txn, user, revision, post, comment }),
      performVote({
        txn,
        collectionName: "Comments",
        document: comment,
        user,
        voteType: "smallUpvote",
        skipRateLimits: true,
      }),
    ]);
    return revision;
  });

  void checkCommentForSpam(db, user, commentId, revision, post);
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
