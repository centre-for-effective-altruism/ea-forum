import type { BookEditData } from "./bookHelpers";
import type { CurrentUser } from "../users/currentUser";
import isUndefined from "lodash/isUndefined";
import omitBy from "lodash/omitBy";
import uniq from "lodash/uniq";
import { books, InsertBook } from "../schema";
import { db } from "../db";
import { updateWithFieldChanges } from "../fieldChanges";
import { createRevision } from "../revisions/revisionMutations";
import { denormalizeRevision, getNextVersion } from "../revisions/revisionHelpers";

export const editBook = async (
  currentUser: CurrentUser,
  bookId: string,
  { description, ...data }: BookEditData,
) => {
  await db.transaction(async (txn) => {
    const oldBook = await txn.query.books.findFirst({
      columns: {
        contents: true,
      },
      where: {
        _id: bookId,
      },
    });
    if (!oldBook) {
      throw new Error("Book not found");
    }

    if (data.sequenceIds?.length) {
      const sequenceIds = uniq(data.sequenceIds);
      const sequences = await txn.query.sequences.findMany({
        columns: {
          _id: true,
        },
        where: {
          _id: { in: sequenceIds },
          isDeleted: false,
        },
      });
      if (sequences.length !== sequenceIds.length) {
        throw new Error("Invalid sequence ids");
      }
    }

    const updates: Partial<InsertBook> = { ...data };

    if (description) {
      const revision = await createRevision(txn, currentUser, description, {
        documentId: bookId,
        collectionName: "Books",
        fieldName: "contents",
        draft: false,
        version: getNextVersion(oldBook.contents, description.updateType),
      });
      updates.contents = denormalizeRevision(revision);
      updates.contentsLatest = revision._id;
    } else if (description === null) {
      updates.contents = null;
      updates.contentsLatest = null;
    }

    const set = omitBy(updates, isUndefined);
    await updateWithFieldChanges(txn, currentUser, books, bookId, set);
  });
  return bookId;
};
