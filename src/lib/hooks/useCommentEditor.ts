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
import type {
  EditorAPI,
  EditorContents,
  EditorData,
} from "@/lib/ckeditor/editorHelpers";
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
  const [loading, setLoading] = useState(false);
  const editorRef = useRef<EditorAPI>(null);
  const [contents, setContents] = useState(
    getInitialContents({
      currentUser,
      comment,
      htmlTemplate,
    }),
  );

  const onChange = useCallback(({ contents, autosave }: EditorOnChangeProps) => {
    setContents(contents);
    // TODO Handle autosave
    void autosave;
  }, []);

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
      postId,
      parentCommentId,
      shortform,
      comment,
      beforeSubmit,
      onSuccess,
      prefilledProps,
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
