"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { createPostReportAction } from "@/lib/reports/reportActions";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import type { PostDisplay } from "@/lib/posts/postQueries";
import type { PostListItem } from "@/lib/posts/postLists";
import toast from "react-hot-toast";
import Popover from "../Popover";
import Input from "../Forms/Input";
import Button from "../Button";
import Type from "../Type";

export default function ReportPopover({
  post,
  open,
  onClose,
}: Readonly<{
  post: PostDisplay | PostListItem;
  open: boolean;
  onClose: () => void;
}>) {
  const [description, setDescription] = useState("");
  const { currentUser } = useCurrentUser();
  const { onSignup } = useLoginPopoverContext();

  useEffect(() => {
    if (open && !currentUser) {
      onClose();
      onSignup();
    }
  }, [currentUser, open, onClose, onSignup]);

  const onSubmit = useCallback(
    (ev: FormEvent<HTMLFormElement>) => {
      ev.preventDefault();
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      toast.promise(createPostReportAction({ postId: post._id, description }), {
        loading: <Type>Creating report...</Type>,
        success: <Type>Created report</Type>,
        error: <Type>Something went wrong</Type>,
      });
      onClose();
      setDescription("");
    },
    [onClose, post._id, description],
  );

  return (
    <Popover open={open} onClose={onClose}>
      <form onSubmit={onSubmit} className="w-[300px] max-w-full flex flex-col gap-4">
        <Type style="postTitle">Report &quot;{post.title}&quot;</Type>
        <Input value={description} setValue={setDescription} placeholder="Reason" />
        <Button type="submit" disabled={description.length < 1}>
          Submit
        </Button>
      </form>
    </Popover>
  );
}
