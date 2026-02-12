import { z } from "zod/v4";
import { os } from "@orpc/server";
import { db } from "../db";
import { fetchTagsById } from "./tagQueries";
import { diffHtml } from "../revisions/htmlToChangeMetrics";

export const tagsRouter = {
  byIds: os
    .input(z.object({ tagIds: z.array(z.string()) }))
    .handler(async ({ input: { tagIds } }) => fetchTagsById(tagIds)),
  diff: os
    .input(z.object({ revisionId: z.string().nonempty() }))
    .handler(async ({ input: { revisionId } }) => {
      const after = await db.query.revisions.findFirst({
        columns: {
          documentId: true,
          collectionName: true,
          fieldName: true,
          html: true,
          editedAt: true,
        },
        where: {
          _id: revisionId,
        },
      });
      if (
        !after ||
        !after.documentId ||
        !after.editedAt ||
        after.collectionName !== "Tags" ||
        after.fieldName !== "description"
      ) {
        throw new Error(`Invalid tag revision: ${revisionId}`);
      }
      const before = await db.query.revisions.findFirst({
        columns: {
          html: true,
        },
        where: {
          documentId: after.documentId,
          collectionName: after.collectionName,
          fieldName: after.fieldName,
          editedAt: { lt: after.editedAt },
        },
        orderBy: {
          editedAt: "desc",
        },
      });
      return diffHtml(before?.html ?? "", after.html ?? "", true);
    }),
};
