"use client";

import {
  FormEvent,
  KeyboardEvent,
  startTransition,
  useCallback,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import type { EditorAPI, EditorContents } from "@/lib/ckeditor/editorHelpers";
import type { EditorOnChangeProps } from "@/components/Editor/Editor";
import type { CommentsList } from "../comments/commentLists";
import { createPostCommentAction } from "../comments/commentActions";
import { useLoginPopoverContext } from "./useLoginPopoverContext";
import { useCurrentUser } from "./useCurrentUser";

type UseCommentEditorDocument =
  | {
      postId: string;
      shortform?: false;
    }
  | {
      postId?: never;
      shortform: true;
    };

type UseCommentEditorProps = UseCommentEditorDocument & {
  onSuccess?: (comment: CommentsList) => void;
};

export const useCommentEditor = ({
  postId,
  shortform,
  onSuccess,
}: UseCommentEditorProps) => {
  const { currentUser } = useCurrentUser();
  const { onSignup } = useLoginPopoverContext();
  const [loading, setLoading] = useState(false);
  const editorRef = useRef<EditorAPI>(null);
  const [contents, setContents] = useState<EditorContents>({
    type: "ckEditorMarkup",
    data: "",
  });

  const onChange = useCallback(({ contents, autosave }: EditorOnChangeProps) => {
    setContents(contents);
    // TODO Handle autosave
    void autosave;
  }, []);

  const onSubmit = useCallback(
    async (ev?: FormEvent) => {
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
      setLoading(true);
      const data = await editorApi.getSubmitData();
      startTransition(async () => {
        try {
          const { data: newComment } = await createPostCommentAction({
            postId,
            shortform,
            parentCommentId: null,
            editorData: data,
          });
          if (!newComment) {
            throw new Error("Something went wrong");
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
    [currentUser, onSignup, postId, shortform, onSuccess],
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

  return {
    contents,
    editorRef,
    loading,
    onChange,
    onSubmit,
    onKeyDown,
  };
};
