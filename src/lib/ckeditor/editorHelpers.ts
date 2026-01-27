import { z } from "zod/v4";
import { canMention, countMentions } from "./pingbacks";
import type { CurrentUser } from "../users/currentUser";
import type { CollaborativeEditingFormType } from "./collabEditingPermissions";
import type { Document } from "@ckeditor/ckeditor5-engine";

export type EditorDocument = Document;

const editorTypeStringSchema = z.enum(["html", "markdown", "ckEditorMarkup"]);

export type EditorTypeString = z.infer<typeof editorTypeStringSchema>;

/**
 * Contents of an editor, with `value` in the native format of the editor
 * (whichever editor that is).
 */
export const editorContentsSchema = z.object({
  type: editorTypeStringSchema,
  data: z.string(),
});

export type EditorContents = z.infer<typeof editorContentsSchema>;

export type FormProps = {
  commentMinimalistStyle?: boolean;
  maxHeight?: boolean;
};

const editorUpdateTypeSchema = z.enum(["initial", "patch", "minor", "major"]);

export type EditorUpdateType = z.infer<typeof editorUpdateTypeSchema>;

export const editorDataSchema = z.object({
  originalContents: editorContentsSchema,
  updateType: editorUpdateTypeSchema,
  commitMessage: z.string(),
  dataWithDiscardedSuggestions: z.string().optional(),
});

export type EditorData = z.infer<typeof editorDataSchema>;

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
