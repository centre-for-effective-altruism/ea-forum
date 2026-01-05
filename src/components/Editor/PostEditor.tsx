import type { Editor } from "@ckeditor/ckeditor5-core";
import type { EventInfo } from "@ckeditor/ckeditor5-utils";
import type { EditorDocument } from "@/lib/ckeditor/editorHelpers";
import type { EditorCollectionName } from "@/lib/ckeditor/editorSettings";
import type { CollaborativeEditingAccessLevel } from "@/lib/ckeditor/collabEditingPermissions";

/**
 * Low-level CkEditor integration for posts. You almost certainly want to
 * use `Editor` instead of using this directly.
 */
export default function PostEditor({}: Readonly<{
  document?: EditorDocument;
  data?: string;
  onSave?: (data: string) => void;
  onReady?: (editor: Editor) => void;
  onChange?: (event: EventInfo, editor: Editor) => void;
  onFocus?: (event: EventInfo, editor: Editor) => void;
  placeholder?: string;
  isCollaborative?: boolean;
  accessLevel?: CollaborativeEditingAccessLevel;
  collectionName: EditorCollectionName;
  fieldName: string;
}>) {
  // TODO Implement post editor
  return null;
}
