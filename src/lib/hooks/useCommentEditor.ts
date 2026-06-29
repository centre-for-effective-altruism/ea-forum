"use client";

import {
  SubmitEvent,
  KeyboardEvent,
  startTransition,
  useCallback,
  useRef,
  useState,
  useEffect,
} from "react";
import toast from "react-hot-toast";
import {
  isBlank,
  EditorAPI,
  EditorContents,
  EditorData,
  getLocalStorageKeyPrefix,
  EditorTypeString,
  getUserDefaultEditor,
} from "@/lib/ckeditor/editorHelpers";
import type { EditorOnChangeProps } from "@/components/Editor/Editor";
import type { CommentToEdit } from "../comments/commentQueries";
import type { CommentListItem } from "../comments/commentLists";
import type { CurrentUser } from "../users/currentUser";
import { useLoginPopoverContext } from "./useLoginPopoverContext";
import { useDebouncedCallback } from "./useDebouncedCallback";
import { useCurrentUser } from "./useCurrentUser";
import { useTracking } from "../analyticsEvents";
import { rpc } from "../rpc";
import {
  getLSHandlers,
  getRestorableDocumentFromLocalStorage,
} from "../localStorage";

const autosaveIntervalMs = 3000;

type UseCommentEditorDocument =
  // Creating a post comment
  | {
      postId: string;
      parentCommentId?: string;
      shortform?: false;
      comment?: never;
    }
  // Creating a quick take
  | {
      postId?: never;
      parentCommentId?: never;
      shortform: true;
      comment?: never;
    }
  // Editing a comment or quick take
  | {
      postId?: never;
      parentCommentId?: never;
      shortform?: never;
      comment: CommentToEdit | null;
    };

export type CommentPrefilledProps = Pick<
  Parameters<typeof rpc.comments.create>[0],
  "forumEventId" | "forumEventMetadata"
>;

export type UseCommentEditorProps = UseCommentEditorDocument & {
  beforeSubmit?: (data: EditorData) => void;
  onSuccess?: (comment: CommentListItem) => void;
  prefilledProps?: CommentPrefilledProps;
  htmlTemplate?: string;
};

type SubmitExtraProps = {
  shortformFrontpage?: boolean;
  relevantTagIds?: string[];
  draft?: boolean;
};

const choosePlaceholder = (shortform?: boolean, comment?: CommentToEdit | null) => {
  if (comment !== undefined) {
    return comment?.shortform ? "Edit quick take..." : "Edit comment...";
  }
  return shortform ? "Write a new quick take..." : "Write a new comment...";
};

const getInitialContents = ({
  currentUser,
  comment,
  htmlTemplate,
}: {
  currentUser: CurrentUser | null;
  comment?: CommentToEdit | null;
  htmlTemplate?: string;
}): EditorContents =>
  comment?.originalContents ?? {
    type: currentUser?.markDownPostEditor ? "markdown" : "ckEditorMarkup",
    data: htmlTemplate ?? "",
  };

const getCommentLocalStorageId =
  ({
    comment,
    parentCommentId,
    postId,
  }: {
    postId?: string;
    parentCommentId?: string;
    comment?: CommentToEdit | null;
  }) =>
  () => {
    if (comment?._id) {
      return {
        id: comment._id,
        verify: true,
      };
    }
    if (parentCommentId) {
      return {
        id: "parent:" + parentCommentId,
        verify: false,
      };
    }
    return {
      id: "post:" + postId,
      verify: false,
    };
  };

export const useCommentEditor = ({
  postId,
  parentCommentId,
  shortform,
  comment,
  htmlTemplate,
  beforeSubmit,
  onSuccess,
  prefilledProps,
}: UseCommentEditorProps) => {
  const { currentUser } = useCurrentUser();
  const { onSignup } = useLoginPopoverContext();
  const { captureEvent } = useTracking();
  const [loading, setLoading] = useState(false);
  const hasUnsavedDataRef = useRef({ hasUnsavedData: false });
  const editorRef = useRef<EditorAPI>(null);
  const [contents, setContents] = useState(
    getInitialContents({
      currentUser,
      comment,
      htmlTemplate,
    }),
  );
  const [localStorageChecked, setLocalStorageChecked] = useState(false);
  const [restorableDocument, setRestorableDocument] =
    useState<EditorContents | null>(null);

  const defaultEditorType = getUserDefaultEditor(currentUser);
  const currentEditorType = contents.type || defaultEditorType;

  const getLocalStorageHandlers = useCallback(
    (editorType: EditorTypeString) => {
      return getLSHandlers(
        getCommentLocalStorageId({ postId, parentCommentId, comment }),
        comment,
        "contents",
        getLocalStorageKeyPrefix(editorType),
      );
    },
    [postId, parentCommentId, comment],
  );

  const saveBackup = useCallback(
    (newContents: EditorContents) => {
      const sameAsSaved = newContents.data === comment?.originalContents?.data;
      if (isBlank(newContents) || sameAsSaved) {
        getLocalStorageHandlers(currentEditorType).reset();
        hasUnsavedDataRef.current.hasUnsavedData = false;
      } else {
        const handlers = getLocalStorageHandlers(newContents.type);
        const success = handlers.set(newContents);
        if (success) {
          hasUnsavedDataRef.current.hasUnsavedData = false;
        }
      }
    },
    [getLocalStorageHandlers, currentEditorType, comment],
  );

  const throttledSaveBackup = useDebouncedCallback(saveBackup, {
    rateLimitMs: autosaveIntervalMs,
    callOnLeadingEdge: false,
    onUnmount: "cancelPending",
    allowExplicitCallAfterUnmount: false,
  });

  useEffect(() => {
    if (!localStorageChecked) {
      setLocalStorageChecked(true);
      setRestorableDocument(
        getRestorableDocumentFromLocalStorage(currentUser, getLocalStorageHandlers),
      );
    }
  }, [localStorageChecked, getLocalStorageHandlers, currentUser]);

  const onChange = useCallback(
    ({ contents, autosave }: EditorOnChangeProps) => {
      setContents(contents);
      if (!isBlank(contents)) {
        hasUnsavedDataRef.current.hasUnsavedData = true;
      }
      if (autosave) {
        throttledSaveBackup(contents);
      }
    },
    [throttledSaveBackup],
  );

  useEffect(() => {
    const unloadEventListener = (ev: BeforeUnloadEvent) => {
      if (hasUnsavedDataRef?.current?.hasUnsavedData) {
        ev.preventDefault();
        ev.returnValue = "Are you sure you want to close?";
        return ev.returnValue;
      }
    };
    window.addEventListener("beforeunload", unloadEventListener);
    return () => window.removeEventListener("beforeunload", unloadEventListener);
  }, [hasUnsavedDataRef]);

  const onSubmit = useCallback(
    async (ev?: SubmitEvent<HTMLFormElement>, extraProps?: SubmitExtraProps) => {
      ev?.preventDefault();
      if (!currentUser) {
        onSignup();
        return;
      }
      const editorApi = editorRef.current;
      if (!editorApi) {
        console.error("Editor API not found");
        return;
      }
      const data = await editorApi.getSubmitData();
      if (!data.originalContents.data) {
        toast.error("Comment is empty");
        return;
      }
      beforeSubmit?.(data);
      setLoading(true);
      startTransition(async () => {
        try {
          const newComment = comment
            ? await rpc.comments.edit({
                commentId: comment._id,
                editorData: data,
                draft: extraProps?.draft ?? false,
              })
            : await rpc.comments.create({
                postId,
                parentCommentId,
                shortform,
                editorData: data,
                ...extraProps,
                ...prefilledProps,
              });
          if (!newComment) {
            throw new Error("Something went wrong");
          }
          if (!comment) {
            captureEvent("commentSubmitted", {
              postId: postId ?? null,
              shortform: shortform ?? false,
              isReply: !!parentCommentId,
              isDraft: extraProps?.draft ?? false,
            });
          }
          onSuccess?.(newComment);
          editorRef.current?.clear();
        } catch (e) {
          console.error("Editor submit error:", e);
          toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
          setLoading(false);
        }
      });
    },
    [
      currentUser,
      onSignup,
      captureEvent,
      postId,
      parentCommentId,
      shortform,
      comment,
      beforeSubmit,
      onSuccess,
      prefilledProps,
    ],
  );

  const onSaveDraft = useCallback(
    async (ev?: SubmitEvent<HTMLFormElement>, extraProps?: SubmitExtraProps) => {
      return await onSubmit(ev, { ...extraProps, draft: true });
    },
    [onSubmit],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLFormElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void onSubmit();
      }
    },
    [onSubmit],
  );

  const restoreAutosave = useCallback(() => {
    if (restorableDocument) {
      setRestorableDocument(null);
      getLocalStorageHandlers(currentEditorType).reset();
      hasUnsavedDataRef.current.hasUnsavedData = false;
    }
  }, [restorableDocument, currentEditorType, getLocalStorageHandlers]);

  return {
    formType: comment ? ("edit" as const) : ("new" as const),
    placeholder: choosePlaceholder(shortform, comment),
    contents,
    editorRef,
    loading,
    onChange,
    onSubmit,
    onSaveDraft,
    onKeyDown,
    autosave: restorableDocument?.data?.length
      ? {
          contents: restorableDocument,
          onRestore: restoreAutosave,
        }
      : undefined,
  };
};
