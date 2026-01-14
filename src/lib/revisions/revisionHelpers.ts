import type { EditorContents } from "../ckeditor/editorHelpers";
import type { Revision } from "../schema";
import type { Json } from "../typeHelpers";

/**
 * Given a revision from the database, return just the fields to be denormalized
 * into other tables.
 */
export const denormalizeRevision = (revision: Revision): Json => {
  return {
    originalContents: revision.originalContents as EditorContents,
    html: revision.html,
    version: revision.version,
    userId: revision.userId,
    editedAt: revision.editedAt,
    wordCount: revision.wordCount,
    updateType: revision.updateType,
  };
};
