"use server";

import { db } from "../db";

const diffHtml = (_before: string, _after: string, _trim: boolean) => {
  // TODO
  return "<p>TODO: Generate tag diff</p>";
};

export const getTagDiffAction = async (revisionId: string) => {
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
};
