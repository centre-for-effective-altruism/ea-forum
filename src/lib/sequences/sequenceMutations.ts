import { waitUntil } from "@vercel/functions";
import { ORPCError } from "@orpc/server";
import isUndefined from "lodash/isUndefined";
import omitBy from "lodash/omitBy";
import type { CurrentUser } from "../users/currentUser";
import { db } from "../db";
import { InsertSequence, sequences } from "../schema";
import { updateWithFieldChanges } from "../fieldChanges";
import { getDenormalizedContentsUpdate } from "../revisions/revisionMutations";
import { denormalizedContentsVersion } from "../revisions/revisionHelpers";
import { elasticSyncDocument } from "../search/elastic/elasticSync";
import {
  getForbiddenSequenceEditFields,
  SequenceEditData,
  userCanEditSequence,
} from "./sequenceHelpers";

export const editSequence = async (
  currentUser: CurrentUser,
  sequenceId: string,
  data: SequenceEditData,
) => {
  await db.transaction(async (txn) => {
    const sequence = await txn.query.sequences.findFirst({
      columns: {
        userId: true,
        isDeleted: true,
      },
      extras: {
        contentsVersion: denormalizedContentsVersion(),
      },
      where: {
        _id: sequenceId,
      },
    });
    if (!sequence || sequence.isDeleted) {
      throw new ORPCError("NOT_FOUND", { message: "Sequence not found" });
    }
    if (!userCanEditSequence(currentUser, sequence)) {
      throw new ORPCError("FORBIDDEN", { message: "Permission denied" });
    }
    const forbiddenFields = getForbiddenSequenceEditFields(currentUser, data);
    if (forbiddenFields.length) {
      throw new ORPCError("FORBIDDEN", {
        message: `You can't edit: ${forbiddenFields.join(", ")}`,
      });
    }
    if (data.userId && data.userId !== sequence.userId) {
      const newOwner = await txn.query.users.findFirst({
        columns: { _id: true },
        where: { _id: data.userId },
      });
      if (!newOwner) {
        throw new ORPCError("BAD_REQUEST", { message: "User not found" });
      }
    }

    const { contents, ...fields } = data;
    const updates: Partial<InsertSequence> = {
      ...fields,
      lastUpdated: new Date().toISOString(),
      ...(await getDenormalizedContentsUpdate(txn, currentUser, contents, {
        documentId: sequenceId,
        collectionName: "Sequences",
        previousVersion: sequence.contentsVersion,
      })),
    };

    const set = omitBy(updates, isUndefined);
    await updateWithFieldChanges(txn, currentUser, sequences, sequenceId, set);
  });
  waitUntil(elasticSyncDocument("Sequences", sequenceId));
  return sequenceId;
};
