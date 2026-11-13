import "server-only";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import countBy from "lodash/countBy";
import uniq from "lodash/uniq";
import uniqBy from "lodash/uniqBy";
import { db, type Transaction } from "../db";
import {
  bans,
  type Comment,
  comments,
  notifications,
  posts,
  reports,
  revisions,
  sequences,
  tags,
  userLoginTokens,
  users,
  votes,
} from "../schema";
import { randomId } from "../utils/random";
import { filterNonNull } from "../typeHelpers";
import { addTime } from "../timeUtils";
import { mapInBatches } from "../utils/asyncUtils";
import { commentIsPublic } from "../comments/commentHelpers";
import { logFieldChanges } from "../fieldChanges";
import { postGetPageUrl, postStatuses } from "../posts/postsHelpers";
import { akismetReportSpam } from "../akismet";
import { elasticSyncDocument } from "../search/elastic/elasticSync";
import type { SearchIndexCollectionName } from "../search/elastic/elasticIndexes";
import type { CurrentUser } from "./currentUser";
import { clearVotes } from "../votes/voteMutations";
import {
  fetchVoteableDocumentAuthors,
  getVoteableDocument,
  voteableCollectionNameSchema,
  voteableSchemas,
} from "../votes/voteableDocument";

export const nullifyVotesForUser = async (userId: string) => {
  const user = await db.query.users.findFirst({ where: { _id: userId } });
  if (!user) {
    throw new Error("User not found");
  }
  const votedDocuments = await db
    .selectDistinct({
      collectionName: votes.collectionName,
      documentId: votes.documentId,
    })
    .from(votes)
    .where(
      and(
        eq(votes.userId, userId),
        eq(votes.cancelled, false),
        inArray(votes.collectionName, voteableCollectionNameSchema.options),
      ),
    );
  for (const { collectionName, documentId } of votedDocuments) {
    const voteableCollectionName =
      voteableCollectionNameSchema.parse(collectionName);
    const document = await getVoteableDocument(voteableCollectionName, documentId);
    if (!document) {
      continue;
    }
    await db.transaction(async (txn) => {
      await clearVotes({
        collectionName: voteableCollectionName,
        schema: voteableSchemas[voteableCollectionName],
        document,
        authors: await fetchVoteableDocumentAuthors(txn, document),
        user,
        silenceNotification: true,
        txn,
      });
    });
  }
};

const elasticSyncBatchSize = 20;

const tagRevisionLatestColumns = {
  description: "descriptionLatest",
  subforumWelcomeText: "subforumWelcomeTextLatest",
  moderationGuidelines: "moderationGuidelinesLatest",
} as const;

const isTagRevisionField = (
  fieldName: string | null,
): fieldName is keyof typeof tagRevisionLatestColumns =>
  !!fieldName && fieldName in tagRevisionLatestColumns;

const deleteUserTagsAndRevisions = async (
  txn: Transaction,
  currentUser: CurrentUser,
  userId: string,
) => {
  const deletedTags = await txn
    .update(tags)
    .set({ deleted: true })
    .where(and(eq(tags.userId, userId), eq(tags.deleted, false)))
    .returning();
  await logFieldChanges(
    txn,
    currentUser._id,
    deletedTags.map(({ _id }) => ({
      documentId: _id,
      fieldName: "deleted",
      oldValue: false,
      newValue: true,
    })),
  );

  const tagRevisions = await txn.query.revisions.findMany({
    columns: {
      documentId: true,
      fieldName: true,
    },
    where: {
      userId,
      collectionName: "Tags",
    },
  });
  await txn.delete(revisions).where(eq(revisions.userId, userId));

  const revertedFields = uniqBy(
    tagRevisions,
    ({ documentId, fieldName }) => `${documentId}:${fieldName}`,
  );
  for (const { documentId, fieldName } of revertedFields) {
    if (!documentId || !isTagRevisionField(fieldName)) {
      continue;
    }
    const latestRevision = await txn.query.revisions.findFirst({
      columns: {
        _id: true,
      },
      where: {
        documentId,
        collectionName: "Tags",
        fieldName,
        draft: { NOT: true },
      },
      orderBy: {
        editedAt: "desc",
      },
    });
    await txn
      .update(tags)
      .set({ [tagRevisionLatestColumns[fieldName]]: latestRevision?._id ?? null })
      .where(eq(tags._id, documentId));
  }

  return deletedTags.map(({ _id }) => _id);
};

type PurgeableComment = Pick<
  Comment,
  | "_id"
  | "postId"
  | "deleted"
  | "rejected"
  | "debateResponse"
  | "authorIsUnreviewed"
  | "draft"
>;

const commentIncludedInCounts = (comment: PurgeableComment) =>
  commentIsPublic(comment) && !comment.debateResponse;

const softDeleteComments = async (
  txn: Transaction,
  currentUser: CurrentUser,
  userComments: PurgeableComment[],
) => {
  const commentsToDelete = userComments.filter((comment) => !comment.deleted);
  if (!commentsToDelete.length) {
    return [];
  }
  const commentIds = commentsToDelete.map(({ _id }) => _id);

  await txn.execute(sql`
    WITH RECURSIVE "ancestors" AS (
      SELECT "parentCommentId" AS "ancestorId"
      FROM "Comments"
      WHERE "_id" IN ${commentIds} AND "parentCommentId" IS NOT NULL
      UNION ALL
      SELECT c."parentCommentId"
      FROM "ancestors" a
      INNER JOIN "Comments" c ON c."_id" = a."ancestorId"
      WHERE c."parentCommentId" IS NOT NULL
    )
    UPDATE "Comments" c
    SET "descendentCount" = GREATEST(0, c."descendentCount" - a."count")
    FROM (
      SELECT "ancestorId", COUNT(*) AS "count"
      FROM "ancestors"
      GROUP BY "ancestorId"
    ) a
    WHERE c."_id" = a."ancestorId"
  `);

  const countedCommentPostIds = filterNonNull(
    commentsToDelete.filter(commentIncludedInCounts).map(({ postId }) => postId),
  );
  const commentCountDecrements = Object.entries(countBy(countedCommentPostIds));
  if (commentCountDecrements.length) {
    await txn.execute(sql`
      UPDATE "Posts" p
      SET "commentCount" = GREATEST(0, p."commentCount" - d."count")
      FROM (VALUES ${sql.join(
        commentCountDecrements.map(
          ([postId, count]) => sql`(${postId}, ${count}::DOUBLE PRECISION)`,
        ),
        sql`, `,
      )}) AS d("postId", "count")
      WHERE p."_id" = d."postId"
    `);
  }

  const deletedDate = new Date().toISOString();
  await txn
    .update(comments)
    .set({ deleted: true, deletedDate })
    .where(inArray(comments._id, commentIds));

  const affectedPostIds = uniq(
    filterNonNull(commentsToDelete.map(({ postId }) => postId)),
  );
  if (affectedPostIds.length) {
    await txn
      .update(posts)
      .set({
        lastCommentedAt: sql`COALESCE(
          (
            SELECT MAX(c."postedAt")
            FROM "Comments" c
            WHERE c."postId" = ${posts._id}
              AND c."deleted" IS NOT TRUE
              AND c."debateResponse" IS NOT TRUE
          ),
          ${posts.postedAt}
        )`,
      })
      .where(inArray(posts._id, affectedPostIds));
  }

  await logFieldChanges(
    txn,
    currentUser._id,
    commentsToDelete.flatMap(({ _id }) => [
      { documentId: _id, fieldName: "deleted", oldValue: false, newValue: true },
      {
        documentId: _id,
        fieldName: "deletedDate",
        oldValue: null,
        newValue: deletedDate,
      },
    ]),
  );

  return commentIds;
};

type PurgedPost = {
  _id: string;
  slug: string;
  contents: { html: string | null } | null;
};

const reportPurgedContentAsSpam = async (
  userId: string,
  purgedPosts: PurgedPost[],
  commentIds: string[],
) => {
  const [user, purgedComments] = await Promise.all([
    db.query.users.findFirst({
      columns: { _id: true, displayName: true, email: true },
      where: { _id: userId },
    }),
    commentIds.length
      ? db.query.comments.findMany({
          columns: {},
          extras: {
            html: (comments, { sql }) =>
              sql<string | null>`${comments}."contents"->>'html'`,
          },
          where: { _id: { in: commentIds } },
        })
      : [],
  ]);
  if (!user) {
    return;
  }
  await akismetReportSpam(db, user, [
    ...purgedPosts.map((post) => ({
      html: post.contents?.html ?? null,
      postUrl: postGetPageUrl({ post, isAbsolute: true }),
    })),
    ...purgedComments,
  ]);
};

const elasticSyncDocuments = (documents: [SearchIndexCollectionName, string[]][]) =>
  mapInBatches(
    documents.flatMap(([collectionName, ids]) =>
      ids.map((id) => [collectionName, id] as const),
    ),
    elasticSyncBatchSize,
    ([collectionName, id]) => elasticSyncDocument(collectionName, id),
  );

export const deleteUserContent = async (
  currentUser: CurrentUser,
  userId: string,
) => {
  const { userPosts, postIds, deletedCommentIds, sequenceIds, deletedTagIds } =
    await db.transaction(async (txn) => {
      const userPosts = await txn.query.posts.findMany({
        columns: { _id: true, slug: true, status: true },
        with: { contents: { columns: { html: true } } },
        where: { userId },
      });
      const postIds = userPosts.map(({ _id }) => _id);
      if (postIds.length) {
        await txn
          .update(posts)
          .set({ status: postStatuses.STATUS_DELETED })
          .where(inArray(posts._id, postIds));
        await logFieldChanges(
          txn,
          currentUser._id,
          userPosts.map(({ _id, status }) => ({
            documentId: _id,
            fieldName: "status",
            oldValue: status,
            newValue: postStatuses.STATUS_DELETED,
          })),
        );
      }

      const userComments = await txn.query.comments.findMany({
        columns: {
          _id: true,
          postId: true,
          deleted: true,
          rejected: true,
          debateResponse: true,
          authorIsUnreviewed: true,
          draft: true,
        },
        where: {
          userId,
        },
      });
      const deletedCommentIds = await softDeleteComments(
        txn,
        currentUser,
        userComments,
      );

      const contentIds = [...postIds, ...userComments.map(({ _id }) => _id)];
      if (contentIds.length) {
        await txn
          .update(notifications)
          .set({ deleted: true })
          .where(inArray(notifications.documentId, contentIds));
        await txn
          .update(reports)
          .set({ closedAt: new Date().toISOString() })
          .where(
            and(
              isNull(reports.closedAt),
              or(
                inArray(reports.postId, contentIds),
                inArray(reports.commentId, contentIds),
              ),
            ),
          );
      }

      const userSequences = await txn
        .update(sequences)
        .set({ isDeleted: true })
        .where(and(eq(sequences.userId, userId), eq(sequences.isDeleted, false)))
        .returning();
      const sequenceIds = userSequences.map(({ _id }) => _id);
      await logFieldChanges(
        txn,
        currentUser._id,
        sequenceIds.map((_id) => ({
          documentId: _id,
          fieldName: "isDeleted",
          oldValue: false,
          newValue: true,
        })),
      );

      const deletedTagIds = await deleteUserTagsAndRevisions(
        txn,
        currentUser,
        userId,
      );

      await txn
        .update(users)
        .set({
          postCount: 0,
          commentCount: 0,
          sequenceCount: 0,
          sequenceDraftCount: 0,
        })
        .where(eq(users._id, userId));

      return { userPosts, postIds, deletedCommentIds, sequenceIds, deletedTagIds };
    });

  await Promise.all([
    elasticSyncDocuments([
      ["Posts", postIds],
      ["Comments", deletedCommentIds],
      ["Sequences", sequenceIds],
      ["Tags", deletedTagIds],
    ]),
    reportPurgedContentAsSpam(userId, userPosts, deletedCommentIds),
  ]);
};

export const banUserIpsAndResetLoginTokens = async (userId: string) => {
  const loginEvents = await db.query.lwEvents.findMany({
    columns: {
      properties: true,
    },
    where: {
      userId,
      name: "login",
    },
    orderBy: {
      createdAt: "desc",
    },
    limit: 10,
  });
  const ips = uniq(
    loginEvents
      .map(({ properties }) => properties?.ip)
      .filter((ip): ip is string => typeof ip === "string" && !!ip),
  );

  await db.transaction(async (txn) => {
    if (ips.length) {
      const expirationDate = addTime(new Date(), 1, "days");
      await txn.insert(bans).values(
        ips.map((ip) => ({
          _id: randomId(),
          expirationDate: expirationDate.toISOString(),
          userId,
          reason: "User account banned",
          comment: "Automatic IP ban",
          ip,
        })),
      );
    }
    await txn
      .update(users)
      .set({
        services: sql`JSONB_SET(
          ${users.services},
          '{resume, loginTokens}'::TEXT[],
          '[]'::JSONB,
          TRUE
        )`,
      })
      .where(eq(users._id, userId));
  });

  await db.refreshMaterializedView(userLoginTokens).concurrently();
};

export const reindexUserContent = async (userId: string) => {
  const [userPosts, userComments, userSequences] = await Promise.all([
    db.select({ _id: posts._id }).from(posts).where(eq(posts.userId, userId)),
    db
      .select({ _id: comments._id })
      .from(comments)
      .where(eq(comments.userId, userId)),
    db
      .select({ _id: sequences._id })
      .from(sequences)
      .where(eq(sequences.userId, userId)),
  ]);
  const ids = (rows: { _id: string }[]) => rows.map(({ _id }) => _id);
  await elasticSyncDocuments([
    ["Posts", ids(userPosts)],
    ["Comments", ids(userComments)],
    ["Sequences", ids(userSequences)],
  ]);
};
