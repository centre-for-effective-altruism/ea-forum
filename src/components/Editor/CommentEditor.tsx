"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Editor } from "@ckeditor/ckeditor5-core";
import type { EventInfo } from "@ckeditor/ckeditor5-utils";
import { getCloudinaryCloudName } from "@/lib/cloudinary/cloudinaryHelpers";
import { getCkCommentEditor } from "@/lib/ckeditor/getCkEditor";
import { generateCkEditorTokenRequest } from "@/lib/ckeditor/ckEditorToken";
import { mentionPluginConfiguration } from "@/lib/ckeditor/mentionsConfig";
import { useSyncCkEditorPlaceholder } from "@/lib/ckeditor/useSyncCkEditorPlaceholder";
import {
  ckEditorBundleVersion,
  commentEditorToolbarConfig,
  defaultEditorPlaceholder,
  EditorCollectionName,
} from "@/lib/ckeditor/editorSettings";

const CKEditor = dynamic(() => import("@/vendor/ckeditor5-react/ckeditor"), {
  ssr: false,
});

/**
 * Low-level CkEditor integration for comments. You almost certainly want to
 * use `Editor` instead of using this directly.
 */
export default function CommentEditor({
  data,
  onSave,
  onReady: onReady_,
  onChange,
  onFocus,
  placeholder: requestedPlaceholder,
  collectionName,
  fieldName,
}: Readonly<{
  data?: string;
  onSave?: (data: string) => void;
  onReady?: (editor: Editor) => void;
  onChange?: (event: EventInfo, editor: Editor) => void;
  onFocus?: (event: EventInfo, editor: Editor) => void;
  placeholder?: string;
  collectionName: EditorCollectionName;
  fieldName: string;
}>) {
  const [editorObject, setEditorObject] = useState<Editor | null>(null);
  const webSocketUrl = process.env.NEXT_PUBLIC_CK_WEBSOCKET_URL;
  const ckEditorCloudConfigured = !!webSocketUrl;
  const CommentEditor = useMemo(() => getCkCommentEditor(), []);
  const placeholder = requestedPlaceholder ?? defaultEditorPlaceholder;

  const editorConfig = useMemo(
    () => ({
      ...commentEditorToolbarConfig,
      cloudServices: ckEditorCloudConfigured
        ? {
            // A tokenUrl token is needed here in order for image upload to work.
            // (It's accessible via drag-and-drop onto the comment box, and is
            // stored on CkEditor's CDN).
            // The collaborative editor is not activated because no `websocketUrl`
            // or `documentId` is provided.
            tokenUrl: generateCkEditorTokenRequest(collectionName, fieldName),
            uploadUrl: process.env.NEXT_PUBLIC_CK_UPLOAD_URL,
            bundleVersion: ckEditorBundleVersion,
          }
        : undefined,
      autosave: {
        save: (editor: Editor) => onSave?.(editor.getData()),
      },
      initialData: data || "",
      placeholder,
      mention: mentionPluginConfiguration,
      cloudinary: {
        getCloudName: getCloudinaryCloudName,
      },
    }),
    [ckEditorCloudConfigured, collectionName, fieldName, onSave, data, placeholder],
  );

  useSyncCkEditorPlaceholder(editorObject, placeholder);

  const onReady = useCallback(
    (editor: Editor) => {
      setEditorObject(editor);
      // Uncomment the line below and import to activate the debugger
      // CKEditorInspector.attach(editor)
      onReady_?.(editor);
      return editor;
    },
    [onReady_],
  );

  return (
    <div data-component="CommentEditor">
      <CKEditor
        key="comment-editor"
        editor={CommentEditor}
        onReady={onReady}
        onChange={onChange}
        onFocus={onFocus}
        config={editorConfig}
        isCollaborative={false}
      />
    </div>
  );
}
