import type { CollectionEditData } from "./collectionHelpers";
import type { CurrentUser } from "../users/currentUser";
import isUndefined from "lodash/isUndefined";
import omitBy from "lodash/omitBy";
import { collections, InsertCollection } from "../schema";
import { db } from "../db";
import { updateWithFieldChanges } from "../fieldChanges";
import { createRevision } from "../revisions/revisionMutations";
import { denormalizeRevision, getNextVersion } from "../revisions/revisionHelpers";

export const editCollection = async (
  currentUser: CurrentUser,
  collectionId: string,
  { description, ...data }: CollectionEditData,
) => {
  await db.transaction(async (txn) => {
    const oldCollection = await txn.query.collections.findFirst({
      columns: {
        contents: true,
      },
      where: {
        _id: collectionId,
      },
    });
    if (!oldCollection) {
      throw new Error("Collection not found");
    }

    const updates: Partial<InsertCollection> = { ...data };

    if (description) {
      const revision = await createRevision(txn, currentUser, description, {
        documentId: collectionId,
        collectionName: "Collections",
        fieldName: "contents",
        draft: false,
        version: getNextVersion(oldCollection.contents, description.updateType),
      });
      updates.contents = denormalizeRevision(revision);
      updates.contentsLatest = revision._id;
    } else if (description === null) {
      updates.contents = null;
      updates.contentsLatest = null;
    }

    const set = omitBy(updates, isUndefined);
    await updateWithFieldChanges(txn, currentUser, collections, collectionId, set);
  });
  return collectionId;
};
