"use client";

import {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import type { Editor as TEditor } from "@ckeditor/ckeditor5-core";
import type { EventInfo } from "@ckeditor/ckeditor5-utils";
import type { EditorCollectionName } from "@/lib/ckeditor/editorSettings";
import type { CollaborativeEditingAccessLevel } from "@/lib/ckeditor/collabEditingPermissions";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import {
  autosaveIntervalMs,
  checkEditorValid,
  EditorAPI,
  EditorContents,
  EditorDocument,
  EditorTypeString,
  EditorUpdateType,
  FormProps,
  validationIntervalMs,
} from "@/lib/ckeditor/editorHelpers";
import debounce from "lodash/debounce";
import CommentEditor from "./CommentEditor";
import PostEditor from "./PostEditor";
import ContentStyles from "../ContentStyles/ContentStyles";
import SectionTitle from "../SectionTitle";
import Loading from "../Loading";
import FormLabel from "../Forms/FormLabel";
import WarningBanner from "../WarningBanner";
import Type from "../Type";
import "./ckeditor-styles.css";

export type EditorOnChangeProps = {
  contents: EditorContents;
  autosave: boolean;
};

/**
 * Main CkEditor component
 * TODO: This is pretty much a verbatim copy from ForumMagnum but just converted
 * from a class component to a functional component. I'm pretty sure there's a
 * good amount of stuff here that we don't need any more but I'm not sure yet
 * exactly what.
 * TODO: Currently in dev mode mounting the editor throws the error:
 *    CKEditorError: editor-source-element-already-used
 * This is due to the editor being mounted and then remounted in react strict
 * mode. This issue doesn't happen in prod (where strict mode is disabled), and
 * even in dev mode the editor watchdog is able to immediately recover, but it
 * would still be nice to fix this to clean up the dev console.
 */
const Editor = forwardRef<
  EditorAPI | null,
  {
    label?: string;
    formVariant?: "default" | "grey";
    formType: "edit" | "new";
    documentId?: string;
    collectionName: EditorCollectionName;
    fieldName: string;
    formProps?: FormProps;
    value: EditorContents;
    onChange?: (props: EditorOnChangeProps) => void;
    onFocus?: (event: EventInfo, editor: TEditor) => void;
    placeholder?: string;
    commentStyles?: boolean;
    quickTakesStyles?: boolean;
    answerStyles?: boolean;
    questionStyles?: boolean;
    commentEditor?: boolean;
    hideControls?: boolean;
    maxHeight?: boolean | null;
    hasCommitMessages?: boolean;
    document?: EditorDocument;
    /**
     * Whether to use the CkEditor collaborative editor, ie, this is the
     * contents field of a shared post.
     */
    isCollaborative?: boolean;
    /**
     * If isCollaborative is set, this is the access level the user should have
     * with CkEditor. Otherwise ignored.
     */
    accessLevel?: CollaborativeEditingAccessLevel;
    className?: string;
  }
>(function Editor(
  {
    label,
    formVariant,
    formType,
    value,
    onChange,
    onFocus,
    placeholder,
    collectionName,
    hideControls,
    commentEditor = collectionName === "Comments",
    hasCommitMessages,
    isCollaborative,
    accessLevel,
    document,
    className,
  },
  ref,
) {
  const { currentUser } = useCurrentUser();
  const [updateType, setUpdateType] = useState<EditorUpdateType>("minor");
  const [commitMessage, setCommitMessage] = useState("");
  const [ckEditorReference, setCkEditorReference] = useState<TEditor | null>(null);
  const [loading, setLoading] = useState(true);
  const [markdownImgErrs, setMarkdownImgErrs] = useState(false);
  const [editorWarning, setEditorWarning] = useState<string | undefined>();

  useEffect(() => {
    setLoading(false);
  }, []);

  const debouncedCheckMarkdownImgErrs = useRef(
    debounce(() => {
      if (value.type === "markdown") {
        const httpImageRE = /!\[[^\]]*?\]\(http:/g;
        setMarkdownImgErrs(httpImageRE.test(value.data));
      }
    }, validationIntervalMs),
  ).current;

  const throttledSetCkEditor = useRef(
    debounce((getValue: () => string) => {
      setContents("ckEditorMarkup", getValue());
    }, autosaveIntervalMs),
  ).current;

  const debouncedValidateEditor = useRef(
    debounce((doc: EditorDocument) => {
      const result = checkEditorValid(doc, currentUser, commentEditor);
      setEditorWarning(result.message);
    }, validationIntervalMs),
  ).current;

  const setContents = useCallback(
    (editorType: EditorTypeString, newValue: string) => {
      if (value.data === newValue) {
        return;
      }
      onChange?.({
        contents: { type: editorType, data: newValue },
        autosave: true,
      });
      if (editorType === "markdown") {
        debouncedCheckMarkdownImgErrs();
      }
    },
    [value, onChange, debouncedCheckMarkdownImgErrs],
  );

  useImperativeHandle(ref, () => ({
    focus: () => ckEditorReference?.focus(),
    clear: () => {
      if (!ckEditorReference) {
        throw new Error("Missing CKEditor reference");
      }
      ckEditorReference.setData("");
    },
    getSubmitData: async () => {
      let data: string;
      let dataWithDiscardedSuggestions;

      switch (value.type) {
        case "markdown":
        case "html":
          data = value.data;
          break;
        case "ckEditorMarkup":
          if (!ckEditorReference) {
            throw new Error("Missing CKEditor reference");
          }
          data = ckEditorReference.getData();
          if (ckEditorReference.plugins.has("TrackChangesData")) {
            dataWithDiscardedSuggestions = await ckEditorReference.plugins
              .get("TrackChangesData")
              // @ts-expect-error FIXME: Not sure why this isn't typed correctly
              .getDataWithDiscardedSuggestions();
          }
          break;
      }
      return {
        originalContents: { type: value.type, data: data! },
        updateType,
        commitMessage,
        dataWithDiscardedSuggestions,
      };
    },
  }));

  const onEditorChange = useCallback(
    (_e: EventInfo, editor: TEditor) => {
      debouncedValidateEditor(editor.model.document);
      const root = editor.model.document.getRoot("main");
      if (!root || !editor.data.model.hasContent(root)) {
        throttledSetCkEditor.cancel();
        setContents("ckEditorMarkup", editor.getData());
      } else {
        throttledSetCkEditor(() => editor.getData());
      }
    },
    [debouncedValidateEditor, throttledSetCkEditor, setContents],
  );

  const isGrey = formVariant === "grey";
  const CkEditor = commentEditor ? CommentEditor : PostEditor;
  return (
    <div data-component="Editor" className={className}>
      {label && isGrey && (
        <SectionTitle title={label} noTopMargin titleClassName="font-[12px]" />
      )}
      <ContentStyles
        className="relative"
        contentType={collectionName === "Posts" ? "post" : "comment"}
      >
        {label && !isGrey && (
          <FormLabel className="font-[10px] mb-1">{label}</FormLabel>
        )}
        {loading || !CkEditor ? (
          <Loading />
        ) : (
          <div className="forum-editor">
            {editorWarning && <WarningBanner messageHtml={editorWarning} />}
            <CkEditor
              data={value.data}
              document={document}
              isCollaborative={isCollaborative}
              accessLevel={accessLevel}
              onFocus={onFocus}
              onReady={setCkEditorReference}
              collectionName={collectionName}
              fieldName="contents"
              placeholder={placeholder}
              onChange={onEditorChange}
            />
          </div>
        )}
        {!isGrey &&
          (hideControls || !currentUser?.isAdmin || formType !== "edit" ? null : (
            <select
              value={updateType}
              onChange={(e) => setUpdateType(e.target.value as EditorUpdateType)}
              className="mr-2"
            >
              <option value="major">Major Update</option>
              <option value="minor">Minor Update</option>
              <option value="patch">Patch</option>
            </select>
          ))}
      </ContentStyles>
      {(!isGrey && hasCommitMessages) ||
        (!hideControls && (
          <Type className="flex items-center">
            <span className="mx-2">Edit summary:</span>
            <input
              className="grow"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
            />
          </Type>
        ))}
      {markdownImgErrs && value.type === "markdown" && (
        <Type As="aside" style="bodySmall" className="text-error m-2">
          Your Markdown contains insecure HTTP image links
        </Type>
      )}
    </div>
  );
});

export default Editor;
