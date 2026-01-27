"use client";

import { useCommentsList } from "./useCommentsList";
import { useCommentEditor } from "@/lib/hooks/useCommentEditor";
import clsx from "clsx";
import Editor from "../Editor/Editor";
import Button from "../Button";

export default function NewComment({
  postId,
  className,
}: Readonly<{
  postId: string;
  className?: string;
}>) {
  const { addTopLevelComment } = useCommentsList();
  const { loading, editorRef, contents, onSubmit, onKeyDown, onChange } =
    useCommentEditor({
      postId,
      onSuccess: addTopLevelComment,
    });
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
