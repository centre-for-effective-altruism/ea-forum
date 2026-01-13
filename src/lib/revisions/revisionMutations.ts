"server-only";

import type { EditorData } from "../ckeditor/editorHelpers";
import { revisions, Revision, User } from "../schema";
import type { Json } from "../typeHelpers";
import { randomId } from "../utils/random";
import { db } from "../db";
import { dataToHtml } from "../conversionUtils/dataToHtml";
import { dataToWordCount } from "../conversionUtils/dataToWordCount";

export const createRevision = async (
  user: Pick<User, "_id" | "isAdmin">,
  editorData: EditorData,
  data: {
    documentId: string;
    collectionName: string;
    fieldName: string;
    updateType?: string;
    version?: string;
    commitMessage?: string;
    draft?: boolean;
    googleDocMetadata?: Json;
    skipAttributions?: boolean;
  },
): Promise<Revision> => {
  const { originalContents, dataWithDiscardedSuggestions } = editorData;
  const editorType = originalContents.type;
  const visibleData = dataWithDiscardedSuggestions ?? originalContents.data;
  const [html, wordCount] = await Promise.all([
    dataToHtml(visibleData, editorType, { sanitize: !user.isAdmin }),
    dataToWordCount(visibleData, editorType),
  ]);
  const changeMetrics = {};
  const result = await db
    .insert(revisions)
    .values({
      ...data,
      _id: randomId(),
      editedAt: new Date().toISOString(),
      version: data.version ?? "1.0.0",
      html,
      wordCount,
      changeMetrics,
      originalContents: editorData.originalContents,
    })
    .returning();
  return result[0];
};
