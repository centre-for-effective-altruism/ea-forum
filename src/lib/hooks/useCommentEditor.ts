"use client";

import {
  SubmitEvent,
  KeyboardEvent,
  startTransition,
  useCallback,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import type { EditorAPI, EditorContents } from "@/lib/ckeditor/editorHelpers";
import type { EditorOnChangeProps } from "@/components/Editor/Editor";
import type { CommentToEdit } from "../comments/commentQueries";
import type { CommentListItem } from "../comments/commentLists";
import type { CurrentUser } from "../users/currentUser";
import { useLoginPopoverContext } from "./useLoginPopoverContext";
import { useCurrentUser } from "./useCurrentUser";
import { rpc } from "../rpc";

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

type UseCommentEditorProps = UseCommentEditorDocument & {
  onSuccess?: (comment: CommentListItem) => void;
};

const choosePlaceholder = (shortform?: boolean, comment?: CommentToEdit | null) => {
  if (comment !== undefined) {
    return comment?.shortform ? "Edit quick take..." : "Edit comment...";
  }
  return shortform ? "Write a new quick take..." : "Write a new comment...";
};

const getInitialContents = (
  currentUser: CurrentUser | null,
  comment?: CommentToEdit | null,
): EditorContents =>
  comment?.originalContents ?? {
    type: currentUser?.markDownPostEditor ? "markdown" : "ckEditorMarkup",
    data: "",
  };

export const useCommentEditor = ({
  postId,
  parentCommentId,
  shortform,
  comment,
  onSuccess,
}: UseCommentEditorProps) => {
  const { currentUser } = useCurrentUser();
  const { onSignup } = useLoginPopoverContext();
  const [loading, setLoading] = useState(false);
  const editorRef = useRef<EditorAPI>(null);
  const [contents, setContents] = useState(getInitialContents(currentUser, comment));

  const onChange = useCallback(({ contents, autosave }: EditorOnChangeProps) => {
    setContents(contents);
    // TODO Handle autosave
    void autosave;
  }, []);

  const onSubmit = useCallback(
    async (ev?: SubmitEvent) => {
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
          const newComment = comment
            ? await rpc.comments.edit({
                commentId: comment._id,
                editorData: data,
              })
            : await rpc.comments.create({
                postId,
                parentCommentId,
                shortform,
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
    [currentUser, onSignup, postId, parentCommentId, shortform, comment, onSuccess],
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
    formType: comment ? ("edit" as const) : ("new" as const),
    placeholder: choosePlaceholder(shortform, comment),
    contents,
    editorRef,
    loading,
    onChange,
    onSubmit,
    onKeyDown,
  };
};
