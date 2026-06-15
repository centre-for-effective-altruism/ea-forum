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
import XMarkIcon from "@heroicons/react/24/solid/XMarkIcon";
import PlaintextEditor from "./PlaintextEditor";
import CommentEditor from "./CommentEditor";
import PostEditor from "./PostEditor";
import ContentStyles from "../ContentStyles/ContentStyles";
import SectionTitle from "../SectionTitle";
import Loading from "../Loading";
import FormLabel from "../Forms/FormLabel";
import WarningBanner from "../WarningBanner";
import Type from "../Type";
import "./ckeditor-styles.css";
import { htmlToTextDefault } from "@/lib/utils/htmlToText";

export type EditorOnChangeProps = {
  contents: EditorContents;
  autosave: boolean;
};

export type EditorAutosave = {
  contents: EditorContents;
  onRestore: () => void;
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
    editorType?: EditorTypeString;
    label?: string;
    formVariant?: "default" | "grey";
    formType: "edit" | "new";
    documentId?: string;
    collectionName: EditorCollectionName;
    fieldName: string;
    formProps?: FormProps;
    value: EditorContents;
    onChange?: (props: EditorOnChangeProps) => void;
    onFocus?: (event?: EventInfo, editor?: TEditor) => void;
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
    autosave?: EditorAutosave;
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
    autosave,
    className,
  },
  ref,
) {
  const { currentUser } = useCurrentUser();
  const [updateType, setUpdateType] = useState<EditorUpdateType>("minor");
  const [commitMessage, setCommitMessage] = useState("");
  const [ckEditorRef, setCkEditorRef] = useState<TEditor | null>(null);
  const plaintextRef = useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState(true);
  const [markdownImgErrors, setMarkdownImgErrors] = useState(false);
  const [editorWarning, setEditorWarning] = useState<string | undefined>();
  const [autosaveDismissed, setAutosaveDismissed] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, []);

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
        setMarkdownImgErrors(/!\[[^\]]*?\]\(http:/g.test(newValue));
      }
    },
    [value, onChange],
  );

  useImperativeHandle(ref, () => ({
    focus: () => {
      if (ckEditorRef) {
        ckEditorRef?.focus();
      } else if (plaintextRef.current) {
        plaintextRef.current.focus();
      }
    },
    clear: () => {
      if (ckEditorRef) {
        ckEditorRef.setData("");
      } else {
        setContents(value.type, "");
      }
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
          if (!ckEditorRef) {
            throw new Error("Missing CKEditor reference");
          }
          data = ckEditorRef.getData();
          if (ckEditorRef.plugins.has("TrackChangesData")) {
            dataWithDiscardedSuggestions = await ckEditorRef.plugins
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

  const restoreAutosave = useCallback(() => {
    if (autosave) {
      if (autosave.contents.type === "ckEditorMarkup") {
        ckEditorRef?.setData(autosave.contents.data);
      } else {
        setContents(autosave.contents.type, autosave.contents.data);
      }
      setAutosaveDismissed(true);
      autosave.onRestore();
    }
  }, [autosave, setContents, ckEditorRef]);

  const dismissAutosave = useCallback(() => {
    setAutosaveDismissed(true);
  }, []);

  const isGrey = formVariant === "grey";
  const CkEditor = commentEditor ? CommentEditor : PostEditor;
  return (
    <div data-component="Editor" className={className}>
      {autosave && !autosaveDismissed && (
        <div
          className="
            w-full rounded px-3 py-2 mb-1 bg-primary-dark/40 flex items-center
          "
        >
          <Type
            onClick={restoreAutosave}
            As="button"
            style="bodyHeavy"
            className="cursor-pointer hover:text-primary"
          >
            Restore autosave
          </Type>
          <Type
            className="
              ml-2 grow whitespace-nowrap overflow-hidden text-ellipsis opacity-70
            "
          >
            {htmlToTextDefault(autosave.contents.data.slice(0, 150))}
          </Type>
          <button
            onClick={dismissAutosave}
            className="cursor-pointer hover:text-primary"
          >
            <XMarkIcon className="w-4" />
          </button>
        </div>
      )}
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
            {value.type === "ckEditorMarkup" ? (
              <CkEditor
                data={value.data}
                document={document}
                isCollaborative={isCollaborative}
                accessLevel={accessLevel}
                onFocus={onFocus}
                onReady={setCkEditorRef}
                collectionName={collectionName}
                fieldName="contents"
                placeholder={placeholder}
                onChange={onEditorChange}
              />
            ) : (
              <PlaintextEditor
                editorType={value.type}
                data={value.data}
                onFocus={onFocus}
                placeholder={placeholder}
                setContents={setContents}
                textareaRef={plaintextRef}
              />
            )}
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
      {markdownImgErrors && value.type === "markdown" && (
        <Type As="aside" style="bodySmall" className="text-error m-2">
          Your Markdown contains at least one link to an image served over an
          insecure HTTP connection. You should update all links to images so that
          they are served over a secure HTTPS connection (i.e. the links should start
          with <em>https://</em>).
        </Type>
      )}
    </div>
  );
});

export default Editor;
