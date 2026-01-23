"use client";

import {
  useCallback,
  useRef,
  useState,
  FormEvent,
  KeyboardEvent,
  startTransition,
} from "react";
import type { EditorAPI, EditorContents } from "@/lib/ckeditor/editorHelpers";
import { createPostCommentAction } from "@/lib/comments/commentActions";
import { useCommentsList } from "./useCommentsList";
import toast from "react-hot-toast";
import clsx from "clsx";
import Editor, { EditorOnChangeProps } from "../Editor/Editor";
import Button from "../Button";

export default function NewComment({
  postId,
  className,
}: Readonly<{
  postId: string;
  className?: string;
}>) {
  const { addTopLevelComment } = useCommentsList();
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
            parentCommentId: null,
            editorData: data,
          });
          if (!newComment) {
            throw new Error("Something went wrong");
          }
          addTopLevelComment(newComment);
          editorRef.current?.clear();
        } catch (e) {
          console.error("Editor submit error:", e);
          toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
          setLoading(false);
        }
      });
    },
    [postId, addTopLevelComment],
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

  return (
    <form
      data-component="NewComment"
      onSubmit={onSubmit}
      onKeyDown={onKeyDown}
      className={clsx(
        "border border-comment-border rounded p-2 [&_.ck.ck-content]:min-h-[100px]",
        "flex flex-col items-end gap-1",
        className,
      )}
    >
      <Editor
        formType="new"
        collectionName="Comments"
        fieldName="contents"
        placeholder="Write a new comment..."
        value={contents}
        onChange={onChange}
        commentStyles
        commentEditor
        hideControls
        ref={editorRef}
        className="w-full grow"
      />
      <Button type="submit" loading={loading}>
        Comment
      </Button>
    </form>
  );
}
