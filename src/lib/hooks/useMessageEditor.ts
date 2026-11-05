"use client";

import {
  KeyboardEvent,
  SubmitEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import { captureException } from "@sentry/nextjs";
import { ORPCError } from "@orpc/client";
import {
  isBlank,
  EditorAPI,
  EditorContents,
  EditorTypeString,
  getBlankEditorContents,
  getLocalStorageKeyPrefix,
  getUserDefaultEditor,
} from "@/lib/ckeditor/editorHelpers";
import type { EditorOnChangeProps } from "@/components/Editor/Editor";
import type {
  ConversationMessage,
  InboxConversation,
} from "../messages/conversationQueries";
import { userIsAdmin } from "../users/userHelpers";
import { useDebouncedCallback } from "./useDebouncedCallback";
import { useCurrentUser } from "./useCurrentUser";
import { useTracking } from "../analyticsEvents";
import { rpc } from "../rpc";
import {
  getLSHandlers,
  getRestorableDocumentFromLocalStorage,
} from "../localStorage";

const autosaveIntervalMs = 3000;

export const useMessageEditor = ({
  conversation,
  htmlTemplate,
  from,
  onSuccess,
}: {
  conversation: InboxConversation;
  htmlTemplate?: string;
  from?: string;
  onSuccess?: (message: ConversationMessage | null) => void;
}) => {
  const { currentUser } = useCurrentUser();
  const { captureEvent } = useTracking();
  const [loading, setLoading] = useState(false);
  const [noEmail, setNoEmail] = useState(false);
  const hasUnsavedDataRef = useRef(false);
  const editorRef = useRef<EditorAPI>(null);
  const [contents, setContents] = useState<EditorContents>(() =>
    // An HTML template has to use CkEditor, otherwise it would be
    // interpreted as markdown
    htmlTemplate
      ? { type: "ckEditorMarkup", data: htmlTemplate }
      : getBlankEditorContents(getUserDefaultEditor(currentUser)),
  );
  const [restorableDocument, setRestorableDocument] =
    useState<EditorContents | null>(null);
  const conversationId = conversation._id;

  const getLocalStorageHandlers = useCallback(
    (editorType: EditorTypeString) =>
      getLSHandlers(
        () => ({ id: conversationId, verify: true }),
        { conversationId },
        "contents",
        getLocalStorageKeyPrefix(editorType),
      ),
    [conversationId],
  );

  const saveBackup = useCallback(
    (newContents: EditorContents) => {
      if (isBlank(newContents)) {
        getLocalStorageHandlers(newContents.type).reset();
        hasUnsavedDataRef.current = false;
      } else if (getLocalStorageHandlers(newContents.type).set(newContents)) {
        hasUnsavedDataRef.current = false;
      }
    },
    [getLocalStorageHandlers],
  );

  const throttledSaveBackup = useDebouncedCallback(saveBackup, {
    rateLimitMs: autosaveIntervalMs,
    callOnLeadingEdge: false,
    onUnmount: "cancelPending",
    allowExplicitCallAfterUnmount: false,
  });

  useEffect(() => {
    setRestorableDocument(
      getRestorableDocumentFromLocalStorage(currentUser, getLocalStorageHandlers),
    );
  }, [currentUser, getLocalStorageHandlers]);

  const onChange = useCallback(
    ({ contents, autosave }: EditorOnChangeProps) => {
      setContents(contents);
      if (!isBlank(contents)) {
        hasUnsavedDataRef.current = true;
      }
      if (autosave) {
        throttledSaveBackup(contents);
      }
    },
    [throttledSaveBackup],
  );

  useEffect(() => {
    const unloadEventListener = (ev: BeforeUnloadEvent) => {
      if (hasUnsavedDataRef.current) {
        ev.preventDefault();
        ev.returnValue = "Are you sure you want to close?";
        return ev.returnValue;
      }
    };
    window.addEventListener("beforeunload", unloadEventListener);
    return () => window.removeEventListener("beforeunload", unloadEventListener);
  }, []);

  const onSubmit = useCallback(
    async (ev?: SubmitEvent<HTMLFormElement>) => {
      ev?.preventDefault();
      const editorApi = editorRef.current;
      if (!currentUser || !editorApi || loading) {
        return;
      }
      const editorData = await editorApi.getSubmitData();
      if (!editorData.originalContents.data.trim()) {
        toast.error("Message is empty");
        return;
      }
      setLoading(true);
      try {
        const message = await rpc.messages.sendMessage({
          conversationId,
          editorData,
          noEmail: userIsAdmin(currentUser) && noEmail,
        });
        captureEvent("messageSent", {
          conversationId,
          sender: currentUser._id,
          participantIds: conversation.participantIds,
          messageCount: conversation.messageCount + 1,
          ...(from && { from }),
        });
        editorRef.current?.clear();
        getLocalStorageHandlers(editorData.originalContents.type).reset();
        hasUnsavedDataRef.current = false;
        setRestorableDocument(null);
        onSuccess?.(message);
      } catch (e) {
        captureException(e);
        console.error("Error sending message:", e);
        toast.error(
          e instanceof ORPCError && e.code === "FORBIDDEN"
            ? e.message
            : "An error occurred - please try again",
        );
      } finally {
        setLoading(false);
      }
    },
    [
      currentUser,
      loading,
      conversationId,
      noEmail,
      captureEvent,
      conversation.participantIds,
      conversation.messageCount,
      from,
      getLocalStorageHandlers,
      onSuccess,
    ],
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
    setRestorableDocument(null);
  }, []);

  return {
    contents,
    editorRef,
    loading,
    noEmail,
    setNoEmail,
    showNoEmail: userIsAdmin(currentUser),
    onChange,
    onSubmit,
    onKeyDown,
    autosave: restorableDocument?.data?.length
      ? { contents: restorableDocument, onRestore: restoreAutosave }
      : undefined,
  };
};
