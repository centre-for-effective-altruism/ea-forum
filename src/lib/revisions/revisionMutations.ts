import "server-only";
import type { EditorData } from "../ckeditor/editorHelpers";
import type { Json } from "../typeHelpers";
import { revisions, Revision, User } from "../schema";
import { randomId } from "../utils/random";
import { DbOrTransaction } from "../db";
import { dataToHtml } from "../conversionUtils/dataToHtml";
import { dataToWordCount } from "../conversionUtils/dataToWordCount";
import { htmlToChangeMetrics } from "./htmlToChangeMetrics";

export const createRevision = async (
  txn: DbOrTransaction,
  user: Pick<User, "_id" | "isAdmin">,
  {
    originalContents,
    dataWithDiscardedSuggestions,
    commitMessage,
    updateType,
  }: EditorData,
  data: {
    documentId: string;
    collectionName: string;
    fieldName: string;
    draft?: boolean;
    googleDocMetadata?: Json;
  },
): Promise<Revision> => {
  const editorType = originalContents.type;
  const visibleData = dataWithDiscardedSuggestions ?? originalContents.data;
  const [html, wordCount] = await Promise.all([
    dataToHtml(visibleData, editorType, { sanitize: !user.isAdmin }),
    dataToWordCount(visibleData, editorType),
  ]);
  const now = new Date().toISOString();
  const result = await txn
    .insert(revisions)
    .values({
      ...data,
      _id: randomId(),
      userId: user._id,
      version: data.draft ? "0.1.0" : "1.0.0",
      updateType: updateType ?? "initial",
      html,
      wordCount,
      commitMessage,
      originalContents,
      changeMetrics: htmlToChangeMetrics("", html),
      skipAttributions: false,
      editedAt: now,
      createdAt: now,
    })
    .returning();
  // TODO:
  // upvoteOwnTagRevision
  // updateDenormalizedHtmlAttributionsDueToRev
  return result[0];
};

type NormalizedFieldRevision<T extends string> = {
  [K in `${T}Latest`]: string;
};

type DenormalizedFieldRevision<T extends string> = NormalizedFieldRevision<T> & {
  [K in T]: Revision;
};

export const createRevisionForDenormalizedEditableField = async <T extends string>(
  txn: DbOrTransaction,
  user: Pick<User, "_id" | "isAdmin">,
  fieldName: T,
  editorData: EditorData,
  data: {
    documentId: string;
    collectionName: string;
    draft?: boolean;
    googleDocMetadata?: Json;
  },
): Promise<DenormalizedFieldRevision<T> | null> => {
  const revision = await createRevision(txn, user, editorData, {
    fieldName,
    ...data,
  });
  return revision
    ? ({
        [fieldName]: revision,
        [`${fieldName}Latest`]: revision._id,
      } as DenormalizedFieldRevision<T>)
    : null;
};

export const createRevisionForNormalizedEditableField = async <T extends string>(
  txn: DbOrTransaction,
  user: Pick<User, "_id" | "isAdmin">,
  fieldName: T,
  editorData: EditorData,
  data: {
    documentId: string;
    collectionName: string;
    draft?: boolean;
    googleDocMetadata?: Json;
  },
): Promise<NormalizedFieldRevision<T> | null> => {
  const revision = await createRevision(txn, user, editorData, {
    fieldName,
    ...data,
  });
  return revision
    ? ({ [`${fieldName}Latest`]: revision._id } as NormalizedFieldRevision<T>)
    : null;
};
