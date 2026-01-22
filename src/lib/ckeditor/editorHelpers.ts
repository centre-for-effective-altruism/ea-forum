import type { CurrentUser } from "../users/currentUser";
import type { CollaborativeEditingFormType } from "./collabEditingPermissions";
import type { Document } from "@ckeditor/ckeditor5-engine";
import { canMention, countMentions } from "./pingbacks";

export type EditorDocument = Document;

export type EditorTypeString = "html" | "markdown" | "ckEditorMarkup" | "draftJS";

/**
 * Contents of an editor, with `value` in the native format of the editor
 * (whichever editor that is). For DraftJS in particular, this means `value` is
 * a DraftJS EditorState object.
 */
export type EditorContents = {
  type: EditorTypeString;
  data: string;
};

export type FormProps = {
  commentMinimalistStyle?: boolean;
  maxHeight?: boolean;
};

export type EditorUpdateType = "initial" | "patch" | "minor" | "major";

export type EditorData = {
  originalContents: EditorContents;
  updateType: EditorUpdateType;
  commitMessage: string;
  dataWithDiscardedSuggestions?: string;
};

export type EditorAPI = {
  focus: () => void;
  getSubmitData: () => Promise<EditorData>;
  clear: () => void;
};

export const autosaveIntervalMs = 3000;
export const validationIntervalMs = 500;

export const getUserDefaultEditor = (user: CurrentUser | null): EditorTypeString =>
  user?.markDownPostEditor ? "markdown" : "ckEditorMarkup";

export const getBlankEditorContents = (
  editorType: EditorTypeString,
): EditorContents => ({ type: editorType, data: "" });

export const getCKEditorDocumentId = (
  documentId: string | null,
  userId: string | null,
  formType: CollaborativeEditingFormType | null,
) => (documentId ? `${documentId}-${formType}` : `${userId}-${formType}`);

type EditorValidationResult = {
  valid: boolean;
  message?: string;
};

export const checkEditorValid = (
  document: EditorDocument,
  currentUser: CurrentUser | null,
  isCommentEditor?: boolean,
): EditorValidationResult => {
  if (!currentUser) {
    return {
      valid: false,
      message: isCommentEditor
        ? "You must be logged in to comment"
        : "You must be logged in to post",
    };
  }
  const verifyCanMention = canMention({
    currentUser,
    mentionsCount: countMentions(document),
  });
  return {
    valid: verifyCanMention.result,
    message: verifyCanMention.reason,
  };
};
