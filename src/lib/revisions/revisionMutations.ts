import "server-only";
import type { EditorData } from "../ckeditor/editorHelpers";
import type { Json } from "../typeHelpers";
import { revisions, Revision, User } from "../schema";
import { randomId } from "../utils/random";
import { DbOrTransaction } from "../db";
import { dataToHtml } from "../conversionUtils/dataToHtml";
import { dataToWordCount } from "../conversionUtils/dataToWordCount";
import { htmlToChangeMetrics } from "./htmlToChangeMetrics";
import { upvoteOwnTagRevision } from "./revisionCallbacks";

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
    version?: string;
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
      version: data.version ?? (data.draft ? "0.1.0" : "1.0.0"),
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
  const revision = result[0];
  await Promise.all([
    upvoteOwnTagRevision(txn, revision),
    // TODO: ForumMagnum has this for tags. We don't need it yet since tags can't
    // yet be edited in this codebase. Even when we do implement it, it's not obvious
    // to me if we still need this functionality or not - maybe we can just drop it.
    // updateDenormalizedHtmlAttributionsDueToRev(txn, revision),
  ]);
  return revision;
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
