"use client";

import { useCallback, useRef, useState } from "react";
import type { EditorAPI, EditorContents } from "@/lib/ckeditor/editorHelpers";
import { createPostComment } from "@/lib/comments/commentMutations";
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
  const [loading, setLoading] = useState(false);
  const editorRef = useRef<EditorAPI>(null);
  const [contents, setContents] = useState<EditorContents>({
    type: "ckEditorMarkup",
    value: "",
  });

  const onChange = useCallback(({ contents, autosave }: EditorOnChangeProps) => {
    setContents(contents);
    // TODO Handle autosave
    void autosave;
  }, []);

  const onSubmit = useCallback(async () => {
    try {
      const editorApi = editorRef.current;
      if (!editorApi) {
        throw new Error("Editor API not found");
      }
      setLoading(true);
      const data = await editorApi.submitData();
      await createPostComment(postId, data);
    } catch (e) {
      console.error("Editor submit error:", e);
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  return (
    <div
      data-component="NewComment"
      className={clsx(
        "border border-comment-border rounded p-2 [&_.ck.ck-content]:min-h-[100px]",
        "flex flex-col items-end gap-1",
        "",
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
      <Button onClick={onSubmit} loading={loading}>
        Comment
      </Button>
    </div>
  );
}
