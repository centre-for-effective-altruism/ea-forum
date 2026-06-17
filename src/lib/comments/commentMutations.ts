import "server-only";
import type { CurrentUser } from "../users/currentUser";
import { fetchCommentsListItem, type CommentListItem } from "./commentLists";
import type { ForumEventCommentMetadata } from "../forumEvents/forumEventHelpers";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { randomId } from "../utils/random";
import { comments } from "../schema";
import { createRevision } from "../revisions/revisionMutations";
import { denormalizeRevision, getNextVersion } from "../revisions/revisionHelpers";
import { htmlToPingbacks, notifyUsersOfPingbackMentions } from "../pingbacks";
import { elasticSyncDocument } from "../search/elastic/elasticSync";
import { fetchPostForCommentCreation } from "./commentQueries";
import { convertImagesInObject } from "../cloudinary/convertImagesToCloudinary";
import { triggerReviewIfNeededById } from "../users/userReview";
import { upsertPolls } from "../forumEvents/forumEventMutations";
import { performVote } from "../votes/voteMutations";
import { createShortformPost } from "../posts/postMutations";
import { isEditorTypeString, EditorData } from "../ckeditor/editorHelpers";
import {
  MINIMUM_APPROVAL_KARMA,
  userCanDo,
  userIsAdminOrMod,
  userOwns,
} from "../users/userHelpers";
import {
  userCanModerateComment,
  userCanPinCommentOnProfile,
} from "./commentHelpers";
import { logFieldChanges } from "../fieldChanges";
import {
  updateCommentForumEvent,
  checkCommentForSpam,
  checkCommentRateLimits,
  updateCommentAuthor,
  updateCommentPost,
  updateCommentTag,
  updateDescendentCommentCounts,
  updateReadStatusAfterComment,
  newCommentNotifications,
  runPangramOnComment,
} from "./commentCallbacks";

const validateEditorContents = (
  editorData: EditorData,
  shortform?: boolean | null,
) => {
  const { originalContents } = editorData;
  if (!isEditorTypeString(originalContents.type)) {
    throw new Error("Invalid editor type");
  }
  if (!originalContents.data) {
    throw new Error(shortform ? "Quick take is empty" : "Comment is empty");
  }
};

export const createPostComment = async ({
  user,
  postId,
  shortform = false,
  parentCommentId,
  editorData,
  draft,
  shortformFrontpage,
  relevantTagIds,
  forumEventId,
  forumEventMetadata,
}: {
  user: CurrentUser;
  postId?: string;
  shortform?: boolean;
  parentCommentId: string | null;
  editorData: EditorData;
  draft?: boolean;
  shortformFrontpage?: boolean;
  relevantTagIds?: string[];
  forumEventId?: string;
  forumEventMetadata?: ForumEventCommentMetadata;
}) => {
  if (user.banned) {
    throw new Error("Banned");
  }
  if (!postId && !shortform) {
    throw new Error("No post provided");
  }
  validateEditorContents(editorData, shortform);

  // eslint-disable-next-line prefer-const
  let [post, parentComment] = await Promise.all([
    fetchPostForCommentCreation({ txn: db, postId, shortform, userId: user._id }),
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
    post = await fetchPostForCommentCreation({
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
  const [revision, comment] = await db.transaction(async (txn) => {
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
        shortformFrontpage,
        relevantTagIds,
        forumEventId,
        forumEventMetadata,
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
    return [revision, comment];
  });

  void checkCommentForSpam(db, user, commentId, revision, post);
  void triggerReviewIfNeededById(user._id);
  void newCommentNotifications(commentId);
  void notifyUsersOfPingbackMentions(user, "Comments", comment);
  void runPangramOnComment(user, revision._id);

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

export const updateComment = async ({
  user,
  commentId,
  editorData,
}: {
  user: CurrentUser;
  commentId: string;
  editorData: EditorData;
}) => {
  if (user.banned) {
    throw new Error("Banned");
  }

  const oldComment = await db.query.comments.findFirst({
    columns: {
      _id: true,
      userId: true,
      postId: true,
      shortform: true,
      draft: true,
      contents: true,
      pingbacks: true,
    },
    where: {
      _id: commentId,
    },
  });
  if (!oldComment) {
    throw new Error("Comment not found");
  }

  validateEditorContents(editorData, oldComment.shortform);

  const post = await fetchPostForCommentCreation({
    txn: db,
    postId: oldComment.postId ?? undefined,
    shortform: oldComment.shortform ?? false,
    userId: user._id,
  });
  if (!post) {
    throw new Error("Post not found");
  }

  const [revision, updatedComment] = await db.transaction(async (txn) => {
    const revision = await createRevision(txn, user, editorData, {
      documentId: commentId,
      collectionName: "Comments",
      fieldName: "contents",
      draft: oldComment.draft,
      version: getNextVersion(
        oldComment.contents,
        editorData.updateType,
        oldComment.draft,
      ),
    });
    const pingbacks = revision.html ? await htmlToPingbacks(revision.html) : null;

    const [updatedComment] = await txn
      .update(comments)
      .set({
        contents: denormalizeRevision(revision),
        contentsLatest: revision._id,
        pingbacks,
        lastEditedAt: new Date().toISOString(),
      })
      .where(eq(comments._id, commentId))
      .returning();

    await Promise.all([
      updateCommentForumEvent(txn, updatedComment),
      upsertPolls({ txn, user, revision, post, comment: updatedComment }),
    ]);

    return [revision, updatedComment];
  });

  void checkCommentForSpam(db, user, commentId, revision, post);
  void notifyUsersOfPingbackMentions(user, "Comments", updatedComment, oldComment);
  void runPangramOnComment(user, revision._id);

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
};

export const updateCommentPinnedOnProfile = async (
  currentUser: CurrentUser,
  commentId: string,
  isPinnedOnProfile: boolean,
) => {
  const result = await db.transaction(async (txn) => {
    const comment = await txn.query.comments.findFirst({
      columns: {
        userId: true,
        isPinnedOnProfile: true,
      },
      where: {
        _id: commentId,
      },
    });
    if (!comment) {
      throw new Error("Comment not found");
    }
    if (isPinnedOnProfile === comment.isPinnedOnProfile) {
      return;
    }
    if (!userCanPinCommentOnProfile(currentUser, comment)) {
      throw new Error("You do not have permission to do this");
    }
    await Promise.all([
      txn
        .update(comments)
        .set({ isPinnedOnProfile })
        .where(eq(comments._id, commentId)),
      logFieldChanges(txn, currentUser._id, {
        documentId: commentId,
        fieldName: "isPinnedOnProfile",
        oldValue: comment.isPinnedOnProfile,
        newValue: isPinnedOnProfile,
      }),
    ]);
    return isPinnedOnProfile;
  });
  return result;
};

export const updateQuickTakeFrontpage = async (
  currentUser: CurrentUser,
  commentId: string,
  shortformFrontpage: boolean,
) => {
  const result = await db.transaction(async (txn) => {
    const comment = await txn.query.comments.findFirst({
      columns: {
        userId: true,
        shortform: true,
        shortformFrontpage: true,
      },
      where: {
        _id: commentId,
      },
    });
    if (!comment) {
      throw new Error("Comment not found");
    }
    if (!comment.shortform) {
      throw new Error("Comment is not a quick take");
    }
    if (shortformFrontpage === comment.shortformFrontpage) {
      return;
    }
    if (
      !userCanDo(currentUser, "comments.edit.all") &&
      !userOwns(currentUser, comment)
    ) {
      throw new Error("You do not have permission to do this");
    }
    await Promise.all([
      txn
        .update(comments)
        .set({ shortformFrontpage })
        .where(eq(comments._id, commentId)),
      logFieldChanges(txn, currentUser._id, {
        documentId: commentId,
        fieldName: "shortformFrontpage",
        oldValue: comment.shortformFrontpage,
        newValue: shortformFrontpage,
      }),
    ]);
    return shortformFrontpage;
  });
  return result;
};

export const deleteComment = async ({
  user,
  commentId,
  withoutTrace,
  reason,
}: {
  user: CurrentUser;
  commentId: string;
  withoutTrace?: boolean;
  reason?: string;
}): Promise<CommentListItem> => {
  const comment = await fetchCommentsListItem({ currentUser: user, commentId });
  if (!comment) {
    throw new Error("Comment not found");
  }
  if (!userCanModerateComment(user, comment)) {
    throw new Error("Permission denied");
  }
  if (comment.deleted) {
    throw new Error("This comment is already deleted");
  }

  await db
    .update(comments)
    .set({
      deleted: true,
      deletedPublic: !withoutTrace,
      deletedReason: reason,
      deletedDate: new Date().toISOString(),
      deletedByUserId: user._id,
    })
    .where(eq(comments._id, commentId));

  void elasticSyncDocument("Comments", commentId);
  return await fetchCommentsListItem({ currentUser: user, commentId });
};

export const undeleteComment = async ({
  user,
  commentId,
}: {
  user: CurrentUser;
  commentId: string;
}): Promise<CommentListItem> => {
  const comment = await fetchCommentsListItem({ currentUser: user, commentId });
  if (!comment) {
    throw new Error("Comment not found");
  }
  if (!userCanModerateComment(user, comment)) {
    throw new Error("Permission denied");
  }
  if (!userIsAdminOrMod(user) && comment.deletedBy?._id !== user._id) {
    throw new Error("You cannot undo deletion of a comment deleted by someone else");
  }

  await db
    .update(comments)
    .set({
      deleted: false,
      deletedPublic: false,
      deletedReason: null,
      deletedDate: null,
      deletedByUserId: null,
    })
    .where(eq(comments._id, commentId));

  void elasticSyncDocument("Comments", commentId);
  return await fetchCommentsListItem({ currentUser: user, commentId });
};
