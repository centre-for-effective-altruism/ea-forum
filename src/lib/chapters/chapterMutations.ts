import { waitUntil } from "@vercel/functions";
import { ORPCError } from "@orpc/server";
import isUndefined from "lodash/isUndefined";
import omitBy from "lodash/omitBy";
import uniq from "lodash/uniq";
import difference from "lodash/difference";
import type { CurrentUser } from "../users/currentUser";
import { db, type DbOrTransaction } from "../db";
import { chapters } from "../schema";
import { updateWithFieldChanges } from "../fieldChanges";
import { getDenormalizedContentsUpdate } from "../revisions/revisionMutations";
import { denormalizedContentsVersion } from "../revisions/revisionHelpers";
import { randomId } from "../utils/random";
import {
  ChapterEditData,
  getForbiddenChapterEditFields,
  userCanEditSequence,
} from "../sequences/sequenceHelpers";
import {
  bumpSequenceLastUpdated,
  canonizeChapterPostInfo,
  notifyUsersOfNewSequencePosts,
  updateSequenceLastUpdated,
} from "./chapterCallbacks";

type InsertChapter = typeof chapters.$inferInsert;

const assertCanEditChapters = async (
  txn: DbOrTransaction,
  currentUser: CurrentUser,
  sequenceId: string | null,
  data: ChapterEditData,
) => {
  const sequence = sequenceId
    ? await txn.query.sequences.findFirst({
        columns: { _id: true, userId: true, isDeleted: true, draft: true },
        where: { _id: sequenceId },
      })
    : null;
  if (!sequence || sequence.isDeleted) {
    throw new ORPCError("NOT_FOUND", { message: "Sequence not found" });
  }
  if (!userCanEditSequence(currentUser, sequence)) {
    throw new ORPCError("FORBIDDEN", { message: "Permission denied" });
  }
  const forbiddenFields = getForbiddenChapterEditFields(currentUser, data);
  if (forbiddenFields.length) {
    throw new ORPCError("FORBIDDEN", {
      message: `You can't edit: ${forbiddenFields.join(", ")}`,
    });
  }
  return sequence;
};

const validatePostIds = async (txn: DbOrTransaction, requestedPostIds: string[]) => {
  const postIds = uniq(requestedPostIds);
  const existingPosts = postIds.length
    ? await txn.query.posts.findMany({
        columns: { _id: true, draft: true, deletedDraft: true },
        where: { _id: { in: postIds } },
      })
    : [];
  const unknownPostIds = difference(
    postIds,
    existingPosts.map(({ _id }) => _id),
  );
  if (unknownPostIds.length) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Unknown post ids: ${unknownPostIds.join(", ")}`,
    });
  }
  const publishedPostIds = existingPosts
    .filter(({ draft, deletedDraft }) => !draft && !deletedDraft)
    .map(({ _id }) => _id);
  return { postIds, publishedPostIds };
};

const getNotifiablePostIds = (
  sequence: { draft: boolean },
  { postIds, publishedPostIds }: { postIds: string[]; publishedPostIds: string[] },
  previousPostIds: string[],
) =>
  sequence.draft
    ? []
    : difference(postIds, previousPostIds).filter((postId) =>
        publishedPostIds.includes(postId),
      );

const getNextChapterNumber = async (txn: DbOrTransaction, sequenceId: string) => {
  const existingChapters = await txn.query.chapters.findMany({
    columns: { number: true },
    where: { sequenceId },
  });
  const numbers = existingChapters.flatMap(({ number }) => number ?? []);
  return Math.max(...numbers, existingChapters.length) + 1;
};

export const createChapter = async (
  currentUser: CurrentUser,
  sequenceId: string,
  data: ChapterEditData,
) => {
  const chapterId = randomId();
  const { contents, postIds: requestedPostIds, ...fields } = data;
  const notifiablePostIds = await db.transaction(async (txn) => {
    const sequence = await assertCanEditChapters(txn, currentUser, sequenceId, data);
    const validatedPosts = await validatePostIds(txn, requestedPostIds ?? []);
    const { postIds } = validatedPosts;
    const chapter: InsertChapter = {
      ...omitBy(fields, isUndefined),
      _id: chapterId,
      sequenceId,
      postIds,
      number: fields.number ?? (await getNextChapterNumber(txn, sequenceId)),
      ...(await getDenormalizedContentsUpdate(txn, currentUser, contents, {
        documentId: chapterId,
        collectionName: "Chapters",
        previousVersion: null,
      })),
    };
    await txn.insert(chapters).values(chapter);
    if (chapter.title || chapter.subtitle || postIds.length) {
      await bumpSequenceLastUpdated(txn, sequenceId);
    }
    await canonizeChapterPostInfo(txn, sequence);
    return getNotifiablePostIds(sequence, validatedPosts, []);
  });
  waitUntil(
    notifyUsersOfNewSequencePosts({
      currentUserId: currentUser._id,
      sequenceId,
      postIds: notifiablePostIds,
    }),
  );
  return chapterId;
};

export const editChapter = async (
  currentUser: CurrentUser,
  chapterId: string,
  data: ChapterEditData,
) => {
  const { contents, postIds: requestedPostIds, ...fields } = data;
  const { sequenceId, notifiablePostIds } = await db.transaction(async (txn) => {
    const oldChapter = await txn.query.chapters.findFirst({
      columns: {
        title: true,
        subtitle: true,
        sequenceId: true,
        postIds: true,
      },
      extras: {
        contentsVersion: denormalizedContentsVersion(),
      },
      where: { _id: chapterId },
    });
    if (!oldChapter) {
      throw new ORPCError("NOT_FOUND", { message: "Chapter not found" });
    }
    const sequence = await assertCanEditChapters(
      txn,
      currentUser,
      oldChapter.sequenceId,
      data,
    );
    const validatedPosts =
      requestedPostIds && (await validatePostIds(txn, requestedPostIds));

    const updates: Partial<InsertChapter> = {
      ...fields,
      postIds: validatedPosts?.postIds,
      ...(await getDenormalizedContentsUpdate(txn, currentUser, contents, {
        documentId: chapterId,
        collectionName: "Chapters",
        previousVersion: oldChapter.contentsVersion,
      })),
    };

    const set = omitBy(updates, isUndefined);
    const newChapter = await updateWithFieldChanges(
      txn,
      currentUser,
      chapters,
      chapterId,
      set,
    );
    await updateSequenceLastUpdated(txn, sequence._id, oldChapter, newChapter);
    await canonizeChapterPostInfo(txn, sequence);
    return {
      sequenceId: sequence._id,
      notifiablePostIds: validatedPosts
        ? getNotifiablePostIds(sequence, validatedPosts, oldChapter.postIds)
        : [],
    };
  });
  waitUntil(
    notifyUsersOfNewSequencePosts({
      currentUserId: currentUser._id,
      sequenceId,
      postIds: notifiablePostIds,
    }),
  );
  return chapterId;
};
